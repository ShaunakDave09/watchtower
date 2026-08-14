import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from server import queries

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["funnels"])


@router.get("/funnels/{funnel_id}")
def get_funnel_detail(
    funnel_id: str,
    # Same filter set Overview sends, and the same set the Filters
    # button/bar on this page already displays as "ACTIVE" — see the
    # matching params on get_overview. Required (not Optional/None) because
    # the frontend's FiltersContext always has a value for every one of
    # these (real once options load, sane defaults before that), and a
    # request missing one is exactly the "filter panel not actually wired
    # up" bug this replaces.
    business: str = Query(...),
    product: str = Query(...),
    sub_product: str = Query(..., alias="subProduct"),
    journey: str = Query(...),
    platform: str = Query(...),
    version: str = Query(...),
    month: str = Query(...),
    date: str = Query(...),
) -> dict:
    funnels = json.loads((FIXTURES_DIR / "funnel_detail.json").read_text())
    data = funnels.get(funnel_id, funnels["guest-checkout"])
    # dropoffReasons/trend/comparison/userTable stay on fixtures for now —
    # horizontal_summary_daily only backs the stage breakdown.
    try:
        stages = queries.fetch_funnel_steps(
            business=business,
            product=product,
            sub_product=sub_product,
            journey=journey,
            platform=platform,
            version=version,
            month=month,
            date=date,
        )
    except Exception:
        logger.exception("fetch_funnel_steps failed, falling back to fixture stages")
        stages = None
    # See the matching comment in overview.py: `is not None` (not a
    # truthiness check) so a query that legitimately matched zero rows
    # ("no data for this filter combination") is shown as-is instead of
    # being masked by the fixture.
    if stages is not None:
        data["stages"] = stages
    return data
