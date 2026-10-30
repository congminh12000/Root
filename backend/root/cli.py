"""Host-only controls: serve, play, stop, train, evaluate, verify and promote."""
from __future__ import annotations

import argparse
import json
import hashlib
from pathlib import Path

from .runner import run_match, tournament
from .storage import Store

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(prog="root")
    parser.add_argument("--data", type=Path, default=ROOT / "data")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("serve", "play", "evaluate"):
        p = sub.add_parser(name)
        p.add_argument("--agent", choices=("random", "heuristic", "search", "neural"), default=None if name == "serve" else "heuristic")
        p.add_argument("--budget", type=float, default=1.)
        p.add_argument("--seed", type=int, default=42 if name != "evaluate" else 200000)
        p.add_argument("--checkpoint", type=Path)
        p.add_argument("--max-turns", type=int, default=240)
        if name == "serve":
            p.add_argument("--host", default="127.0.0.1")
            p.add_argument("--port", type=int, default=8787)
            p.add_argument("--pace", type=float, default=.2)
            p.add_argument("--loop", action="store_true")
            p.add_argument("--no-match", action="store_true")
        elif name == "play":
            p.add_argument("--save", action="store_true")
            p.add_argument("--check", action="store_true")
        else:
            p.add_argument("--games", type=int, default=1000)
            p.add_argument("--output", type=Path)
            p.add_argument("--check", action="store_true")
            p.add_argument("--candidate", type=Path)
    train_parser = sub.add_parser("train")
    for flag, default in (("iterations", 5), ("games", 4), ("workers", 2), ("seed", 10000), ("warmup", 1), ("max-turns", 160)):
        train_parser.add_argument(f"--{flag}", type=int, default=default)
    train_parser.add_argument("--output", type=Path)
    train_parser.add_argument("--resume", type=Path)
    train_parser.add_argument("--device", choices=("cpu", "auto", "mps"), default="cpu")
    train_parser.add_argument("--ignore-viewers", action="store_true")
    verify = sub.add_parser("verify")
    verify.add_argument("match")
    sub.add_parser("stop")
    promote = sub.add_parser("promote")
    promote.add_argument("checkpoint", type=Path)
    promote.add_argument("report", type=Path)
    args = parser.parse_args()
    args.data.mkdir(parents=True, exist_ok=True)
    if hasattr(args, "budget") and args.budget < 0:
        parser.error("--budget must be nonnegative")
    for flag in ("games", "workers", "iterations", "max_turns"):
        if hasattr(args, flag) and getattr(args, flag) < 1:
            parser.error(f"--{flag.replace('_', '-')} must be positive")
    if args.command == "serve":
        import uvicorn
        from .server import create_app
        if args.agent is None:
            champion = args.data / "champion.json"
            if champion.exists():
                registered = json.loads(champion.read_text())
                checkpoint = Path(registered["checkpoint"])
                if hashlib.sha256(checkpoint.read_bytes()).hexdigest() != registered["sha256"]:
                    raise SystemExit("Champion checkpoint changed since promotion")
                args.agent, args.checkpoint = "neural", checkpoint
            else:
                args.agent = "search"
        app = create_app(args.data, not args.no_match, args.agent, args.budget, args.pace,
                         args.seed, args.checkpoint, args.loop, args.max_turns)
        print(f"Root → http://{args.host}:{args.port} · spectators only", flush=True)
        uvicorn.run(app, host=args.host, port=args.port)
        return
    if args.command == "play":
        result = run_match(args.seed, args.agent, args.budget, args.max_turns,
                           check=args.check, store=Store(args.data / "arena.sqlite") if args.save else None,
                           checkpoint=args.checkpoint)
    elif args.command == "evaluate":
        result = tournament(args.output or args.data / "evaluation.jsonl", args.games, args.seed,
                            args.agent, args.budget, args.max_turns, args.checkpoint, args.check,
                            dict(kind="neural", checkpoint=str(args.candidate.resolve())) if args.candidate else None)
    elif args.command == "train":
        from .learning import train
        result = train(args.output or args.data / "candidate.pt", args.iterations, args.games, args.workers,
                       args.seed, args.resume, args.warmup, args.max_turns, args.device, args.ignore_viewers)
    elif args.command == "verify":
        result = Store(args.data / "arena.sqlite").verify(args.match)
    elif args.command == "stop":
        (args.data / "stop.request").touch()
        result = dict(message="Requested stop of host match; spectators cannot issue this command.")
    else:
        from .learning import load_checkpoint
        load_checkpoint(args.checkpoint)
        report = json.loads(args.report.read_text())
        candidate = report.get("candidate", {})
        expected = str(args.checkpoint.resolve())
        measured = (report.get("config", {}).get("candidate") or {}).get("checkpoint")
        sha256 = hashlib.sha256(args.checkpoint.read_bytes()).hexdigest()
        config = report.get("config", {})
        champion_file = args.data / "champion.json"
        if champion_file.exists():
            incumbent = json.loads(champion_file.read_text())
            correct_incumbent = config.get("kind") == "neural" and config.get("checkpoint_sha256") == incumbent["sha256"]
        else:
            correct_incumbent = config.get("kind") == "search"
        if not correct_incumbent or measured != expected or config.get("candidate_sha256") != sha256 or report.get("games", 0) < 1000 or candidate.get("improvement_ci95", [0])[0] <= 0 or report.get("statuses", {}).get("error", 0):
            raise SystemExit("Promotion rejected: require identical candidate bytes, ≥1000 held-out paired games, no errors, lower 95% improvement bound >0 against the incumbent.")
        (args.data / "champion.json").write_text(json.dumps(dict(checkpoint=expected, sha256=sha256, report=str(args.report.resolve())), indent=2))
        result = dict(message="Candidate registered; the next serve without --agent uses this champion.", checkpoint=expected)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
