import pytest
from fastapi.testclient import TestClient

from grove.engine import Game
from grove.server import create_app


def test_read_only_server_and_reconnect(tmp_path):
    app = create_app(tmp_path)
    game = Game(9)
    mid = app.state.store.create(game, ["heuristic"] * 4)
    with TestClient(app) as client:
        assert client.get("/api/health").json()["ok"]
        assert client.get("/api/matches").json()["matches"][0]["id"] == mid
        assert client.post(f"/api/matches/{mid}/action", json={"kind": "move"}).status_code in (404, 405)
        public = client.get(f"/api/matches/{mid}/snapshot").json()
        assert all("hand" not in p for p in public["players"])
        omni = client.get(f"/api/matches/{mid}/snapshot?omniscient=true").json()
        assert all("hand" in p for p in omni["players"])
        with client.websocket_connect(f"/api/watch/{mid}") as first:
            with client.websocket_connect(f"/api/watch/{mid}") as second:
                assert first.receive_json()["state"] == second.receive_json()["state"]
        with client.websocket_connect(f"/api/watch/{mid}") as reconnect:
            assert reconnect.receive_json()["state"]["sequence"] == public["sequence"]
        assert client.get("/api/matches/missing/snapshot").status_code == 404
        assert client.get(f"/api/matches/{mid}/frames?limit=101").status_code == 422


def test_websocket_cannot_submit_moves(tmp_path):
    from starlette.websockets import WebSocketDisconnect
    app = create_app(tmp_path)
    game = Game(9)
    mid = app.state.store.create(game, ["heuristic"] * 4)
    with TestClient(app) as client:
        with client.websocket_connect(f"/api/watch/{mid}") as ws:
            before = ws.receive_json()["state"]["sequence"]
            ws.send_json({"kind": "advance"})
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        assert client.get(f"/api/matches/{mid}/snapshot").json()["sequence"] == before
