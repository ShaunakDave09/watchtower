import json
from pathlib import Path

from fastapi import APIRouter

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/filters")
def get_filters() -> dict:
    return json.loads((FIXTURES_DIR / "filters.json").read_text())


@router.get("/overview")
def get_overview() -> dict:
    # Mock data is static regardless of filters for now; scoping KPIs/funnel/
    # retention to query params is a follow-up once real data is wired in.
    return json.loads((FIXTURES_DIR / "overview.json").read_text())
