"""Small recurrent legal-action policy, imitation warmup, and clipped PPO.

This is a reproducible research pipeline, not a pretrained expert. Training and
inference both receive only the observation API. Checkpoints are local artifacts.
"""
from __future__ import annotations

import json
import io
import os
import random
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import torch
from torch import nn
from torch.distributions import Categorical

from .agents import HeuristicAgent, SearchAgent, priority
from .content import FACTIONS, PROFILES, RULESET, SUITS, card
from .engine import Game

ENCODING = 2
OBS_SIZE, ACT_SIZE, MEMORY_SIZE = 256, 64, 64
KINDS = ("advance", "move", "battle", "recruit", "build", "overwork", "craft", "extra_action",
         "add_decree", "decree_recruit", "roost", "turmoil", "leader", "new_roost", "spread", "revolt",
         "mobilize", "train", "organize", "refresh", "slip", "explore", "quest", "repair", "aid", "steal",
         "strike", "discard", "drop_item", "ambush", "decline", "damage", "remove", "hospital",
         "pay_outrage", "reveal_outrage", "dominance", "coalition", "take_dominance", "tax")


def observation_features(o):
    v = []
    for c in o["clearings"]:
        v += [x / 25 for x in c["warriors"]]
        v += [sum(b["player"] == pid for b in c["buildings"]) / 6 for pid in range(4)]
        v += [float(c["sympathy"]), c["wood"] / 8, float(bool(c["ruin"])), SUITS.index(c["suit"]) / 2]
    for p in o["players"]:
        v += [p["score"] / 30, p["hand_count"] / 10, p["supporter_count"] / 10,
              p["reserve"] / 25, p["officers"] / 10, len(p["crafted"]) / 12,
              float(p["dominance"] is not None), FACTIONS.index(p["faction"]) / 3]
    pid = o["observer"]
    p = o["players"][pid]
    v += [float(pid == i) for i in range(4)]
    v += [float(p["faction"] == f) for f in FACTIONS]
    v += [o["turn"] / 240, o["remaining"] / 10, o["deck_count"] / 54]
    v += [sum(card(cid)["suit"] == suit for cid in p["hand"]) / 5 for suit in (*SUITS, "bird")]
    v += [sum(card(cid)["suit"] == suit for cid in p["supporters"]) / 5 for suit in (*SUITS, "bird")]
    for kind in ("boot", "sword", "torch", "hammer", "tea", "coin", "bag", "crossbow"):
        v += [sum(i["kind"] == kind and not i["damaged"] and not i["exhausted"] for i in p["items"]) / 3,
              sum(i["kind"] == kind and i["damaged"] for i in p["items"]) / 3]
    phases = ("craft", "actions", "march", "decree_add", "decree", "leader", "new_roost", "revolt",
              "spread", "daylight", "operations", "refresh", "slip", "discard", "capacity", "cobbler")
    v += [float(o["phase"] == phase) for phase in phases]
    v += [(p["position"] + 9) / 20]
    for kind in ("recruit", "move", "battle", "build"):
        v += [len(p["decree"][kind]) / 10]
    v += [float(pid == o["current"]), len(o["pending"]) / 10, float(o["battle"] is not None)]
    assert len(v) <= OBS_SIZE
    return v + [0.] * (OBS_SIZE - len(v))


def action_features(o, a):
    v = [float(a.kind == k) for k in KINDS]
    v += [(a.src + 9) / 20, (a.dst + 9) / 20, (a.target + 1) / 4, a.n / 25, len(a.payment) / 4]
    spec = card(a.card) if a.card >= 0 else None
    v += [float(spec is not None and spec["suit"] == suit) for suit in (*SUITS, "bird")]
    v += [spec["points"] / 5 if spec else 0, priority(o, a) / 20]
    v += [float(a.option == x) for x in ("mill", "workshop", "recruiter", "points", "cards", "move", "build", "battle", "recruit")]
    assert len(v) <= ACT_SIZE
    return v + [0.] * (ACT_SIZE - len(v))


class Policy(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Sequential(nn.Linear(OBS_SIZE, 96), nn.Tanh(), nn.Linear(96, MEMORY_SIZE), nn.Tanh())
        self.memory = nn.GRUCell(MEMORY_SIZE, MEMORY_SIZE)
        self.action_encoder = nn.Sequential(nn.Linear(ACT_SIZE, MEMORY_SIZE), nn.Tanh())
        self.query = nn.Linear(MEMORY_SIZE, MEMORY_SIZE)
        self.critic = nn.Linear(MEMORY_SIZE, 1)

    def forward(self, observation, actions, memory):
        h = self.memory(self.encoder(observation), memory)
        encoded = self.action_encoder(actions)
        logits = (encoded * self.query(h)).sum(-1) / (MEMORY_SIZE ** .5)
        return logits, self.critic(h).squeeze(-1), h


def load_checkpoint(path):
    # Only load trusted checkpoints produced locally by this project.
    saved = torch.load(path, map_location="cpu", weights_only=False)
    if saved.get("ruleset") != RULESET or saved.get("encoding") != ENCODING:
        raise ValueError("Checkpoint ruleset/encoding mismatch")
    return saved


class NeuralAgent:
    def __init__(self, checkpoint, seed=0):
        torch.set_num_threads(1)
        self.model = Policy()
        self.model.load_state_dict(load_checkpoint(checkpoint)["model"])
        self.model.eval()
        self.memories = {}
        self.sequences = {}

    def act(self, observation, legal_actions, budget=1.0):
        key = observation["observer"]
        if observation["sequence"] <= self.sequences.get(key, -1):
            self.memories.pop(key, None)
        memory = self.memories.get(key, torch.zeros(MEMORY_SIZE))
        with torch.no_grad():
            logits, _, h = self.model(torch.tensor(observation_features(observation)),
                torch.tensor([action_features(observation, a) for a in legal_actions]), memory)
        self.memories[key] = h
        self.sequences[key] = observation["sequence"]
        return legal_actions[int(logits.argmax())]


def _trajectory(job):
    """Spawn-safe CPU worker; no GPU/model state shared with the game server."""
    torch.set_num_threads(1)
    seed, state, teacher, max_turns, historical = job
    torch.manual_seed(seed)
    rng = random.Random(seed)
    seating = list(FACTIONS)
    rng.shuffle(seating)
    g = Game(seed, seating, max_turns=max_turns)
    learner = seed % 4
    model = Policy()
    model.load_state_dict(state)
    model.eval()
    opponent_model = Policy()
    opponent_model.load_state_dict(historical or state)
    opponent_model.eval()
    memories = {i: torch.zeros(MEMORY_SIZE) for i in range(4)}
    bots = [HeuristicAgent(seed + i, PROFILES[i]) for i in range(4)]
    search = SearchAgent(seed, horizon=4, max_rollouts=8)
    rows = []
    for _ in range(12000):
        if g.s["status"] != "playing":
            break
        pid = g.actor
        obs, actions = g.observe(pid), g.legal_actions()
        x = torch.tensor(observation_features(obs))
        ax = torch.tensor([action_features(obs, a) for a in actions])
        if pid == learner:
            h0 = memories[pid]
            with torch.no_grad():
                logits, value, h = model(x, ax, h0)
                distribution = Categorical(logits=logits)
                choice = actions.index(bots[pid].act(obs, actions)) if teacher else int(distribution.sample())
                old_logp = float(distribution.log_prob(torch.tensor(choice)))
            memories[pid] = h
            rows.append(dict(x=x, a=ax, h=h0, choice=choice, logp=old_logp, value=float(value)))
            action = actions[choice]
        elif seed % 4 == 0:
            with torch.no_grad():
                logits, _, h = opponent_model(x, ax, memories[pid])
            memories[pid] = h
            action = actions[int(Categorical(logits=logits).sample())]
        elif seed % 4 == 1:
            action = search.act(obs, actions, .01)
        else:
            action = bots[pid].act(obs, actions)
        g.step(action, validate=False)
    if g.s["status"] == "playing":
        g.s["status"] = "step_limit"
    terminal = g.s["status"] == "finished"
    bootstrap = 0.
    if not terminal and rows:
        # Truncations are bootstrapped, never mislabeled as losses.
        with torch.no_grad():
            final_x = torch.tensor(observation_features(g.observe(learner)))
            final_h = model.memory(model.encoder(final_x), memories[learner])
            bootstrap = float(model.critic(final_h).squeeze(-1))
    result = float(learner in g.s["winners"])
    running = result if terminal else bootstrap
    for row in reversed(rows):
        row["return"] = running
        row["advantage"] = running - row["value"]
        running *= .995
    return rows, dict(seed=seed, faction=seating[learner], win=result, status=g.s["status"], decisions=len(rows))


def _viewer_active(data_dir):
    try:
        lease = json.loads((data_dir / "viewers.json").read_text())
        return lease["count"] > 0 and time.time() - lease["updated"] < 15
    except (OSError, ValueError, KeyError):
        return False


def _serialize(value):
    buffer = io.BytesIO()
    torch.save(value, buffer)
    return buffer.getvalue()


def _wire_trajectory(payload):
    """Use byte messages rather than Torch shared-memory handles on macOS."""
    job = torch.load(io.BytesIO(payload), map_location="cpu", weights_only=False)
    return _serialize(_trajectory(job))


def choose_device(requested):
    if requested == "cpu":
        return torch.device("cpu")
    if requested in ("auto", "mps") and torch.backends.mps.is_available():
        try:
            m = Policy().to("mps")
            loss = m(torch.zeros(OBS_SIZE, device="mps"), torch.zeros(2, ACT_SIZE, device="mps"),
                     torch.zeros(MEMORY_SIZE, device="mps"))[0].sum()
            loss.backward()
            return torch.device("mps")
        except RuntimeError:
            if requested == "mps":
                raise
    if requested == "mps":
        raise ValueError("MPS unavailable; use --device cpu")
    return torch.device("cpu")


def train(output, iterations=5, games=4, workers=2, seed=10000, resume=None,
          warmup=1, max_turns=160, device="cpu", ignore_viewers=False):
    torch.set_num_threads(1)
    torch.manual_seed(seed)
    random.seed(seed)
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    training_device = choose_device(device)
    model = Policy().to(training_device)
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-4)
    start, history, pool = 0, [], []
    training_config = dict(games=games, max_turns=max_turns, warmup=warmup)
    if resume:
        saved = load_checkpoint(resume)
        if saved.get("training_config", training_config) != training_config:
            raise ValueError("Resume configuration differs: keep games, max-turns and warmup unchanged")
        model.load_state_dict(saved["model"])
        optimizer.load_state_dict(saved["optimizer"])
        start, history = saved["iteration"], saved["history"]
        seed = saved["seed"]
        pool = saved.get("pool", [])
        random.setstate(saved["python_rng"])
        torch.set_rng_state(saved["torch_rng"])

    def cpu_state():
        return {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    def save(iteration):
        temp = output.with_suffix(".tmp")
        torch.save(dict(model=cpu_state(), optimizer=optimizer.state_dict(), iteration=iteration,
                        history=history, ruleset=RULESET, encoding=ENCODING, seed=seed,
                        training_config=training_config,
                        pool=pool, python_rng=random.getstate(), torch_rng=torch.get_rng_state()), temp)
        os.replace(temp, output)

    completed = start
    save(completed)
    try:
        # spawn avoids forked Torch runtime issues on Apple Silicon.
        import multiprocessing
        with ProcessPoolExecutor(max_workers=workers, mp_context=multiprocessing.get_context("spawn")) as executor:
            for iteration in range(start, start + iterations):
                while not ignore_viewers and _viewer_active(output.parent):
                    print("Training paused: spectators connected. Ctrl+C saves and exits.", flush=True)
                    time.sleep(5)
                state = cpu_state()
                teacher = iteration < warmup
                jobs = [(seed + iteration * games + j, state, teacher, max_turns,
                         random.choice(pool) if pool else None) for j in range(games)]
                samples = [torch.load(io.BytesIO(payload), map_location="cpu", weights_only=False)
                           for payload in executor.map(_wire_trajectory, map(_serialize, jobs))]
                rows = [row for sample, _ in samples for row in sample]
                if not rows:
                    raise RuntimeError("No training decisions collected")
                advantages = torch.tensor([r["advantage"] for r in rows])
                advantages = (advantages - advantages.mean()) / (advantages.std(unbiased=False) + 1e-8)
                for row, advantage in zip(rows, advantages):
                    row["advantage"] = advantage
                losses = []
                model.train()
                for _ in range(2):
                    order = list(range(len(rows)))
                    random.shuffle(order)
                    for offset in range(0, len(order), 32):
                        minibatch = order[offset:offset + 32]
                        optimizer.zero_grad()
                        loss = torch.zeros((), device=training_device)
                        for index in minibatch:
                            row = rows[index]
                            logits, value, _ = model(row["x"].to(training_device), row["a"].to(training_device), row["h"].to(training_device))
                            distribution = Categorical(logits=logits)
                            choice = torch.tensor(row["choice"], device=training_device)
                            logp = distribution.log_prob(choice)
                            if teacher:
                                actor_loss = -logp
                            else:
                                ratio = (logp - row["logp"]).exp()
                                advantage = row["advantage"].to(training_device)
                                actor_loss = -torch.minimum(ratio * advantage, ratio.clamp(.8, 1.2) * advantage)
                            loss = loss + actor_loss + .5 * (value - row["return"]) ** 2 - .01 * distribution.entropy()
                        loss = loss / len(minibatch)
                        if not torch.isfinite(loss):
                            raise RuntimeError("Non-finite training loss")
                        loss.backward()
                        torch.nn.utils.clip_grad_norm_(model.parameters(), .5)
                        optimizer.step()
                        losses.append(float(loss.detach().cpu()))
                model.eval()
                pool.append(cpu_state())
                pool = pool[-4:]
                completed = iteration + 1
                entry = dict(iteration=completed, mode="imitation" if teacher else "ppo",
                             decisions=len(rows), mean_loss=sum(losses) / len(losses),
                             games=[meta for _, meta in samples], device=str(training_device))
                history.append(entry)
                save(completed)
                print(json.dumps(entry), flush=True)
    except KeyboardInterrupt:
        print("Interrupted; preserving the last completed iteration.", flush=True)
    # Each completed iteration was already saved atomically. Do not serialize a
    # partially updated optimizer/model over that checkpoint on interruption.
    return dict(checkpoint=str(output), iterations=completed, history=history)
