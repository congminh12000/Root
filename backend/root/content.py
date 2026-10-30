"""Original presentation and explicit experimental content; no extracted game assets."""

SUITS = ("fox", "rabbit", "mouse")
FACTIONS = ("guild", "canopy", "covenant", "ranger")
FACTION_NAMES = ("Ember Guild", "Sky Assembly", "Moss Union", "Wayfarer")
COLORS = ("#dc8250", "#648da8", "#9ba868", "#bd94b7")
PROFILES = ("architect", "tactician", "diplomat", "challenger")
RULESET = "grove-experimental-0.2"
REFERENCE = "Law of Root, 13 October 2025, sections 1–9"

# Twelve clearings laid over the user-supplied map art (web/src/assets/lowlands.webp,
# 1311x1200). Coordinates are art pixels; paths follow the drawn trails and the suit
# follows the leaf colour (red fox, yellow rabbit, orange mouse). Experimental content,
# NOT a verified reproduction of Autumn.
MAP_SIZE = (1311, 1200)
MAP = [
    ("Redleaf Lodge", "fox", 2, 140, 150, (1, 3, 4)),
    ("Brook Bridge", "rabbit", 2, 745, 110, (0, 2, 4)),
    ("Cliffside Farm", "mouse", 2, 1140, 255, (1, 4, 6)),
    ("Ember Hollow", "mouse", 2, 165, 440, (0, 7, 8)),
    ("Goldleaf Ford", "rabbit", 2, 580, 410, (0, 1, 2, 8)),
    ("Old Waterwheel", "mouse", 3, 860, 560, (6, 8, 11)),
    ("Cave Hamlet", "fox", 2, 1160, 635, (2, 5, 11)),
    ("Lakeshore", "rabbit", 2, 195, 945, (3, 8, 10)),
    ("Crossroads", "fox", 3, 460, 640, (3, 4, 5, 7, 9)),
    ("Riverbend", "mouse", 2, 775, 850, (8, 10, 11)),
    ("Southwood", "fox", 2, 505, 1050, (7, 9)),
    ("Falls Cottage", "rabbit", 2, 1075, 1010, (5, 6, 9)),
]
# Faces of the trail graph (regions enclosed by trails), excluding the outer border.
FORESTS = ((0, 1, 4), (1, 2, 4), (3, 7, 8), (5, 6, 11), (0, 3, 4, 8),
           (5, 8, 9, 11), (7, 8, 9, 10), (2, 4, 5, 6, 8))
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
