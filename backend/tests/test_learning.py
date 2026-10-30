import torch

from grove.engine import Game
from grove.learning import (
    ACT_SIZE, ENCODING, MEMORY_SIZE, OBS_SIZE, Policy, NeuralAgent,
    _trajectory, action_features, load_checkpoint, observation_features,
)
from grove.content import RULESET


def test_encoding_and_legal_policy(tmp_path):
    torch.set_num_threads(1)
    model = Policy()
    file = tmp_path / "small.pt"
    torch.save(dict(model=model.state_dict(), encoding=ENCODING, ruleset=RULESET), file)
    agent = NeuralAgent(file)
    g = Game()
    o, actions = g.observe(g.actor), g.legal_actions()
    assert len(observation_features(o)) == OBS_SIZE
    assert all(len(action_features(o, a)) == ACT_SIZE for a in actions)
    assert agent.act(o, actions) in actions
    assert load_checkpoint(file)["encoding"] == ENCODING


def test_training_signal_changes_weights_and_memory():
    torch.set_num_threads(1)
    torch.manual_seed(3)
    model = Policy()
    before = {k: v.clone() for k, v in model.state_dict().items()}
    rows, meta = _trajectory((3, model.state_dict(), True, 8, None))
    assert rows and meta["status"] in ("turn_limit", "finished")
    assert any(r["h"].abs().sum() > 0 for r in rows[1:])
    optimizer = torch.optim.Adam(model.parameters(), lr=.001)
    row = rows[0]
    logits, value, h = model(row["x"], row["a"], row["h"])
    loss = -logits.log_softmax(-1)[row["choice"]] + (value - row["return"]) ** 2
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    assert h.shape == (MEMORY_SIZE,)
    assert any(not torch.equal(before[k], v) for k, v in model.state_dict().items())
