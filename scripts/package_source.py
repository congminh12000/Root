"""Create a portable source bundle without installed runtimes or live SQLite files."""
from pathlib import Path
import zipfile


root = Path(__file__).resolve().parents[1]
destination = root.parent / "root-source.zip"
excluded = {".git", ".venv", "node_modules", "__pycache__", ".pytest_cache", ".ruff_cache"}
data_files = {".gitkeep", "candidate-final.pt", "evaluation.jsonl", "evaluation.config.json", "evaluation.summary.json"}
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if not path.is_file() or excluded.intersection(relative.parts):
            continue
        if path.suffix in (".pyc", ".log", ".tsbuildinfo"):
            continue
        if relative.parts[0] == "data" and path.name not in data_files:
            continue
        archive.write(path, Path(root.name) / relative)
print(destination)
