import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from server import queries

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/filters")
def get_filters(
    # All optional and all None by default: with nothing selected yet, this
    # is just "give me every distinct value for every field." Once the
    # frontend has a selection, it re-calls this with whatever's picked so
    # far so downstream dropdowns only offer values that actually co-occur
    # with it — see fetch_filter_options's docstring for the cascade rules.
    business: str | None = Query(None),
    product: str | None = Query(None),
    sub_product: str | None = Query(None, alias="subProduct"),
    journey: str | None = Query(None),
) -> dict:
    try:
        return queries.fetch_filter_options(
            business=business, product=product, sub_product=sub_product, journey=journey
        )
    except Exception:
        # Only a genuine failure to run the query (DB unreachable, bad
        # credentials, etc.) falls back to the fixture. A query that runs
        # fine but comes back with a short list for some field further down
        # the cascade is a real, correct answer (e.g. "Retail" genuinely
        # only has two products) — not something to paper over with the
        # unfiltered fixture, which would silently break the cascade.
        logger.exception("fetch_filter_options failed, falling back to fixture filters")
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
        # The query itself failed to run (DB unreachable, bad table, etc.) —
        # we have nothing better than the fixture to show.
        logger.exception("fetch_overview_funnel_steps failed, falling back to fixture steps")
        steps = None
    # `steps is not None` (rather than a truthiness check on `steps`) is the
    # important bit here: a query that ran fine but matched zero rows for
    # this exact filter combination returns `[]`, and that's a real, useful
    # answer — "no data for this selection" — not a failure. Truthiness
    # would treat `[]` the same as "the query blew up" and silently keep
    # showing the fixture's numbers no matter what filters were picked,
    # which is exactly the bug where changing filters looked like it did
    # nothing to the funnel.
    if steps is not None:
        data["funnel"]["steps"] = steps
    return data
