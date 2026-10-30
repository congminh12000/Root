"""Headless matches, fair tournaments, resumable JSONL reports."""
from __future__ import annotations

import json
import math
import random
import statistics
import time
import hashlib
from collections import Counter, defaultdict
from pathlib import Path

from .agents import make_agent
from .content import FACTIONS, PROFILES, RULESET
from .engine import Game


def run_match(seed=1, kind="heuristic", budget=1., max_turns=240, seating=None,
              check=False, store=None, stop=None, on_frame=None, pace=0., checkpoint=None,
              candidate=None, candidate_seat=None):
    game = Game(seed, seating, max_turns=max_turns, record=store is not None)
    agents = [make_agent(kind, seed * 4 + i, PROFILES[i], checkpoint) for i in range(4)]
    if candidate is not None:
        agents[candidate_seat] = make_agent(candidate["kind"], seed * 4 + candidate_seat,
                                            PROFILES[candidate_seat], candidate.get("checkpoint"))
    mid = store.create(game, [f"{kind}:{p}" for p in PROFILES]) if store else None
    if on_frame:
        on_frame(mid, game)
    times = []
    steps = 0
    try:
        while game.s["status"] == "playing" and steps < 12000:
            if stop and stop.is_set():
                game.stop()
                if store:
                    store.append(mid, game, dict(control="stopped"))
                break
            pid = game.actor
            start = time.perf_counter()
            obs, actions = game.observe(pid), game.legal_actions()
            action = agents[pid].act(obs, actions, budget)
            times.append(time.perf_counter() - start)
            game.step(action, validate=check)
            if check:
                game.assert_invariants()
            steps += 1
            if store:
                store.append(mid, game, action)
            if on_frame:
                on_frame(mid, game)
            if pace and stop:
                stop.wait(pace)
        if game.s["status"] == "playing":
            game.stop("step_limit")
            if store:
                store.append(mid, game, dict(control="step_limit"))
    except Exception:
        if store:
            store.finish(mid, game, "error")
        raise
    if store:
        store.finish(mid, game)
    return dict(seed=seed, ruleset=RULESET, seating=game.s["seating"], status=game.s["status"],
                winner=game.s["winner"], winners=game.s["winners"],
                winner_factions=[game.s["players"][i]["faction"] for i in game.s["winners"]],
                scores=[p["score"] for p in game.s["players"]], steps=steps, turns=game.s["turn"],
                decision_ms=statistics.mean(times) * 1000 if times else 0,
                p95_ms=sorted(times)[min(len(times) - 1, int(len(times) * .95))] * 1000 if times else 0,
                match=mid, digest=game.digest())


def wilson(wins, total):
    if not total:
        return [0., 1.]
    z = 1.959963984540054
    p = wins / total
    denominator = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denominator
    radius = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denominator
    return [max(0., centre - radius), min(1., centre + radius)]


def tournament(output, games=1000, seed=200000, kind="heuristic", budget=.01,
               max_turns=200, checkpoint=None, check=False, candidate=None):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    def checksum(path):
        return hashlib.sha256(Path(path).read_bytes()).hexdigest() if path else None

    config = dict(seed=seed, kind=kind, budget=budget, max_turns=max_turns,
                  checkpoint=str(checkpoint) if checkpoint else None, candidate=candidate,
                  checkpoint_sha256=checksum(checkpoint),
                  candidate_sha256=checksum(candidate.get("checkpoint")) if candidate else None,
                  ruleset=RULESET)
    config_path = output.with_suffix(".config.json")
    if config_path.exists():
        previous = json.loads(config_path.read_text())
        previous.setdefault("checkpoint_sha256", None)
        previous.setdefault("candidate_sha256", None)
        if previous != config:
            raise ValueError("Report configuration differs; use a new output path")
    config_path.write_text(json.dumps(config, indent=2))
    rows = []
    if output.exists():
        for line in output.read_text().splitlines():
            if line.strip():
                rows.append(json.loads(line))
    for index in range(len(rows), games):
        # Four-seat blocks: identical faction layout, rotated one seat per game.
        seating = list(FACTIONS)
        random.Random(seed + index // 4).shuffle(seating)
        shift = index % 4
        seating = seating[shift:] + seating[:shift]
        try:
            row = run_match(seed + index, kind, budget, max_turns, seating,
                            check=check, checkpoint=checkpoint, candidate=candidate,
                            candidate_seat=index % 4 if candidate else None)
            if candidate:
                row["candidate_seat"] = index % 4
                row["candidate_win"] = index % 4 in row["winners"]
                baseline = run_match(seed + index, kind, budget, max_turns, seating,
                                     check=check, checkpoint=checkpoint)
                row["incumbent_win"] = index % 4 in baseline["winners"]
                row["incumbent_status"] = baseline["status"]
        except Exception as exc:
            row = dict(seed=seed + index, status="error", error=f"{type(exc).__name__}: {exc}",
                       seating=seating, winners=[], winner_factions=[], decision_ms=0)
        with output.open("a") as stream:
            stream.write(json.dumps(row) + "\n")
        rows.append(row)
        if (index + 1) % 25 == 0:
            print(f"{index + 1}/{games} games", flush=True)
    statuses = Counter(row["status"] for row in rows)
    factions = {}
    for faction in FACTIONS:
        wins = sum(faction in row["winner_factions"] for row in rows)
        factions[faction] = dict(wins=wins, games=len(rows), win_rate=wins / len(rows), ci95=wilson(wins, len(rows)))
    profiles = defaultdict(int)
    for row in rows:
        for winner in row["winners"]:
            profiles[PROFILES[winner]] += 1
    report = dict(config=config, games=len(rows), statuses=dict(statuses), factions=factions,
                  profiles=dict(profiles), mean_decision_ms=statistics.mean(r["decision_ms"] for r in rows),
                  note="Experimental ruleset; faction/profile win rates are not a skill rating.")
    if candidate:
        n = sum(r.get("candidate_win", False) for r in rows)
        deltas = [int(r.get("candidate_win", False)) - int(r.get("incumbent_win", False)) for r in rows]
        rng = random.Random(seed)
        differences = sorted(sum(rng.choices(deltas, k=len(deltas))) / len(deltas) for _ in range(2000))
        report["candidate"] = dict(wins=n, games=len(rows), win_rate=n / len(rows), ci95=wilson(n, len(rows)),
            incumbent_wins=sum(r.get("incumbent_win", False) for r in rows),
            improvement=statistics.mean(deltas), improvement_ci95=[differences[49], differences[1949]])
    output.with_suffix(".summary.json").write_text(json.dumps(report, indent=2))
    return report
