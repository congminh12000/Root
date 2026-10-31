"""Original presentation and explicit experimental content; no extracted game assets."""
import json
from pathlib import Path

SUITS = ("fox", "rabbit", "mouse")
FACTIONS = ("guild", "canopy", "covenant", "ranger")
FACTION_NAMES = ("Ember Guild", "Sky Assembly", "Moss Union", "Wayfarer")
COLORS = ("#dc8250", "#648da8", "#9ba868", "#bd94b7")
PROFILES = ("architect", "tactician", "diplomat", "challenger")
RULESET = "grove-experimental-0.2"
REFERENCE = "Law of Root, 13 October 2025, sections 1–9"

# An original twelve-clearing test map. NOT a verified reproduction of Autumn.
# Each map keeps gameplay and terrain together in maps/<id>.json; see docs/MAPS.md.
MAP_ID = "lakeside"
_MAP_DATA = json.loads((Path(__file__).resolve().parents[2] / "maps" / f"{MAP_ID}.json").read_text())
MAP = [(c["name"], c["suit"], c["slots"], c["x"], c["y"], tuple(c["paths"])) for c in _MAP_DATA["clearings"]]
FORESTS = tuple(tuple(f) for f in _MAP_DATA["forests"])
# Clearings that start with a ruin; the ruin fills one building slot until it is explored.
RUINS = tuple(i for i, c in enumerate(_MAP_DATA["clearings"]) if c.get("ruin"))

LEADERS = {
    "steward": ("recruit", "move"),
    "orator": ("recruit", "battle"),
    "marshal": ("move", "battle"),
    "regent": ("move", "build"),
}
BUILD_COST = (0, 1, 2, 3, 3, 4)
BUILD_POINTS = {
    "mill": (0, 1, 2, 3, 4, 5),
    "workshop": (0, 2, 2, 3, 4, 5),
    "recruiter": (0, 1, 2, 3, 3, 4),
}
SYMPATHY_COST = (1, 1, 1, 2, 2, 2, 3, 3, 3, 3)
SYMPATHY_POINTS = (0, 1, 1, 1, 2, 2, 3, 3, 4, 4)
ROOST_POINTS = (0, 0, 1, 2, 3, 4, 4, 5)
ITEM_SUPPLY = {"boot": 2, "sword": 2, "bag": 2, "tea": 2, "coin": 2, "crossbow": 1, "hammer": 1}


def make_cards():
    """54 original cards, an openly documented experimental deck, not the base deck."""
    cards = []
    for suit in (*SUITS, "bird", "bird"):
        cards.append(dict(suit=suit, name="Hidden Patrol", effect="ambush", cost={}, points=0, item=None))
    for suit in (*SUITS, "bird"):
        cards.append(dict(suit=suit, name="Claim of Sovereignty", effect="dominance", cost={}, points=0, item=None))
    recipes = [
        ("boot", 1, 1), ("sword", 2, 2), ("bag", 1, 1), ("tea", 2, 2),
        ("coin", 2, 3), ("crossbow", 1, 1), ("hammer", 1, 2),
    ]
    for suit in SUITS:
        for item, cost, points in recipes:
            cards.append(dict(suit=suit, name=f"{suit.title()} {item.title()}wright",
                              effect="item", cost={suit: cost}, points=points, item=item))
    effects = [("ward", 1), ("brutal", 2), ("sappers", 1), ("extra_draw", 2),
               ("cobbler", 2), ("tax", 2), ("favor", 3), ("engraver", 2)]
    for suit in SUITS:
        for effect, cost in effects:
            cards.append(dict(suit=suit, name=f"{suit.title()} {effect.replace('_', ' ').title()}",
                              effect=effect, cost={suit: cost}, points=0, item=None))
    return [dict(c, id=i) for i, c in enumerate(cards)]


CARDS = make_cards()
assert len(CARDS) == 54


def card(card_id):
    return CARDS[card_id]


def matches(card_id, suit):
    return card(card_id)["suit"] in (suit, "bird")


def make_quests():
    pairs = (("boot", "torch"), ("sword", "torch"), ("hammer", "torch"),
             ("boot", "sword"), ("tea", "bag"))
    return [dict(id=i * 5 + j, suit=suit, items=list(pair), name=f"{suit.title()} errand {j + 1}")
            for i, suit in enumerate(SUITS) for j, pair in enumerate(pairs)]


QUESTS = make_quests()
