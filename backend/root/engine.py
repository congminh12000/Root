"""Deterministic, headless experimental rules engine.

All choices, including reactions, go through legal_actions/step. Private information
is stripped in observe; simulation can only be reconstructed from an observation.
See docs/RULES.md for deliberate differences from the reference game.
"""
from __future__ import annotations

import copy
import hashlib
import itertools
import json
import random
from collections import Counter
from dataclasses import asdict, dataclass

from .content import (
    BUILD_COST, BUILD_POINTS, CARDS, COLORS, FACTION_NAMES, FACTIONS, FORESTS,
    ITEM_SUPPLY, LEADERS, MAP, QUESTS, ROOST_POINTS, RUINS, RULESET,
    SYMPATHY_COST, SYMPATHY_POINTS, card, matches,
)


@dataclass(frozen=True)
class Action:
    kind: str
    src: int = -1
    dst: int = -1
    target: int = -1
    n: int = 0
    card: int = -1
    option: str = ""
    payment: tuple[int, ...] = ()

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data):
        data = dict(data)
        data["payment"] = tuple(data.get("payment", ()))
        return cls(**data)


class Game:
    def __init__(self, seed=1, seating=None, max_turns=240, record=True):
        self.rng = random.Random(seed)
        self.record = record
        seating = list(seating or FACTIONS)
        if sorted(seating) != sorted(FACTIONS):
            raise ValueError("Seating must contain each of the four factions exactly once")
        self.s = dict(ruleset=RULESET, seed=seed, seating=seating, turn=1, current=0,
                      phase="", remaining=0, sequence=0, winner=None, winners=[],
                      status="playing", max_turns=max_turns, pending=[], battle=None,
                      explored_items=[],
                      discard=[], dominance_pool=[], items=dict(ITEM_SUPPLY), events=[],
                      quest_deck=[], quests=[], players=[], clearings=[])
        deck = list(range(len(CARDS)))
        self.rng.shuffle(deck)
        self.s["deck"] = deck
        for i, faction in enumerate(seating):
            j = FACTIONS.index(faction)
            self.s["players"].append(dict(
                id=i, faction=faction, name=FACTION_NAMES[j], color=COLORS[j], score=0,
                hand=[], supporters=[], officers=0, reserve={"guild": 25, "canopy": 20,
                "covenant": 10, "ranger": 0}[faction], effects=[], crafted=[], dominance=None,
                coalition=None, decree={x: [] for x in ("recruit", "move", "battle", "build")},
                leader="regent", retired=[], items=[], position=-1, relationships=[0] * 4,
                aid_counts=[0] * 4, completed=[], used=[], craft_used=[], decree_left={},
            ))
        for i, (name, suit, slots, x, y, paths) in enumerate(MAP):
            self.s["clearings"].append(dict(id=i, name=name, suit=suit, slots=slots,
                x=x, y=y, paths=list(paths), warriors=[0] * 4, buildings=[], wood=0,
                sympathy=False, keep=False, ruin=None))
        self._setup()
        self._start_turn()

    def player(self, faction):
        return next(p for p in self.s["players"] if p["faction"] == faction)

    def _setup(self):
        for p in self.s["players"]:
            self._draw(p["id"], 3)
        guild, canopy = self.player("guild"), self.player("canopy")
        for c in self.s["clearings"]:
            if c["id"] != 11:
                self._place(guild["id"], c["id"], 1)
        self.s["clearings"][0]["keep"] = True
        for loc, kind in ((0, "mill"), (1, "workshop"), (4, "recruiter")):
            self._build(guild["id"], loc, kind)
        self._place(canopy["id"], 11, 6)
        self._build(canopy["id"], 11, "roost")
        self._set_leader("regent")
        alliance = self.player("covenant")
        for _ in range(3):
            self._support(self._draw_one())
        ruins = ["boot", "hammer", "sword", "bag"]
        assert len(RUINS) == len(ruins), "the map must mark one ruin per ruin item"
        self.rng.shuffle(ruins)
        for i, item in zip(RUINS, ruins):
            self.s["clearings"][i]["ruin"] = item
        ranger = self.player("ranger")
        ranger["position"] = -1
        for item in ("boot", "sword", "torch", "tea"):
            self._gain_item(item)
        quests = list(range(len(QUESTS)))
        self.rng.shuffle(quests)
        self.s["quest_deck"] = quests
        self.s["quests"] = [self.s["quest_deck"].pop() for _ in range(3)]
        assert len(alliance["supporters"]) == 3

    @property
    def actor(self):
        if self.s["pending"]:
            return self.s["pending"][0]["player"]
        b = self.s["battle"]
        if b:
            return b["defender"] if b["stage"] == "ambush" else b["attacker"]
        return self.s["current"]

    def _emit(self, kind, text, **data):
        if self.record:
            self.s["events"].append(dict(seq=self.s["sequence"], turn=self.s["turn"],
                                          kind=kind, text=text, **data))
            self.s["events"] = self.s["events"][-80:]

    def _draw_one(self):
        if not self.s["deck"] and self.s["discard"]:
            self.s["deck"] = self.s["discard"][:]
            self.s["discard"] = []
            self.rng.shuffle(self.s["deck"])
        return self.s["deck"].pop() if self.s["deck"] else None

    def _draw(self, player, n):
        for _ in range(n):
            cid = self._draw_one()
            if cid is not None:
                self.s["players"][player]["hand"].append(cid)

    def _discard(self, cid):
        self.s["dominance_pool" if card(cid)["effect"] == "dominance" else "discard"].append(cid)

    def _spend(self, player, cid):
        self.s["players"][player]["hand"].remove(cid)
        self._discard(cid)

    def _support(self, cid):
        if cid is None:
            return
        p = self.player("covenant")
        if self.count_buildings(p["id"], "base") or len(p["supporters"]) < 5:
            p["supporters"].append(cid)
        else:
            self._discard(cid)

    def _place(self, player, loc, n):
        p = self.s["players"][player]
        c = self.s["clearings"][loc]
        if c["keep"] and p["faction"] != "guild":
            return 0
        n = min(n, p["reserve"])
        c["warriors"][player] += n
        p["reserve"] -= n
        return n

    def _build(self, player, loc, kind):
        self.s["clearings"][loc]["buildings"].append(dict(player=player, kind=kind))

    def count_buildings(self, player, kind=None):
        return sum(b["player"] == player and (kind is None or b["kind"] == kind)
                   for c in self.s["clearings"] for b in c["buildings"])

    def sympathy_count(self):
        return sum(c["sympathy"] for c in self.s["clearings"])

    def ruler(self, loc):
        c = self.s["clearings"][loc]
        counts = c["warriors"][:]
        for b in c["buildings"]:
            counts[b["player"]] += 1
        best = max(counts)
        if not best:
            return None
        winners = [i for i, n in enumerate(counts) if n == best]
        canopy = self.player("canopy")["id"]
        return canopy if canopy in winners else winners[0] if len(winners) == 1 else None

    def free_slot(self, c):
        return len(c["buildings"]) + bool(c["ruin"]) < c["slots"]

    def can_place(self, player, c):
        return not c["keep"] or self.s["players"][player]["faction"] == "guild"

    def _score(self, player, points):
        p = self.s["players"][player]
        if p["dominance"] is not None or p["coalition"] is not None:
            return
        p["score"] = max(0, p["score"] + points)
        if p["score"] >= 30 and self.s["status"] == "playing":
            self._win(player)

    def _win(self, player):
        self.s.update(winner=player, winners=[player], status="finished")
        self.s["winners"] += [p["id"] for p in self.s["players"] if p["coalition"] == player]
        self._emit("victory", f'{self.s["players"][player]["name"]} wins the woodland.', player=player)

    def _start_turn(self):
        if self.s["status"] != "playing":
            return
        if self.s["turn"] > self.s["max_turns"]:
            self.s["status"] = "turn_limit"
            self._emit("limit", "Turn limit reached; no winner is assigned.")
            return
        p = self.s["players"][self.s["current"]]
        p["used"], p["craft_used"], p["aid_counts"] = [], [], [0] * 4
        p["decree_added"] = 0
        p["bird_added"] = False
        self._emit("turn", f'{p["name"]} · turn {self.s["turn"]}', player=p["id"])
        if p["dominance"] is not None:
            suit = card(p["dominance"])["suit"]
            controlled = [c["id"] for c in self.s["clearings"] if self.ruler(c["id"]) == p["id"]]
            won = (sum(self.s["clearings"][i]["suit"] == suit for i in controlled) >= 3
                   if suit != "bird" else any(a in controlled and b in controlled for a, b in ((0, 11), (2, 7))))
            if won:
                self._win(p["id"])
                return
        f = p["faction"]
        if f == "guild":
            wood_left = 8 - sum(c["wood"] for c in self.s["clearings"])
            for c in self.s["clearings"]:
                n = min(wood_left, sum(b["kind"] == "mill" for b in c["buildings"]))
                c["wood"] += n
                wood_left -= n
            self.s.update(phase="craft", remaining=3)
        elif f == "canopy":
            if not p["hand"]:
                self._draw(p["id"], 1)
            self.s["phase"] = "decree_add"
        elif f == "covenant":
            self.s["phase"] = "revolt"
        else:
            p["refresh_left"] = 3 + 2 * min(3, self.item_count("tea", ready=True))
            self.s["phase"] = "refresh"

    def _set_leader(self, name):
        p = self.player("canopy")
        p["leader"] = name
        p["decree"] = {k: [] for k in ("recruit", "move", "battle", "build")}
        for i, k in enumerate(LEADERS[name]):
            p["decree"][k].append(dict(id=-i - 1, suit="bird"))

    def _wood_network(self, loc, player):
        visited, queue = set(), [loc]
        while queue:
            i = queue.pop()
            if i in visited or self.ruler(i) != player:
                continue
            visited.add(i)
            queue.extend(self.s["clearings"][i]["paths"])
        return sorted(visited)

    def _present(self, player, c):
        p = self.s["players"][player]
        if p["faction"] == "ranger":
            return p["position"] == c["id"]
        return bool(c["warriors"][player] or any(b["player"] == player for b in c["buildings"])
                    or (p["faction"] == "guild" and (c["keep"] or c["wood"]))
                    or (p["faction"] == "covenant" and c["sympathy"]))

    def item_count(self, kind, ready=False):
        return sum(i["kind"] == kind and not i["damaged"] and (not ready or not i["exhausted"])
                   for i in self.player("ranger")["items"])

    def _gain_item(self, kind):
        p = self.player("ranger")
        uid = p.get("next_item", 0)
        p["next_item"] = uid + 1
        p["items"].append(dict(id=uid, kind=kind, exhausted=False, damaged=False))

    def _exhaust(self, kind, n=1):
        for item in self.player("ranger")["items"]:
            if n and item["kind"] == kind and not item["damaged"] and not item["exhausted"]:
                item["exhausted"] = True
                n -= 1
        if n:
            raise AssertionError(f"Missing ready item: {kind}")

    def _payments(self, cards, suit, n):
        return list(itertools.combinations([cid for cid in cards if matches(cid, suit)], n))

    def _craft_actions(self, p):
        result = []
        f = p["faction"]
        pieces = Counter()
        if f == "ranger":
            pos = p["position"]
            if pos < 0:
                return []
            pieces[self.s["clearings"][pos]["suit"]] = self.item_count("hammer", ready=True)
        else:
            for c in self.s["clearings"]:
                if f == "covenant" and c["sympathy"] and c["id"] not in p["craft_used"]:
                    pieces[c["suit"]] += 1
                for j, b in enumerate(c["buildings"]):
                    key = f'{c["id"]}:{j}'
                    if b["player"] == p["id"] and b["kind"] == {"guild": "workshop", "canopy": "roost"}.get(f) and key not in p["craft_used"]:
                        pieces[c["suit"]] += 1
        for cid in p["hand"]:
            spec = card(cid)
            if not spec["cost"] or any(pieces[suit] < n for suit, n in spec["cost"].items()):
                continue
            if spec["effect"] == "item":
                if not self.s["items"].get(spec["item"], 0):
                    continue
            elif any(card(e)["effect"] == spec["effect"] for e in p["effects"]):
                continue
            result.append(Action("craft", card=cid))
        return result

    def _military(self, p, kind=None, suit=None):
        result = []
        pid = p["id"]
        for c in self.s["clearings"]:
            if suit and suit != "bird" and c["suit"] != suit:
                continue
            if c["warriors"][pid] and kind in (None, "move"):
                for dst in c["paths"]:
                    if self.ruler(c["id"]) == pid or self.ruler(dst) == pid:
                        for n in range(1, c["warriors"][pid] + 1):
                            result.append(Action("move", src=c["id"], dst=dst, n=n))
            if c["warriors"][pid] and kind in (None, "battle"):
                for target in range(4):
                    if target != pid and self._present(target, c):
                        result.append(Action("battle", src=c["id"], target=target))
            if kind == "recruit" and self.can_place(pid, c):
                n = 2 if p["leader"] == "orator" else 1
                if any(b["player"] == pid and b["kind"] == "roost" for b in c["buildings"]) and p["reserve"] >= n:
                    result.append(Action("decree_recruit", src=c["id"], n=n))
            if kind == "build" and self.can_place(pid, c):
                if self.ruler(c["id"]) == pid and self.free_slot(c) and self.count_buildings(pid, "roost") < 7 and not any(b["kind"] == "roost" for b in c["buildings"]):
                    result.append(Action("roost", src=c["id"]))
        return result

    def legal_actions(self, player=None):
        if self.s["status"] != "playing" or (player is not None and player != self.actor):
            return []
        pid = self.actor
        p = self.s["players"][pid]
        if self.s["pending"]:
            q = self.s["pending"][0]
            if q["kind"] == "outrage":
                return [Action("pay_outrage", card=cid) for cid in p["hand"] if matches(cid, q["suit"])] or [Action("reveal_outrage")]
            if q["kind"] == "hospital":
                choices = [Action("hospital", card=cid) for cid in p["hand"] if matches(cid, q["suit"])] if any(c["keep"] for c in self.s["clearings"]) else []
                return [Action("decline")] + choices
            if q["kind"] == "damage":
                return [Action("damage", n=i["id"]) for i in p["items"] if not i["damaged"]] or [Action("decline")]
            if q["kind"] == "remove":
                c = self.s["clearings"][q["loc"]]
                options = [Action("remove", option=f"building:{j}") for j, b in enumerate(c["buildings"]) if b["player"] == pid]
                if p["faction"] == "guild":
                    options += [Action("remove", option=k) for k in ("wood", "keep") if c[k]]
                if p["faction"] == "covenant" and c["sympathy"]:
                    options.append(Action("remove", option="sympathy"))
                return options or [Action("decline")]
        if self.s["battle"]:
            b = self.s["battle"]
            if b["stage"] in ("ambush", "foil"):
                suit = self.s["clearings"][b["loc"]]["suit"]
                return [Action("decline")] + [Action("ambush", card=cid) for cid in p["hand"] if card(cid)["effect"] == "ambush" and matches(cid, suit)]
        phase = self.s["phase"]
        if phase == "discard":
            return [Action("discard", card=cid) for cid in p["hand"]]
        if phase == "capacity":
            return [Action("drop_item", n=i["id"]) for i in self._satchel()]
        if phase == "cobbler":
            if p["faction"] == "ranger":
                moves = [Action("move", src=p["position"], dst=dst) for dst in self._ranger_destinations()]
            else:
                moves = self._military(p, "move")
            return moves + [Action("advance")]
        if phase == "leader":
            available = [name for name in LEADERS if name not in p["retired"]]
            return [Action("leader", option=name) for name in available]
        if phase == "decree_add":
            result = [Action("add_decree", card=cid, option=k) for cid in p["hand"]
                      if not (p["bird_added"] and card(cid)["suit"] == "bird") for k in p["decree"]]
            if p["decree_added"] or not result:
                result.append(Action("advance"))
            return result
        if phase == "new_roost":
            candidates = [c for c in self.s["clearings"] if self.free_slot(c) and self.can_place(pid, c)]
            least = min((sum(c["warriors"]) for c in candidates), default=0)
            return [Action("new_roost", src=c["id"]) for c in candidates if sum(c["warriors"]) == least] or [Action("advance")]
        if phase == "decree":
            for kind, entries in p["decree_left"].items():
                if not entries:
                    continue
                result = []
                for j, suit in enumerate(entries):
                    result += [Action(a.kind, a.src, a.dst, a.target, a.n, a.card, str(j))
                               for a in self._military(p, kind, suit)]
                return list(dict.fromkeys(result)) or [Action("turmoil")]
            return [Action("advance")]
        if phase == "refresh":
            return ([Action("refresh", n=i["id"]) for i in p["items"] if i["exhausted"]]
                    if p["refresh_left"] else []) + [Action("advance")]
        if phase == "slip":
            return [Action("slip", dst=dst) for dst in self._ranger_destinations(slip=True)] + [Action("advance")]
        result = []
        if phase in ("craft", "daylight"):
            result += self._craft_actions(p)
        if phase in ("actions", "daylight"):
            result += self._dominance_actions(p)
        if p["faction"] == "guild" and phase in ("actions", "march"):
            if phase == "march" or self.s["remaining"]:
                result += self._military(p, "move" if phase == "march" else None)
            if phase == "actions":
                if self.s["remaining"]:
                    if "recruit" not in p["used"] and p["reserve"] and self.count_buildings(pid, "recruiter"):
                        result.append(Action("recruit"))
                    for c in self.s["clearings"]:
                        if self.ruler(c["id"]) == pid and self.free_slot(c):
                            network = self._wood_network(c["id"], pid)
                            wood = sum(self.s["clearings"][i]["wood"] for i in network)
                            for kind in BUILD_POINTS:
                                n = self.count_buildings(pid, kind)
                                if n < 6 and wood >= BUILD_COST[n]:
                                    result.append(Action("build", src=c["id"], option=kind))
                        if sum(x["wood"] for x in self.s["clearings"]) < 8 and any(b["kind"] == "mill" for b in c["buildings"]):
                            result += [Action("overwork", src=c["id"], card=cid) for cid in p["hand"] if matches(cid, c["suit"])]
                result += [Action("extra_action", card=cid) for cid in p["hand"] if card(cid)["suit"] == "bird"]
        if p["faction"] == "covenant":
            count = self.sympathy_count()
            for c in self.s["clearings"]:
                if not self.can_place(pid, c):
                    continue
                slot_after_removal = sum(b["player"] == pid for b in c["buildings"]) + bool(c["ruin"]) < c["slots"]
                if phase == "revolt" and c["sympathy"] and slot_after_removal and not any(b["kind"] == "base" and self.s["clearings"][j]["suit"] == c["suit"] for j in range(12) for b in self.s["clearings"][j]["buildings"]):
                    result += [Action("revolt", src=c["id"], payment=pay) for pay in self._payments(p["supporters"], c["suit"], 2)]
                if phase == "spread" and not c["sympathy"] and count < 10:
                    if count == 0 or any(self.s["clearings"][j]["sympathy"] for j in c["paths"]):
                        cost = SYMPATHY_COST[count] + int(any(n >= 3 for j, n in enumerate(c["warriors"]) if j != pid))
                        result += [Action("spread", src=c["id"], payment=pay) for pay in self._payments(p["supporters"], c["suit"], cost)]
                if phase == "operations" and self.s["remaining"]:
                    if p["reserve"] and any(b["player"] == pid for b in c["buildings"]):
                        result.append(Action("recruit", src=c["id"]))
                    if c["warriors"][pid] and not c["sympathy"] and count < 10:
                        result.append(Action("organize", src=c["id"]))
            if phase == "daylight":
                result += [Action("mobilize", card=cid) for cid in p["hand"]]
                if p["reserve"]:
                    suits = {c["suit"] for c in self.s["clearings"] if any(b["player"] == pid for b in c["buildings"])}
                    result += [Action("train", card=cid) for cid in p["hand"] if any(matches(cid, suit) for suit in suits)]
            if phase == "operations" and self.s["remaining"]:
                result += self._military(p)
        if p["faction"] == "ranger" and phase == "daylight":
            result += self._ranger_actions(p)
        result += self._persistent_actions(p)
        result.append(Action("advance"))
        return list(dict.fromkeys(result))

    def _dominance_actions(self, p):
        result = []
        if p["dominance"] is not None or p["coalition"] is not None:
            return result
        if p["score"] >= 10:
            for cid in p["hand"]:
                if card(cid)["effect"] != "dominance":
                    continue
                if p["faction"] != "ranger":
                    result.append(Action("dominance", card=cid))
                else:
                    others = [q for q in self.s["players"] if q["id"] != p["id"]]
                    low = min(q["score"] for q in others)
                    result += [Action("coalition", card=cid, target=q["id"]) for q in others if q["score"] == low]
        for cid in self.s["dominance_pool"]:
            result += [Action("take_dominance", card=pay, n=cid) for pay in p["hand"] if matches(pay, card(cid)["suit"])]
        return result

    def _ranger_destinations(self, slip=False):
        pos = self.player("ranger")["position"]
        if pos < 0:
            forest = FORESTS[-pos - 1]
            result = list(forest)
            if slip:
                result += [-j - 1 for j, other in enumerate(FORESTS) if j != -pos - 1 and len(set(forest) & set(other)) >= 2]
            return result
        result = self.s["clearings"][pos]["paths"][:]
        if slip:
            result += [-j - 1 for j, forest in enumerate(FORESTS) if pos in forest]
        return result

    def _ranger_actions(self, p):
        result = []
        pid, pos = p["id"], p["position"]
        boots = self.item_count("boot", ready=True)
        for dst in self._ranger_destinations():
            hostile = any(p["relationships"][j] == -1 and n for j, n in enumerate(self.s["clearings"][dst]["warriors"]))
            if boots >= 1 + int(hostile):
                result.append(Action("move", src=pos, dst=dst, n=1 + int(hostile)))
        if pos < 0:
            return result
        c = self.s["clearings"][pos]
        if self.item_count("torch", ready=True) and c["ruin"]:
            result.append(Action("explore", src=pos))
        for qid in self.s["quests"]:
            q = QUESTS[qid]
            needed = Counter(q["items"])
            if q["suit"] == c["suit"] and all(self.item_count(k, ready=True) >= n for k, n in needed.items()):
                result += [Action("quest", n=qid, option=reward) for reward in ("points", "cards")]
        for item in p["items"]:
            if item["damaged"] and self.item_count("hammer", ready=True):
                result.append(Action("repair", n=item["id"]))
        ready = [i for i in p["items"] if not i["damaged"] and not i["exhausted"]]
        for target in range(4):
            if target == pid or not self._present(target, c):
                continue
            if self.item_count("sword", ready=True):
                result.append(Action("battle", src=pos, target=target))
            if self.item_count("crossbow", ready=True):
                result.append(Action("strike", src=pos, target=target))
            q = self.s["players"][target]
            for cid in p["hand"]:
                if matches(cid, c["suit"]):
                    for item in ready:
                        for take in ([-1] + list(range(len(q["crafted"])))):
                            result.append(Action("aid", target=target, card=cid, n=item["id"], dst=take))
            if "steal" not in p["used"] and self.item_count("torch", ready=True) and q["hand"]:
                result.append(Action("steal", target=target))
        return result

    def _persistent_actions(self, p):
        result = []
        for cid in p["effects"]:
            effect = card(cid)["effect"]
            if cid in p["used"]:
                continue
            if effect == "tax" and self.s["phase"] in ("actions", "daylight"):
                for c in self.s["clearings"]:
                    if c["warriors"][p["id"]]:
                        result.append(Action("tax", src=c["id"], card=cid))
        return result

    def step(self, action, validate=True):
        if validate and action not in self.legal_actions():
            raise ValueError(f"Illegal action: {action}")
        if self.s["status"] != "playing":
            raise ValueError("Game is over")
        pid = self.actor
        p = self.s["players"][pid]
        self.s["sequence"] += 1
        self._emit("action", self.describe(action, pid), player=pid, action=action.to_dict())
        if self.s["pending"]:
            self._resolve_pending(action)
            return
        if self.s["battle"]:
            self._resolve_ambush(action)
            return
        k, phase = action.kind, self.s["phase"]
        if k == "advance":
            self._advance()
            return
        if k == "discard":
            self._spend(pid, action.card)
            if len(p["hand"]) <= 5:
                self._after_discard()
            return
        if k == "drop_item":
            p["items"] = [i for i in p["items"] if i["id"] != action.n]
            self._check_capacity()
            return
        if k == "refresh":
            next(i for i in p["items"] if i["id"] == action.n)["exhausted"] = False
            p["refresh_left"] -= 1
            return
        if k == "slip":
            p["position"] = action.dst
            self.s["phase"] = "daylight"
            return
        if k == "add_decree":
            p["hand"].remove(action.card)
            p["decree"][action.option].append(dict(id=action.card, suit=card(action.card)["suit"]))
            p["decree_added"] += 1
            p["bird_added"] |= card(action.card)["suit"] == "bird"
            if p["decree_added"] == 2:
                self._after_decree_add()
            return
        if k == "new_roost":
            self._build(pid, action.src, "roost")
            self._place(pid, action.src, 3)
            self.s["phase"] = "craft"
            return
        if k == "turmoil":
            self._score(pid, -sum(e["suit"] == "bird" for entries in p["decree"].values() for e in entries))
            for entries in p["decree"].values():
                for e in entries:
                    if e["id"] >= 0:
                        self._discard(e["id"])
            p["retired"].append(p["leader"])
            if len(p["retired"]) == 4:
                p["retired"] = []
            p["decree"] = {k: [] for k in p["decree"]}
            self.s["phase"] = "leader"
            return
        if k == "leader":
            self._set_leader(action.option)
            self._evening()
            return
        if k == "craft":
            self._craft(pid, action.card)
            return
        if k == "extra_action":
            self._spend(pid, action.card)
            self.s["remaining"] += 1
            return
        if k in ("dominance", "coalition"):
            p["hand"].remove(action.card)
            p["dominance"] = action.card
            if k == "coalition":
                p["coalition"] = action.target
                p["relationships"][action.target] = 0
            return
        if k == "take_dominance":
            self.s["dominance_pool"].remove(action.n)
            self._spend(pid, action.card)
            p["hand"].append(action.n)
            return
        if k == "move":
            if p["faction"] == "ranger":
                self._exhaust("boot", action.n)
                p["position"] = action.dst
            else:
                self.s["clearings"][action.src]["warriors"][pid] -= action.n
                self.s["clearings"][action.dst]["warriors"][pid] += action.n
                if self.s["clearings"][action.dst]["sympathy"] and p["faction"] != "covenant":
                    self.s["pending"].append(dict(kind="outrage", player=pid, suit=self.s["clearings"][action.dst]["suit"]))
        elif k == "battle":
            if p["faction"] == "ranger":
                self._exhaust("sword")
            self.s["battle"] = dict(attacker=pid, defender=action.target, loc=action.src,
                                    stage="ambush", ambush_card=None)
        elif k == "recruit":
            if p["faction"] == "guild":
                for c in self.s["clearings"]:
                    for b in c["buildings"]:
                        if b["player"] == pid and b["kind"] == "recruiter":
                            self._place(pid, c["id"], 1)
                p["used"].append("recruit")
            else:
                self._place(pid, action.src, 1)
        elif k == "decree_recruit":
            self._place(pid, action.src, action.n)
        elif k == "roost":
            self._build(pid, action.src, "roost")
        elif k == "build":
            n = self.count_buildings(pid, action.option)
            cost = BUILD_COST[n]
            for loc in self._wood_network(action.src, pid):
                c = self.s["clearings"][loc]
                take = min(cost, c["wood"])
                c["wood"] -= take
                cost -= take
            self._build(pid, action.src, action.option)
            self._score(pid, BUILD_POINTS[action.option][n])
        elif k == "overwork":
            self._spend(pid, action.card)
            self.s["clearings"][action.src]["wood"] += 1
        elif k in ("spread", "revolt"):
            for cid in action.payment:
                p["supporters"].remove(cid)
                self._discard(cid)
            if k == "spread":
                self._sympathy(action.src)
            else:
                c = self.s["clearings"][action.src]
                self._wipe(action.src, pid)
                self._build(pid, action.src, "base")
                n = sum(x["sympathy"] and x["suit"] == c["suit"] for x in self.s["clearings"])
                self._place(pid, action.src, n)
                if p["reserve"]:
                    p["reserve"] -= 1
                    p["officers"] += 1
        elif k == "mobilize":
            p["hand"].remove(action.card)
            self._support(action.card)
        elif k == "train":
            self._spend(pid, action.card)
            p["reserve"] -= 1
            p["officers"] += 1
        elif k == "organize":
            self.s["clearings"][action.src]["warriors"][pid] -= 1
            p["reserve"] += 1
            self._sympathy(action.src)
        elif k == "explore":
            self._exhaust("torch")
            item = self.s["clearings"][action.src]["ruin"]
            self._gain_item(item)
            self.s["explored_items"].append(item)
            self.s["clearings"][action.src]["ruin"] = None
            self._score(pid, 1)
        elif k == "quest":
            q = QUESTS[action.n]
            for kind in q["items"]:
                self._exhaust(kind)
            p["completed"].append(action.n)
            self.s["quests"].remove(action.n)
            if self.s["quest_deck"]:
                self.s["quests"].append(self.s["quest_deck"].pop())
            if action.option == "points":
                self._score(pid, sum(QUESTS[i]["suit"] == q["suit"] for i in p["completed"]))
            else:
                self._draw(pid, 2)
        elif k == "repair":
            self._exhaust("hammer")
            next(i for i in p["items"] if i["id"] == action.n)["damaged"] = False
        elif k == "aid":
            next(i for i in p["items"] if i["id"] == action.n)["exhausted"] = True
            p["hand"].remove(action.card)
            self.s["players"][action.target]["hand"].append(action.card)
            if action.dst >= 0:
                self._gain_item(self.s["players"][action.target]["crafted"].pop(action.dst))
            rel = p["relationships"][action.target]
            if rel == 3:
                self._score(pid, 2)
            elif rel >= 0:
                p["aid_counts"][action.target] += 1
                if p["aid_counts"][action.target] >= rel + 1:
                    p["aid_counts"][action.target] = 0
                    p["relationships"][action.target] += 1
                    self._score(pid, min(2, rel + 1))
        elif k == "steal":
            self._exhaust("torch")
            q = self.s["players"][action.target]
            cid = self.rng.choice(q["hand"])
            q["hand"].remove(cid)
            p["hand"].append(cid)
            p["used"].append("steal")
        elif k == "strike":
            self._exhaust("crossbow")
            self._hits(action.target, action.src, 1, pid, battle=False)
        elif k == "tax":
            self.s["clearings"][action.src]["warriors"][pid] -= 1
            p["reserve"] += 1
            p["used"].append(action.card)
            self._draw(pid, 1)
            return
        self._consume_action(action, phase, p)
        if phase == "cobbler":
            p["used"].append("cobbler")
            self._evening()

    def _consume_action(self, action, phase, p):
        if phase == "decree":
            for entries in p["decree_left"].values():
                if entries:
                    entries.pop(int(action.option))
                    break
        elif p["faction"] == "guild" and phase in ("actions", "march"):
            if action.kind == "move" and phase == "actions":
                self.s["remaining"] -= 1
                self.s["phase"] = "march"
            elif phase == "march":
                self.s["phase"] = "actions"
            else:
                self.s["remaining"] -= 1
        elif phase == "operations":
            self.s["remaining"] -= 1

    def _after_decree_add(self):
        p = self.s["players"][self.s["current"]]
        self.s["phase"] = "new_roost" if not self.count_buildings(p["id"], "roost") else "craft"

    def _advance(self):
        p = self.s["players"][self.s["current"]]
        phase = self.s["phase"]
        if phase == "decree_add":
            self._after_decree_add()
        elif phase == "new_roost":
            self.s["phase"] = "craft"
        elif phase == "craft":
            if p["faction"] == "canopy":
                p["decree_left"] = {k: [e["suit"] for e in entries] for k, entries in p["decree"].items()}
                self.s["phase"] = "decree"
            else:
                self.s["phase"] = "actions"
        elif phase == "march":
            self.s["phase"] = "actions"
        elif phase == "revolt":
            self.s["phase"] = "spread"
        elif phase == "spread":
            self.s["phase"] = "daylight"
        elif phase == "refresh":
            self.s["phase"] = "slip"
        elif phase == "slip":
            self.s["phase"] = "daylight"
        elif phase == "daylight" and p["faction"] == "covenant":
            self.s.update(phase="operations", remaining=p["officers"])
        elif phase == "cobbler":
            p["used"].append("cobbler")
            self._evening()
        else:
            self._evening()

    def _evening(self):
        p = self.s["players"][self.s["current"]]
        if "cobbler" not in p["used"] and any(card(cid)["effect"] == "cobbler" for cid in p["effects"]):
            self.s["phase"] = "cobbler"
            return
        f = p["faction"]
        n = 1
        if f == "canopy":
            count = self.count_buildings(p["id"], "roost")
            self._score(p["id"], ROOST_POINTS[count])
            n += int(count >= 3) + int(count >= 6)
        elif f == "guild":
            count = self.count_buildings(p["id"], "recruiter")
            n += int(count >= 3) + int(count >= 5)
        elif f == "covenant":
            n += self.count_buildings(p["id"], "base")
        elif f == "ranger":
            if p["position"] < 0:
                for i in p["items"]:
                    i.update(damaged=False, exhausted=False)
            n += min(3, self.item_count("coin", ready=True))
        n += sum(card(cid)["effect"] == "extra_draw" for cid in p["effects"])
        self._draw(p["id"], n)
        if len(p["hand"]) > 5:
            self.s["phase"] = "discard"
        else:
            self._after_discard()

    def _after_discard(self):
        p = self.s["players"][self.s["current"]]
        if p["faction"] == "ranger":
            self._check_capacity()
        else:
            self._end_turn()

    def _check_capacity(self):
        satchel = len(self._satchel())
        capacity = 6 + 2 * min(3, self.item_count("bag", ready=True))
        if satchel > capacity:
            self.s["phase"] = "capacity"
        else:
            self._end_turn()

    def _satchel(self):
        tracks, satchel = Counter(), []
        for item in self.player("ranger")["items"]:
            k = item["kind"]
            if k in ("tea", "coin", "bag") and not item["exhausted"] and not item["damaged"] and tracks[k] < 3:
                tracks[k] += 1
            else:
                satchel.append(item)
        return satchel

    def _end_turn(self):
        self.s["current"] = (self.s["current"] + 1) % 4
        self.s["turn"] += 1
        self._start_turn()

    def _sympathy(self, loc):
        n = self.sympathy_count()
        self.s["clearings"][loc]["sympathy"] = True
        self._score(self.player("covenant")["id"], SYMPATHY_POINTS[n])

    def _craft(self, pid, cid):
        p, spec = self.s["players"][pid], card(cid)
        for suit, n in spec["cost"].items():
            if p["faction"] == "ranger":
                self._exhaust("hammer", n)
            else:
                for c in self.s["clearings"]:
                    if c["suit"] != suit:
                        continue
                    if p["faction"] == "covenant" and c["sympathy"] and c["id"] not in p["craft_used"] and n:
                        p["craft_used"].append(c["id"])
                        n -= 1
                    for j, b in enumerate(c["buildings"]):
                        key = f'{c["id"]}:{j}'
                        if n and key not in p["craft_used"] and b["player"] == pid and b["kind"] == {"guild": "workshop", "canopy": "roost"}.get(p["faction"]):
                            p["craft_used"].append(key)
                            n -= 1
        p["hand"].remove(cid)
        if spec["effect"] == "item":
            self.s["items"][spec["item"]] -= 1
            if p["faction"] == "ranger":
                self._gain_item(spec["item"])
            else:
                p["crafted"].append(spec["item"])
            pts = 1 if p["faction"] == "canopy" and p["leader"] != "steward" else spec["points"]
            pts += sum(card(e)["effect"] == "engraver" for e in p["effects"])
            self._score(pid, pts)
            self._discard(cid)
        elif spec["effect"] == "favor":
            for c in self.s["clearings"]:
                if c["suit"] == spec["suit"]:
                    self._wipe(c["id"], pid)
            self._discard(cid)
        else:
            p["effects"].append(cid)

    def _resolve_ambush(self, a):
        b = self.s["battle"]
        if b["stage"] == "ambush":
            if a.kind == "ambush":
                self._spend(b["defender"], a.card)
                b["stage"] = "foil"
            else:
                self._roll_battle()
        else:
            if a.kind == "ambush":
                self._spend(b["attacker"], a.card)
                self._roll_battle()
            else:
                self._hits(b["attacker"], b["loc"], 2, b["defender"], battle=True)
                attacker = self.s["players"][b["attacker"]]
                if attacker["faction"] == "ranger" or self.s["clearings"][b["loc"]]["warriors"][b["attacker"]]:
                    # Wait for damage/hospital/removal decisions before rolling.
                    b["stage"] = "roll_pending"
                    if not self.s["pending"]:
                        self._roll_battle()
                else:
                    self.s["battle"] = None

    def _roll_battle(self):
        b = self.s["battle"]
        ap, dp = self.s["players"][b["attacker"]], self.s["players"][b["defender"]]
        c = self.s["clearings"][b["loc"]]
        high, low = sorted((self.rng.randrange(4), self.rng.randrange(4)), reverse=True)
        ah, dh = (low, high) if dp["faction"] == "covenant" else (high, low)
        aw = self.item_count("sword") if ap["faction"] == "ranger" else c["warriors"][ap["id"]]
        dw = self.item_count("sword") if dp["faction"] == "ranger" else c["warriors"][dp["id"]]
        ah, dh = min(ah, aw) + int(dw == 0), min(dh, dw)
        ah += int(ap["faction"] == "canopy" and ap["leader"] == "marshal")
        # These automatic persistent effects are an explicit experimental-deck rule.
        for p, attacking in ((ap, True), (dp, False)):
            for cid in p["effects"][:]:
                effect = card(cid)["effect"]
                if effect == "brutal" and attacking:
                    ah += 1
                    self._score(dp["id"], 1)
                if effect == "sappers" and not attacking:
                    dh += 1
                    p["effects"].remove(cid)
                    self._discard(cid)
                if effect == "ward":
                    if attacking:
                        dh = 0
                    else:
                        ah = 0
                    p["effects"].remove(cid)
                    self._discard(cid)
        self._emit("battle", f'{ap["name"]} vs {dp["name"]}: {high}/{low} → {ah}/{dh} hits',
                   loc=b["loc"], attacker=ap["id"], defender=dp["id"], dice=[high, low], hits=[ah, dh])
        self.s["battle"] = None
        self._hits(dp["id"], b["loc"], ah, ap["id"], battle=True)
        self._hits(ap["id"], b["loc"], dh, dp["id"], battle=True)

    def _hits(self, target, loc, n, source, battle=False):
        if not n:
            return
        p, attacker = self.s["players"][target], self.s["players"][source]
        c = self.s["clearings"][loc]
        if p["faction"] == "ranger":
            if any(not i["damaged"] for i in p["items"]):
                self.s["pending"].append(dict(kind="damage", player=target, remaining=n))
            return
        warriors = min(n, c["warriors"][target])
        c["warriors"][target] -= warriors
        p["reserve"] += warriors
        if attacker["faction"] == "ranger" and warriors:
            hostile = attacker["relationships"][target] == -1
            attacker["relationships"][target] = -1
            if battle and source == self.s["current"]:
                self._score(source, warriors if hostile else max(0, warriors - 1))
        if warriors and p["faction"] == "guild" and any(x["keep"] for x in self.s["clearings"]):
            self.s["pending"].append(dict(kind="hospital", player=target, suit=c["suit"], n=warriors))
        if n > warriors:
            self.s["pending"].append(dict(kind="remove", player=target, loc=loc,
                remaining=n - warriors, source=source, battle=battle, regent_scored=False))

    def _remove_piece(self, q, option):
        c = self.s["clearings"][q["loc"]]
        p = self.s["players"][q["player"]]
        if option.startswith("building:"):
            building = c["buildings"].pop(int(option.split(":")[1]))
            if building["kind"] == "base":
                for cid in p["supporters"][:]:
                    if matches(cid, c["suit"]):
                        p["supporters"].remove(cid)
                        self._discard(cid)
                loss = (p["officers"] + 1) // 2
                p["officers"] -= loss
                p["reserve"] += loss
                if not self.count_buildings(p["id"], "base"):
                    while len(p["supporters"]) > 5:
                        self._discard(p["supporters"].pop())
        elif option == "sympathy":
            c["sympathy"] = False
            self.s["pending"].append(dict(kind="outrage", player=q["source"], suit=c["suit"]))
        elif option == "wood":
            c["wood"] -= 1
        else:
            c["keep"] = False
        self._score(q["source"], 1)
        attacker = self.s["players"][q["source"]]
        if q["battle"] and attacker["faction"] == "canopy" and attacker["leader"] == "regent" and not q["regent_scored"]:
            self._score(q["source"], 1)
            q["regent_scored"] = True
        if q["battle"] and attacker["faction"] == "ranger" and q["source"] == self.s["current"] and attacker["relationships"][q["player"]] == -1:
            self._score(q["source"], 1)

    def _resolve_pending(self, a):
        q = self.s["pending"][0]
        p = self.s["players"][q["player"]]
        done = True
        if a.kind == "pay_outrage":
            p["hand"].remove(a.card)
            self._support(a.card)
        elif a.kind == "reveal_outrage":
            # Revealed information is retained only by the entitled observer.
            alliance = self.player("covenant")
            alliance.setdefault("revealed", {})[str(p["id"])] = p["hand"][:]
            self._support(self._draw_one())
        elif a.kind == "hospital":
            self._spend(p["id"], a.card)
            loc = next((c["id"] for c in self.s["clearings"] if c["keep"]), None)
            if loc is not None:
                self._place(p["id"], loc, q["n"])
        elif a.kind == "damage":
            next(i for i in p["items"] if i["id"] == a.n)["damaged"] = True
            q["remaining"] -= 1
            done = q["remaining"] <= 0 or not any(not i["damaged"] for i in p["items"])
        elif a.kind == "remove":
            self._remove_piece(q, a.option)
            q["remaining"] -= 1
            done = q["remaining"] <= 0
        if done:
            self.s["pending"].pop(0)
        if not self.s["pending"] and self.s["battle"] and self.s["battle"]["stage"] == "roll_pending":
            self._roll_battle()

    def _wipe(self, loc, source):
        c = self.s["clearings"][loc]
        for p in self.s["players"]:
            if p["id"] == source or not self._present(p["id"], c):
                continue
            if p["faction"] == "ranger":
                self._hits(p["id"], loc, 3, source)
                continue
            n = c["warriors"][p["id"]]
            c["warriors"][p["id"]] = 0
            p["reserve"] += n
            if n and p["faction"] == "guild" and any(x["keep"] for x in self.s["clearings"]):
                self.s["pending"].append(dict(kind="hospital", player=p["id"], suit=c["suit"], n=n))
            q = dict(player=p["id"], loc=loc, source=source, battle=False, regent_scored=False)
            for j in range(len(c["buildings"]) - 1, -1, -1):
                if c["buildings"][j]["player"] == p["id"]:
                    self._remove_piece(q, f"building:{j}")
            if p["faction"] == "guild":
                while c["wood"]:
                    self._remove_piece(q, "wood")
                if c["keep"]:
                    self._remove_piece(q, "keep")
            if p["faction"] == "covenant" and c["sympathy"]:
                self._remove_piece(q, "sympathy")

    def observe(self, player):
        """No deck order, random-generator state, opponents' hands or supporter identities."""
        if player not in range(4):
            raise ValueError("Invalid player")
        s = copy.deepcopy(self.s)
        # A simulator seed reveals the shuffled deck to anyone who knows setup.
        s.pop("seed", None)
        s["deck_count"] = len(s.pop("deck"))
        s["quest_deck_count"] = len(s.pop("quest_deck"))
        s["observer"] = player
        for p in s["players"]:
            p["hand_count"] = len(p["hand"])
            p["supporter_count"] = len(p["supporters"])
            if p["id"] != player:
                p.pop("hand")
                p.pop("supporters")
                p.pop("revealed", None)
        for c in s["clearings"]:
            c["ruin"] = bool(c["ruin"])
        # Private card IDs in action logs would leak through discarded/aid/steal history.
        s["events"] = [dict(seq=e["seq"], turn=e["turn"], kind=e["kind"],
                            player=e.get("player"), loc=e.get("loc")) for e in s["events"]]
        return s

    def snapshot(self, omniscient=False):
        if omniscient:
            s = copy.deepcopy(self.s)
            s.pop("deck")
            s.pop("quest_deck")
            return s
        # Spectator-public view has no privileged seat.
        s = self.observe(0)
        s.pop("observer")
        s["seed"] = self.s["seed"]  # Spectators may inspect seeds; agents never receive them.
        for p in s["players"]:
            p.pop("hand", None)
            p.pop("supporters", None)
            p.pop("revealed", None)
        s["events"] = copy.deepcopy(self.s["events"])
        for event in s["events"]:
            if event.get("action", {}).get("kind") in ("mobilize", "train", "aid", "pay_outrage", "hospital", "discard"):
                event["action"].pop("card", None)
                event["action"].pop("payment", None)
        return s

    def export(self):
        return dict(state=copy.deepcopy(self.s), rng=self.rng.getstate())

    def stop(self, status="stopped"):
        if status not in ("stopped", "step_limit") or self.s["status"] != "playing":
            raise ValueError("Invalid terminal control")
        self.s["sequence"] += 1
        self.s["status"] = status
        self._emit("control", f"Match ended: {status}. No winner assigned.")

    @classmethod
    def restore(cls, saved, record=True):
        game = cls.__new__(cls)
        game.s = copy.deepcopy(saved["state"])
        game.record = record
        def tuples(v):
            return tuple(tuples(x) for x in v) if isinstance(v, (list, tuple)) else v
        game.rng = random.Random()
        game.rng.setstate(tuples(saved["rng"]))
        return game

    @classmethod
    def sample(cls, observation, rng):
        """Sample a world without accepting access to the real hidden state."""
        s = copy.deepcopy(observation)
        observer = s.pop("observer")
        used = set(s["discard"] + s["dominance_pool"])
        for p in s["players"]:
            used.update(p.get("hand", []))
            used.update(p.get("supporters", []))
            used.update(p["effects"])
            if p["dominance"] is not None:
                used.add(p["dominance"])
            used.update(e["id"] for entries in p["decree"].values() for e in entries if e["id"] >= 0)
        pool = [cid for cid in range(len(CARDS)) if cid not in used]
        rng.shuffle(pool)
        for p in s["players"]:
            if p["id"] != observer:
                p["hand"] = [pool.pop() for _ in range(p["hand_count"])]
                p["supporters"] = [pool.pop() for _ in range(p["supporter_count"])]
            p.pop("hand_count", None)
            p.pop("supporter_count", None)
        s["deck"] = pool
        s.pop("deck_count", None)
        completed = {qid for p in s["players"] for qid in p["completed"]}
        s["quest_deck"] = [qid for qid in range(len(QUESTS)) if qid not in completed and qid not in s["quests"]]
        rng.shuffle(s["quest_deck"])
        s.pop("quest_deck_count", None)
        remaining_ruins = [item for item in ("boot", "hammer", "sword", "bag") if item not in s.get("explored_items", [])]
        rng.shuffle(remaining_ruins)
        for c in s["clearings"]:
            c["ruin"] = remaining_ruins.pop() if c["ruin"] else None
        game = cls.__new__(cls)
        game.s, game.record, game.rng = s, False, random.Random(rng.getrandbits(64))
        return game

    def digest(self):
        return hashlib.sha256(json.dumps(self.export(), sort_keys=True).encode()).hexdigest()

    def assert_invariants(self):
        zones = self.s["deck"] + self.s["discard"] + self.s["dominance_pool"]
        for p in self.s["players"]:
            zones += p["hand"] + p["supporters"] + p["effects"]
            zones += [e["id"] for es in p["decree"].values() for e in es if e["id"] >= 0]
            if p["dominance"] is not None:
                zones.append(p["dominance"])
            if p["faction"] != "ranger":
                total = p["reserve"] + p["officers"] + sum(c["warriors"][p["id"]] for c in self.s["clearings"])
                assert total == {"guild": 25, "canopy": 20, "covenant": 10}[p["faction"]], (p, total)
                assert p["reserve"] >= 0
        assert sorted(zones) == list(range(54)), "Card conservation failed"
        assert 0 <= self.sympathy_count() <= 10
        assert sum(c["wood"] for c in self.s["clearings"]) <= 8
        for c in self.s["clearings"]:
            assert all(n >= 0 for n in c["warriors"])
            assert len(c["buildings"]) + bool(c["ruin"]) <= c["slots"], c

    def describe(self, a, pid=None):
        pid = self.actor if pid is None else pid
        name = self.s["players"][pid]["name"]
        loc = self.s["clearings"][a.src]["name"] if a.src >= 0 else "forest"
        if a.kind == "move":
            return f'{name}: moves {a.n} to {self.s["clearings"][a.dst]["name"]}'
        if a.kind == "craft":
            return f'{name}: crafts {card(a.card)["name"]}'
        if a.kind in ("discard", "mobilize", "train", "steal", "pay_outrage", "hospital", "aid"):
            return f'{name}: {a.kind.replace("_", " ")}'
        return f'{name}: {a.kind.replace("_", " ")}' + (f' · {loc}' if a.src >= 0 else "")
