# Dependencies and original content

Runtime dependencies are installed from public package registries and run locally.
Their own LICENSE / NOTICE files remain authoritative and are retained in installed packages.

| Component | Upstream | License |
|---|---|---|
| React / React DOM | https://github.com/facebook/react | MIT |
| PixiJS | https://github.com/pixijs/pixijs | MIT |
| Vite | https://github.com/vitejs/vite | MIT |
| TypeScript | https://github.com/microsoft/TypeScript | Apache-2.0 |
| FastAPI | https://github.com/fastapi/fastapi | MIT |
| Uvicorn | https://github.com/encode/uvicorn | BSD-3-Clause |
| Starlette | https://github.com/encode/starlette | BSD-3-Clause |
| Pydantic | https://github.com/pydantic/pydantic | MIT |
| websockets | https://github.com/python-websockets/websockets | BSD-3-Clause |
| PyTorch | https://github.com/pytorch/pytorch | BSD-style; bundled components retain their notices |
| NumPy | https://github.com/numpy/numpy | BSD-3-Clause |
| SQLite (Python stdlib binding) | https://sqlite.org | Public domain engine |

Testing/lint/build packages are development tools; consult the npm and Python lockfiles for exact versions. The application uses only locally installed fonts (Georgia, Times New Roman, Courier New) and requires no font downloads.

The map background `web/src/assets/woodland-reference.png` is the exact image supplied by the user on 30 October 2026, included without pixel changes. It replaces the procedural landscape. Faction insignia and the optional game overlays are authored as code/SVG in this project. No other images, sound, typefaces or text were extracted from Root Digital or Root Database. Root and its faction names are used only in research documentation to identify the reference rules. This project has no claimed affiliation or endorsement.
