import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from server import queries

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["funnels"])


@router.get("/funnels/{funnel_id}")
def get_funnel_detail(funnel_id: str, journey: str | None = Query(None)) -> dict:
    funnels = json.loads((FIXTURES_DIR / "funnel_detail.json").read_text())
    data = funnels.get(funnel_id, funnels["guest-checkout"])
    # dropoffReasons/trend/comparison/userTable stay on fixtures for now —
    # horizontal_summary_daily only backs the stage breakdown.
    #
    # `journey` is the real, cascade-verified Journey_name value the
    # frontend's filter bar has selected (same value fetch_filter_options
    # handed it, so it's guaranteed to exist in the table). Prefer that over
    # guessing a name from the URL slug: funnel_id.replace("-", " ") only
    # coincidentally matches Journey_name, and a mismatch here silently
    # zeroes out the whole stage breakdown (0 rows -> data["stages"] = []),
    # not a query error, so it never hit the except branch below. Callers
    # that don't pass journey (e.g. a bare API request) still get the old
    # best-effort slug guess.
    try:
        stages = queries.fetch_funnel_stages(journey or funnel_id.replace("-", " "))
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
