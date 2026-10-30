"""SQLite replay journal. Compressed snapshots include explicit public/observer views."""
import json
import sqlite3
import time
import uuid
import zlib
from pathlib import Path

from .engine import Action, Game


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS matches (
                    id TEXT PRIMARY KEY, created REAL, seed INTEGER, status TEXT,
                    meta TEXT, initial BLOB, final TEXT
                );
                CREATE TABLE IF NOT EXISTS frames (
                    match_id TEXT, seq INTEGER, action TEXT, public BLOB, omni BLOB, digest TEXT,
                    PRIMARY KEY(match_id, seq)
                );
            """)

    def connect(self):
        db = sqlite3.connect(self.path, timeout=20)
        db.row_factory = sqlite3.Row
        return db

    @staticmethod
    def pack(value):
        return zlib.compress(json.dumps(value, separators=(",", ":")).encode())

    @staticmethod
    def unpack(value):
        return json.loads(zlib.decompress(value))

    def create(self, game, agents):
        mid = uuid.uuid4().hex[:12]
        meta = dict(seating=game.s["seating"], agents=agents, ruleset=game.s["ruleset"])
        with self.connect() as db:
            db.execute("INSERT INTO matches VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (mid, time.time(), game.s["seed"], "playing", json.dumps(meta), self.pack(game.export()), None))
        self.append(mid, game, None)
        return mid

    def append(self, mid, game, action):
        public, omni = game.snapshot(), game.snapshot(True)
        public["actor"] = omni["actor"] = game.actor
        with self.connect() as db:
            db.execute("INSERT INTO frames VALUES (?, ?, ?, ?, ?, ?)",
                (mid, game.s["sequence"], json.dumps(action if isinstance(action, dict) else action.to_dict()) if action else None,
                 self.pack(public), self.pack(omni), game.digest()))

    def finish(self, mid, game, status=None):
        final = dict(winner=game.s["winner"], winners=game.s["winners"], turn=game.s["turn"],
                     scores=[p["score"] for p in game.s["players"]])
        with self.connect() as db:
            db.execute("UPDATE matches SET status=?, final=? WHERE id=?",
                       (status or game.s["status"], json.dumps(final), mid))

    def matches(self):
        with self.connect() as db:
            rows = db.execute("SELECT id, created, seed, status, meta, final FROM matches ORDER BY created DESC LIMIT 100").fetchall()
        return [dict(id=r["id"], created=r["created"], seed=r["seed"], status=r["status"],
                     meta=json.loads(r["meta"]), final=json.loads(r["final"]) if r["final"] else None) for r in rows]

    def frames(self, mid, after=-1, limit=40, omniscient=False):
        column = "omni" if omniscient else "public"
        with self.connect() as db:
            rows = db.execute(f"SELECT seq, {column} AS payload FROM frames WHERE match_id=? AND seq>? ORDER BY seq LIMIT ?",
                              (mid, after, limit)).fetchall()
        return [self.unpack(r["payload"]) for r in rows]

    def latest(self, mid, omniscient=False):
        column = "omni" if omniscient else "public"
        with self.connect() as db:
            row = db.execute(f"SELECT {column} AS payload FROM frames WHERE match_id=? ORDER BY seq DESC LIMIT 1", (mid,)).fetchone()
        return self.unpack(row["payload"]) if row else None

    def verify(self, mid):
        with self.connect() as db:
            row = db.execute("SELECT initial FROM matches WHERE id=?", (mid,)).fetchone()
            if not row:
                raise ValueError("Unknown match")
            frames = db.execute("SELECT seq, action, digest FROM frames WHERE match_id=? ORDER BY seq", (mid,)).fetchall()
        game = Game.restore(self.unpack(row["initial"]))
        for frame in frames:
            if frame["action"]:
                action = json.loads(frame["action"])
                if "control" in action:
                    game.stop(action["control"])
                else:
                    game.step(Action.from_dict(action))
            if game.digest() != frame["digest"]:
                raise AssertionError(f'Replay diverged at sequence {frame["seq"]}')
        return dict(match=mid, frames=len(frames), digest=game.digest(), status=game.s["status"])
