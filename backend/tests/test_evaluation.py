import json

import pytest

from root.runner import tournament, wilson


def test_tournament_resume_does_not_duplicate_games(tmp_path):
    output = tmp_path / "report.jsonl"
    first = tournament(output, games=2, seed=800000, max_turns=8)
    resumed = tournament(output, games=3, seed=800000, max_turns=8)
    assert first["games"] == 2 and resumed["games"] == 3
    rows = [json.loads(line) for line in output.read_text().splitlines()]
    assert [r["seed"] for r in rows] == [800000, 800001, 800002]
    with pytest.raises(ValueError, match="configuration"):
        tournament(output, games=4, seed=900000)


def test_confidence_intervals_have_bounds_and_report_uncertainty():
    low, high = wilson(0, 20)
    assert low == 0 and 0 < high < 1
    low, high = wilson(10, 20)
    assert 0 < low < .5 < high < 1
