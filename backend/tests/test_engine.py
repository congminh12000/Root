import json
import random

import pytest

from root.agents import HeuristicAgent, SearchAgent
from root.content import CARDS, FACTIONS
from root.engine import Action, Game
from root.storage import Store


def empty_map(game):
    for p in game.s["players"]:
        p["reserve"] += sum(c["warriors"][p["id"]] for c in game.s["clearings"])
    for c in game.s["clearings"]:
        c.update(warriors=[0] * 4, buildings=[], keep=False, sympathy=False, wood=0, ruin=None)


def give_card(game, pid, effect, suit=None):
    cid = next(c["id"] for c in CARDS if c["effect"] == effect and (suit is None or c["suit"] == suit))
    for p in game.s["players"]:
        for zone in (p["hand"], p["supporters"], p["effects"]):
            if cid in zone:
                zone.remove(cid)
    for zone in (game.s["deck"], game.s["discard"], game.s["dominance_pool"]):
        if cid in zone:
            zone.remove(cid)
    game.s["players"][pid]["hand"].append(cid)
    return cid


def test_setup_conserves_cards_and_warriors():
    for seed in range(20):
        g = Game(seed)
        g.assert_invariants()
        assert len(g.s["players"]) == 4
        assert len(g.s["clearings"]) == 12


def test_illegal_action_has_no_effect():
    g = Game()
    before = g.digest()
    with pytest.raises(ValueError, match="Illegal"):
        g.step(Action("build", src=9, option="castle"))
    assert g.digest() == before


def test_rule_ties_favour_canopy_and_tokens_do_not_rule():
    g = Game()
    empty_map(g)
    g._place(0, 0, 2)
    g._place(1, 0, 2)
    assert g.ruler(0) == 1
    g.s["clearings"][2]["sympathy"] = True
    g.s["clearings"][2]["wood"] = 3
    assert g.ruler(2) is None


def test_move_requires_rule_at_one_endpoint():
    g = Game()
    empty_map(g)
    g._place(0, 0, 1)
    g._place(1, 0, 2)
    g._place(1, 1, 2)
    g.s.update(phase="actions", remaining=3)
    assert Action("move", src=0, dst=1, n=1) not in g.legal_actions()
    assert Action("move", src=0, dst=3, n=1) not in g.legal_actions()  # Neither empty nor origin ruled.
    g._place(0, 1, 3)
    assert Action("move", src=0, dst=1, n=1) in g.legal_actions()


def test_keep_blocks_placement_but_not_movement():
    g = Game()
    assert g._place(1, 0, 1) == 0
    assert not g.can_place(2, g.s["clearings"][0])


def test_guild_march_contains_two_moves_for_one_action():
    g = Game()
    g.s.update(phase="actions", remaining=3)
    a = next(a for a in g.legal_actions() if a.kind == "move")
    g.step(a)
    assert g.s["remaining"] == 2
    assert g.s["phase"] == "march"
    g.step(Action("advance"))
    assert g.s["remaining"] == 2
    assert g.s["phase"] == "actions"


def test_outrage_is_a_choice_for_the_mover():
    g = Game()
    g.s["clearings"][1]["sympathy"] = True
    g.s.update(phase="actions", remaining=3)
    g.step(Action("move", src=0, dst=1, n=1))
    assert g.s["pending"][0]["kind"] == "outrage"
    assert all(a.kind in ("pay_outrage", "reveal_outrage") for a in g.legal_actions())
    g.step(g.legal_actions()[0])
    g.assert_invariants()


def test_supporter_capacity_and_base_loss():
    g = Game()
    p = g.player("covenant")
    for _ in range(10):
        g._support(g._draw_one())
    assert len(p["supporters"]) == 5
    g._build(p["id"], 8, "base")
    g._support(g._draw_one())
    assert len(p["supporters"]) == 6
    g.assert_invariants()


def test_ambush_interrupt_and_foil():
    g = Game()
    empty_map(g)
    g._place(0, 1, 4)
    g._place(1, 1, 3)
    ambush = give_card(g, 1, "ambush", "rabbit")
    foil = give_card(g, 0, "ambush", "bird")
    g.s.update(phase="actions", remaining=3)
    g.step(Action("battle", src=1, target=1))
    assert g.actor == 1
    g.step(Action("ambush", card=ambush))
    assert g.actor == 0
    g.step(Action("ambush", card=foil))
    assert g.s["battle"] is None
    assert ambush in g.s["discard"] and foil in g.s["discard"]


def test_warriors_removed_before_buildings_and_owner_chooses():
    g = Game()
    empty_map(g)
    g._place(0, 2, 1)
    g._build(0, 2, "mill")
    g._build(0, 2, "workshop")
    g._hits(0, 2, 2, 1, battle=True)
    assert g.s["clearings"][2]["warriors"][0] == 0
    options = g.legal_actions()
    assert {a.option for a in options} == {"building:0", "building:1"}
    g.step(next(a for a in options if a.option == "building:1"))
    assert [b["kind"] for b in g.s["clearings"][2]["buildings"]] == ["mill"]
    assert g.s["players"][1]["score"] == 2  # Regent bonus.


def test_immediate_victory_and_coalition():
    g = Game()
    ranger = g.player("ranger")
    ranger["coalition"] = 0
    g._score(0, 30)
    assert g.s["status"] == "finished"
    assert g.s["winners"] == [0, 3]
    assert g.legal_actions() == []


def test_dominance_checked_at_start_of_turn():
    g = Game()
    empty_map(g)
    cid = give_card(g, 0, "dominance", "fox")
    g.s["players"][0]["hand"].remove(cid)
    g.s["players"][0]["dominance"] = cid
    for c in g.s["clearings"]:
        if c["suit"] == "fox":
            g._place(0, c["id"], 1)
    g._start_turn()
    assert g.s["winner"] == 0


def test_hidden_state_does_not_affect_observation():
    g = Game()
    before = g.observe(0)
    other = g.s["players"][1]["hand"]
    g.s["deck"][0], other[0] = other[0], g.s["deck"][0]
    g.rng.random()
    assert g.observe(0) == before
    assert "deck" not in before
    assert "seed" not in before  # The shuffle seed would reveal hidden cards.
    assert "hand" not in before["players"][1]
    assert "supporters" not in before["players"][2]


def test_sampling_uses_observation_and_conserves_cards():
    g = Game(7)
    for pid in range(4):
        sample = Game.sample(g.observe(pid), random.Random(pid))
        sample.assert_invariants()
        assert sample.s["players"][pid]["hand"] == g.s["players"][pid]["hand"]


def test_restore_and_replay_identical_including_rng(tmp_path):
    g = Game(8)
    store = Store(tmp_path / "test.sqlite")
    mid = store.create(g, ["heuristic"] * 4)
    agent = HeuristicAgent(8)
    for _ in range(80):
        a = agent.act(g.observe(g.actor), g.legal_actions())
        g.step(a)
        store.append(mid, g, a)
        restored = Game.restore(json.loads(json.dumps(g.export())))
        assert g.digest() == restored.digest()
    assert store.verify(mid)["frames"] == 81


def test_turn_limit_is_not_a_fake_victory():
    g = Game(max_turns=1)
    bot = HeuristicAgent()
    for _ in range(100):
        if g.s["status"] != "playing":
            break
        g.step(bot.act(g.observe(g.actor), g.legal_actions()))
    assert g.s["status"] == "turn_limit"
    assert g.s["winner"] is None


def test_host_stop_replays_and_has_no_winner(tmp_path):
    game = Game(5)
    store = Store(tmp_path / "stop.sqlite")
    mid = store.create(game, ["heuristic"] * 4)
    game.stop()
    store.append(mid, game, dict(control="stopped"))
    store.finish(mid, game)
    assert store.latest(mid)["status"] == "stopped"
    assert store.verify(mid)["status"] == "stopped"
    assert game.s["winner"] is None


def test_search_returns_legal_action_without_mutating_game():
    g = Game()
    before = g.digest()
    actions = g.legal_actions()
    a = SearchAgent(2, horizon=3, max_rollouts=8).act(g.observe(g.actor), actions, .05)
    assert a in actions
    assert g.digest() == before


@pytest.mark.parametrize("seed", range(12))
def test_random_complete_game_invariants(seed):
    rng = random.Random(seed)
    seating = list(FACTIONS)
    rng.shuffle(seating)
    g = Game(seed, seating, max_turns=60)
    for _ in range(5000):
        g.assert_invariants()
        if g.s["status"] != "playing":
            return
        actions = g.legal_actions()
        assert actions
        g.step(rng.choice(actions))
    pytest.fail("Random game exceeded step budget")
