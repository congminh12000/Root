"""Agents are functions of their own observation, never the authoritative Game."""
from __future__ import annotations

import math
import random
import time

from .content import BUILD_COST, PROFILES, QUESTS, card
from .engine import Game


class RandomAgent:
    def __init__(self, seed=0):
        self.rng = random.Random(seed)

    def act(self, observation, legal_actions, budget=1.0):
        return self.rng.choice(legal_actions)


def priority(o, a, profile="architect"):
    """Transparent baseline used for opponents, imitation, and search ordering."""
    p = o["players"][o["observer"]]
    pid, faction = p["id"], p["faction"]
    c = o["clearings"][a.src] if a.src >= 0 else None
    strength = p["score"]
    k = a.kind
    if k in ("pay_outrage", "discard"):
        spec = card(a.card)
        return 2 - (3 if spec["suit"] == "bird" else 0) - spec["points"] - int(spec["effect"] == "ambush")
    if k == "reveal_outrage":
        return 1
    if k == "hospital":
        return 8
    if k == "damage":
        item = next(i for i in p["items"] if i["id"] == a.n)
        return {"bag": 7, "coin": 6, "boot": 4, "tea": 3, "torch": 2, "hammer": 1, "sword": 0}.get(item["kind"], 5) + int(item["exhausted"])
    if k == "remove":
        return {"wood": 8, "keep": -5, "sympathy": 0}.get(a.option, 2)
    if k == "ambush":
        return 7
    if k == "decline":
        return -3
    if k == "advance":
        return -2
    if k == "refresh":
        item = next(i for i in p["items"] if i["id"] == a.n)
        return 5 + {"tea": 2, "torch": 4, "hammer": 3, "boot": 2}.get(item["kind"], 0)
    if k == "drop_item":
        item = next(i for i in p["items"] if i["id"] == a.n)
        return 5 * int(item["damaged"]) - {"hammer": 5, "torch": 4, "sword": 3}.get(item["kind"], 1)
    if k == "add_decree":
        n = sum(len(es) for es in p["decree"].values())
        if p["decree_added"] and n > 5:
            return -4
        suit = card(a.card)["suit"]
        locations = [x for x in o["clearings"] if suit == "bird" or x["suit"] == suit]
        warriors = sum(x["warriors"][pid] for x in locations)
        roosts = sum(b["kind"] == "roost" for x in locations for b in x["buildings"])
        count = len(p["decree"][a.option])
        if a.option == "move":
            return 4 + min(warriors, 4) - count * 2
        if a.option == "recruit":
            return (6 if roosts and p["reserve"] > count * 2 else -6) - count
        if a.option == "build":
            return (7 if suit == "bird" and sum(b["kind"] == "roost" for x in o["clearings"] for b in x["buildings"]) < 6 else -5) - count * 4
        return (3 if any(sum(x["warriors"]) > x["warriors"][pid] and x["warriors"][pid] for x in locations) else -5) - count
    if k == "leader":
        return {"regent": 8, "steward": 6, "orator": 4, "marshal": 3}[a.option]
    if k == "new_roost":
        return 5 + len(c["paths"])
    if k == "turmoil":
        return 0
    if k == "craft":
        spec = card(a.card)
        return 6 + spec["points"] * 2 + (6 if spec["effect"] == "favor" else 0)
    if k == "build":
        counts = sum(b["kind"] == a.option for x in o["clearings"] for b in x["buildings"])
        return 9 + counts + (3 if a.option == "mill" and counts < 3 else 0) + (2 if a.option == "recruiter" and counts < 2 else 0)
    if k == "overwork":
        wood = sum(x["wood"] for x in o["clearings"])
        costs = [BUILD_COST[min(5, sum(b["kind"] == kind for x in o["clearings"] for b in x["buildings"]))] for kind in ("mill", "workshop", "recruiter")]
        return 8 if wood < min(costs) else -3
    if k == "extra_action":
        return 6 if o["remaining"] == 0 else -3
    if k in ("recruit", "decree_recruit"):
        return 5 + (2 if profile == "tactician" else 0)
    if k == "roost":
        return 14
    if k == "spread":
        return 12 - len(a.payment) * .4 + (2 if profile == "diplomat" else 0)
    if k == "revolt":
        enemies = sum(c["warriors"]) - c["warriors"][pid]
        return 12 + min(enemies, 6) + len(c["buildings"])
    if k == "mobilize":
        count = p["supporter_count"]
        bases = sum(b["kind"] == "base" for x in o["clearings"] for b in x["buildings"])
        return 5 if count < 5 or bases else -4
    if k == "train":
        return 9 if p["officers"] < 3 else -4
    if k == "organize":
        return 13
    if k in ("battle", "strike"):
        q = o["players"][a.target]
        ours = sum(not i["damaged"] and i["kind"] == "sword" for i in p["items"]) if faction == "ranger" else c["warriors"][pid]
        theirs = c["warriors"][a.target]
        buildings = sum(b["player"] == a.target for b in c["buildings"])
        tokens = int(q["faction"] == "covenant" and c["sympathy"]) + (c["wood"] if q["faction"] == "guild" else 0)
        threat = max(0, q["score"] - max(strength, 15)) * .6
        return 1 + threat + 2 * (buildings + tokens) + min(ours - theirs, 3) + (3 if profile == "tactician" else 0)
    if k in ("move", "slip"):
        if a.dst < 0:
            damage = sum(i["damaged"] for i in p["items"])
            return damage * 4 - 5
        dst = o["clearings"][a.dst]
        if faction == "ranger":
            ruin = 8 if dst["ruin"] else 0
            quests = 2 * sum(QUESTS[q]["suit"] == dst["suit"] for q in o["quests"])
            return 1 + ruin + quests - sum(dst["warriors"]) * .15
        defenders = max(n for j, n in enumerate(dst["warriors"]) if j != pid)
        own = dst["warriors"][pid]
        occupancy = len(dst["buildings"]) + bool(dst["ruin"])
        space = dst["slots"] - occupancy
        leaving = c["warriors"][pid] - a.n
        own_buildings = sum(b["player"] == pid for b in c["buildings"])
        value = .5 + min(a.n, 4) * .1 + (3 if own + a.n > defenders and space else 0)
        value -= 3 if own_buildings and leaving == 0 else 0
        value -= 1 if dst["sympathy"] and faction != "covenant" else 0
        if faction == "canopy":
            value += 3 if space and not any(b["kind"] == "roost" for b in dst["buildings"]) else -1
        if faction == "covenant":
            value += 4 if not dst["sympathy"] else -1
        return value
    if k == "explore":
        return 16
    if k == "quest":
        return 12 if a.option == "points" else 3
    if k == "aid":
        return (10 if a.dst >= 0 else 5) + (2 if profile == "diplomat" else 0)
    if k == "repair":
        return 9
    if k == "steal":
        return 3
    if k in ("dominance", "coalition", "take_dominance"):
        return -8
    if k == "tax":
        return -1
    return 0


class HeuristicAgent(RandomAgent):
    def __init__(self, seed=0, profile="architect"):
        super().__init__(seed)
        if profile not in PROFILES:
            raise ValueError(f"Unknown profile: {profile}")
        self.profile = profile

    def act(self, observation, legal_actions, budget=1.0):
        return max(legal_actions, key=lambda a: priority(observation, a, self.profile) + self.rng.random() * .15)


def evaluate(game, pid):
    s = game.s
    if s["status"] == "finished":
        return 3.0 if pid in s["winners"] else -1.0
    p = s["players"][pid]
    opponents = [q["score"] for q in s["players"] if q["id"] != pid]
    score = (p["score"] - max(opponents)) / 30
    military = sum(c["warriors"][pid] for c in s["clearings"])
    economy = game.count_buildings(pid) * .04 + military * .003
    if p["faction"] == "covenant":
        economy += game.sympathy_count() * .025 + p["officers"] * .02
    elif p["faction"] == "ranger":
        economy += sum(not i["damaged"] for i in p["items"]) * .02
    return score + economy


class SearchAgent(HeuristicAgent):
    """Budgeted root Monte Carlo with sampled worlds, not an optimality claim.

    Samples respect visible card counts; full posterior/history inference is future
    work. Rollout actors receive only their own observation in the sampled world.
    """
    def __init__(self, seed=0, profile="architect", horizon=16, max_rollouts=256):
        super().__init__(seed, profile)
        self.horizon, self.max_rollouts = horizon, max_rollouts
        self.last_stats = {}

    def act(self, observation, legal_actions, budget=1.0):
        if len(legal_actions) == 1:
            return legal_actions[0]
        deadline = time.monotonic() + max(0, budget)
        ranked = sorted(legal_actions, key=lambda a: priority(observation, a, self.profile), reverse=True)
        # Widen action coverage with larger budgets, retaining exact legal actions.
        candidates = ranked[:min(len(ranked), 12)]
        totals, counts = [0.] * len(candidates), [0] * len(candidates)
        pid = observation["observer"]
        rollouts = 0
        while rollouts < self.max_rollouts and time.monotonic() < deadline:
            if rollouts < len(candidates):
                j = rollouts
            else:
                j = max(range(len(candidates)), key=lambda i: totals[i] / counts[i] + .7 * math.sqrt(math.log(rollouts + 1) / counts[i]))
            sim = Game.sample(observation, self.rng)
            sim.step(candidates[j], validate=False)
            for _ in range(self.horizon):
                if sim.s["status"] != "playing" or time.monotonic() >= deadline:
                    break
                actor = sim.actor
                obs = sim.observe(actor)
                moves = sim.legal_actions()
                move = max(moves, key=lambda a: priority(obs, a, self.profile) + self.rng.random() * .5)
                sim.step(move, validate=False)
            totals[j] += evaluate(sim, pid)
            counts[j] += 1
            rollouts += 1
        self.last_stats = dict(rollouts=rollouts, candidates=len(candidates), counts=counts)
        visited = [i for i, n in enumerate(counts) if n]
        return candidates[max(visited, key=lambda i: totals[i] / counts[i])] if visited else ranked[0]


def make_agent(kind="heuristic", seed=0, profile="architect", checkpoint=None):
    if kind == "random":
        return RandomAgent(seed)
    if kind == "heuristic":
        return HeuristicAgent(seed, profile)
    if kind == "search":
        return SearchAgent(seed, profile)
    if kind == "neural":
        from .learning import NeuralAgent
        if not checkpoint:
            raise ValueError("Neural agent requires a checkpoint")
        return NeuralAgent(checkpoint, seed)
    raise ValueError(f"Unknown agent: {kind}")
