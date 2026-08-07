import json
import logging
from pathlib import Path

from fastapi import APIRouter

from server import queries

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["funnels"])


@router.get("/funnels/{funnel_id}")
def get_funnel_detail(funnel_id: str) -> dict:
    funnels = json.loads((FIXTURES_DIR / "funnel_detail.json").read_text())
    data = funnels.get(funnel_id, funnels["guest-checkout"])
    # dropoffReasons/trend/comparison/userTable stay on fixtures for now —
    # horizontal_summary_daily only backs the stage breakdown.
    try:
        stages = queries.fetch_funnel_stages(funnel_id.replace("-", " "))
    except Exception:
        logger.exception("fetch_funnel_stages failed, falling back to fixture stages")
        stages = None
    # See the matching comment in overview.py: `is not None` (not a
    # truthiness check) so a query that legitimately matched zero rows
    # ("no data for this journey") is shown as-is instead of being masked
    # by the fixture.
    if stages is not None:
        data["stages"] = stages
    return data
