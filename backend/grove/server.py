"""Read-only LAN spectator server. Match control exists only in the host CLI."""
from __future__ import annotations

import asyncio
import json
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .content import CARDS, FACTIONS, FORESTS, QUESTS, REFERENCE, RULESET
from .runner import run_match
from .storage import Store


ROOT = Path(__file__).resolve().parents[2]


def create_app(data_dir=None, auto_match=False, kind="search", budget=1., pace=.2,
               seed=42, checkpoint=None, loop=False, max_turns=240):
    data_dir = Path(data_dir or ROOT / "data")
    store = Store(data_dir / "arena.sqlite")
    stop = threading.Event()
    current = {"id": None, "error": None, "viewers": 0}

    def lease():
        path = data_dir / "viewers.json"
        temp = path.with_suffix(".tmp")
        temp.write_text(json.dumps(dict(count=current["viewers"], updated=time.time())))
        temp.replace(path)

    def frame(mid, game):
        current["id"] = mid
        if (data_dir / "stop.request").exists():
            stop.set()

    def background():
        match_seed = seed
        try:
            while not stop.is_set():
                run_match(match_seed, kind, budget, max_turns=max_turns, store=store, stop=stop, on_frame=frame,
                          pace=pace, checkpoint=checkpoint)
                if not loop:
                    break
                match_seed += 1
                stop.wait(3)
        except Exception as exc:
            current["error"] = f"{type(exc).__name__}: {exc}"

    @asynccontextmanager
    async def lifespan(app):
        current["viewers"] = 0
        lease()
        request = data_dir / "stop.request"
        if request.exists():
            request.unlink()
        thread = threading.Thread(target=background, daemon=True) if auto_match else None
        if thread:
            thread.start()
        yield
        stop.set()
        if thread:
            await asyncio.to_thread(thread.join, 5)
        current["viewers"] = 0
        lease()

    app = FastAPI(title="Grove Arena", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.store = store

    @app.get("/api/meta")
    def meta():
        return dict(name="Grove Arena", ruleset=RULESET, reference=REFERENCE, cards=CARDS,
                    quests=QUESTS, forests=FORESTS, factions=FACTIONS,
                    experimental=True, differences=["Original test-map topology, not verified Autumn",
                    "Original 54-card recipes and quests, not the Root base deck",
                    "Single Wayfarer character; no allied-warrior movement/combat",
                    "Some timing and optional persistent-card effects differ; see docs/RULES.md"])

    @app.get("/api/health")
    def health():
        return dict(ok=current["error"] is None, error=current["error"], current=current["id"])

    @app.get("/api/report")
    def report():
        report_path = data_dir / "evaluation.summary.json"
        return json.loads(report_path.read_text()) if report_path.exists() else None

    @app.get("/api/matches")
    def matches():
        return dict(matches=store.matches(), current=current["id"], error=current["error"])

    @app.get("/api/matches/{mid}/snapshot")
    def snapshot(mid: str, omniscient: bool = False):
        state = store.latest(mid, omniscient)
        if state is None:
            raise HTTPException(404, "Unknown match")
        return state

    @app.get("/api/matches/{mid}/frames")
    def frames(mid: str, after: int = Query(-1, ge=-1), limit: int = Query(30, ge=1, le=100), omniscient: bool = False):
        if store.latest(mid) is None:
            raise HTTPException(404, "Unknown match")
        items = store.frames(mid, after, limit, omniscient)
        return dict(frames=items, cursor=items[-1]["sequence"] if items else after)

    @app.websocket("/api/watch/{mid}")
    async def watch(ws: WebSocket, mid: str, omniscient: bool = False):
        if store.latest(mid) is None:
            await ws.close(code=1008)
            return
        await ws.accept()
        current["viewers"] += 1
        lease()
        seq = -1
        receiver = asyncio.create_task(ws.receive())
        try:
            while True:
                # Any client message closes the connection; no gameplay commands exist.
                if receiver.done():
                    await ws.close(code=1008)
                    break
                state = await asyncio.to_thread(store.latest, mid, omniscient)
                if state and state["sequence"] != seq:
                    seq = state["sequence"]
                    await ws.send_json(dict(type="snapshot", state=state))
                lease()
                await asyncio.sleep(.25)
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            receiver.cancel()
            current["viewers"] = max(0, current["viewers"] - 1)
            lease()

    dist = ROOT / "web" / "dist"
    if (dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/")
    def index():
        if not (dist / "index.html").exists():
            raise HTTPException(503, "Build web first: cd web && npm ci && npm run build")
        return FileResponse(dist / "index.html")

    return app
