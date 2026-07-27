import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from server import queries

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/filters")
def get_filters() -> dict:
    return json.loads((FIXTURES_DIR / "filters.json").read_text())


@router.get("/overview")
def get_overview(
    business: str = Query(...),
    product: str = Query(...),
    sub_product: str = Query(..., alias="subProduct"),
    journey: str = Query(...),
    platform: str = Query(...),
    version: str = Query(...),
    date_from: str = Query(..., alias="from"),
    date_to: str = Query(..., alias="to"),
) -> dict:
    data = json.loads((FIXTURES_DIR / "overview.json").read_text())
    # kpis/retention/timeToConvert/opportunity stay on fixtures for now —
    # horizontal_summary_daily only backs the funnel stage breakdown.
    try:
        steps = queries.fetch_overview_funnel_steps(
            business=business,
            product=product,
            sub_product=sub_product,
            journey=journey,
            platform=platform,
            version=version,
            date_from=date_from,
            date_to=date_to,
        )
    except Exception:
        logger.exception("fetch_overview_funnel_steps failed, falling back to fixture steps")
        steps = []
    if steps:
        data["funnel"]["steps"] = steps
    return data
