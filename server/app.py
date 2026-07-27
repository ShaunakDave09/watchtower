import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from server.routers import funnels, overview

CLIENT_DIST = Path(__file__).resolve().parent.parent / "client" / "dist"

app = FastAPI(title="Watchtower")

app.include_router(overview.router)
app.include_router(funnels.router)

if CLIENT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=CLIENT_DIST / "assets"), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon() -> FileResponse:
        return FileResponse(CLIENT_DIST / "favicon.svg")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        return FileResponse(CLIENT_DIST / "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("DATABRICKS_APP_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
