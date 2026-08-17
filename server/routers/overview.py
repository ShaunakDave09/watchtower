import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query

from server import queries

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["overview"])

# Overview's funnel panel is a compact preview, not the full funnel — it
# only ever shows the first 5 stages (STAGE_ORDER 0-4). Kept as one constant
# here rather than a hardcoded slice so "which stages count as the preview"
# is visible in a single place and passed straight into the query (see
# fetch_funnel_steps's stage_orders) instead of being applied by slicing
# the full result list in Python.
FIRST_STAGES = [0, 1, 2, 3, 4]


@router.get("/filters")
def get_filters(
    # All optional and all None by default: with nothing selected yet, this
    # is just "give me every distinct value for every field." Once the
    # frontend has a selection, it re-calls this with whatever's picked so
    # far so downstream dropdowns only offer values that actually co-occur
    # with it — see fetch_filter_options's docstring for the cascade rules.
    business: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    sub_product: Optional[str] = Query(None, alias="subProduct"),
    journey: Optional[str] = Query(None),
    # version/month aren't part of the narrowing cascade (nothing comes after
    # version; month is a different table entirely) but they're still
    # *validated* against it, so they have to come in for the response's
    # `selection` to be a complete answer the client can apply in one go.
    version: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
) -> dict:
    # None means "the cascade query failed" — the fixture fallback below has
    # no authority to correct anyone's selection, so the client is told to
    # keep whatever it already had rather than being handed values derived
    # from data that isn't the warehouse's.
    selection: Optional[dict] = None
    try:
        resolved = queries.fetch_filter_options(
            business=business,
            product=product,
            sub_product=sub_product,
            journey=journey,
            version=version,
        )
        options = resolved["options"]
        selection = resolved["selection"]
    except Exception:
        # Only a genuine failure to run the query (DB unreachable, bad
        # credentials, etc.) falls back to the fixture. A query that runs
        # fine but comes back with a short list for some field further down
        # the cascade is a real, correct answer (e.g. "Retail" genuinely
        # only has two products) — not something to paper over with the
        # unfiltered fixture, which would silently break the cascade.
        logger.exception("fetch_filter_options failed, falling back to fixture filters")
        options = json.loads((FIXTURES_DIR / "filters.json").read_text())
    try:
        # Genuinely separate table/query from fetch_filter_options above, so
        # it gets its own try/except — a failure here shouldn't blank out an
        # otherwise-working business/product/.../version filter panel.
        options["month"] = queries.fetch_month_options()
    except Exception:
        logger.exception("fetch_month_options failed, falling back to fixture months")
        options["month"] = json.loads((FIXTURES_DIR / "filters.json").read_text())["month"]
    # Month is corrected here rather than in fetch_filter_options because its
    # options come from the monthly table, not the daily one the cascade
    # walks — but it's corrected the same way, and only when the cascade
    # itself succeeded (see `selection` above).
    if selection is not None:
        selection["month"] = queries.correct_selection("month", month, options["month"])
    try:
        # Bounds the date picker to the selected business/product/sub_product's
        # actual DATE span. Keyed off the *corrected* selection, not the raw
        # query params: if the caller sent a product that doesn't exist under
        # its business, the range for the corrected product is the one that
        # matches the options being returned alongside it. Falls back to the
        # raw params when the cascade query failed (nothing corrected them),
        # and to an empty range when all three still aren't known — e.g. the
        # very first call, before any defaults have settled.
        effective = selection or {}
        range_business = effective.get("business") or business
        range_product = effective.get("product") or product
        range_sub_product = effective.get("subProduct") or sub_product
        if range_business and range_product and range_sub_product:
            options["dateRange"] = queries.fetch_date_range(
                business=range_business, product=range_product, sub_product=range_sub_product
            )
        else:
            options["dateRange"] = {"min": None, "max": None}
    except Exception:
        logger.exception("fetch_date_range failed, falling back to fixture date range")
        options["dateRange"] = json.loads((FIXTURES_DIR / "filters.json").read_text())["dateRange"]
    return {**_with_all_option(options), "selection": selection}


# Journey, Version, and Month are the only fields the filter panel lets you
# leave unset (see queries.ALL_VALUE) — every other field always narrows the
# data, so it always needs one real pick. Adding "All" here, right before
# the response goes out, means the dropdown offers it regardless of whether
# the options came from the live query(ies) or a fixture fallback above,
# without either of those needing to know about UI presentation.
def _with_all_option(options: dict) -> dict:
    return {
        **options,
        "journey": [queries.ALL_VALUE, *options["journey"]],
        "version": [queries.ALL_VALUE, *options["version"]],
        "month": [queries.ALL_VALUE, *options["month"]],
    }


def _build_opportunity(steps: list[dict]) -> Optional[dict]:
    """Whichever stage-to-stage transition lost the most users (by
    dropPct), framed as a recovery opportunity — same "find the biggest
    swing" shape as insights.py's comparison callout, just phrased as
    "recovering half of this drop" instead of a gainer/decliner. None
    (leaving the fixture's opportunity text) if there's no real drop to
    point to.
    """
    candidates = [i for i in range(1, len(steps)) if steps[i].get("dropPct")]
    if not candidates:
        return None
    worst_i = max(candidates, key=lambda i: steps[i]["dropPct"])
    prev, worst = steps[worst_i - 1], steps[worst_i]
    lost = prev["users"] - worst["users"]
    if lost <= 0:
        return None
    recovered = round(lost / 2)
    return {
        "label": "BIGGEST OPPORTUNITY",
        "html": (
            f'Recovering half of the <b style="color:#e88a5f">{prev["label"]} → {worst["label"]}</b> drop '
            f'would add <b style="color:#e88a5f">~{recovered:,}</b> more users reaching {worst["label"]}.'
        ),
    }


@router.get("/overview")
def get_overview(
    business: str = Query(...),
    product: str = Query(...),
    sub_product: str = Query(..., alias="subProduct"),
    journey: str = Query(...),
    platform: str = Query(...),
    version: str = Query(...),
    month: str = Query(...),
    date: str = Query(...),
) -> dict:
    data = json.loads((FIXTURES_DIR / "overview.json").read_text())

    # name/meta-style fix, same as get_funnel_detail: the fixture's funnel
    # title ("Signup -> Paid funnel") never reflected the applied filters —
    # rebuild it from `product` regardless of whether the steps query below
    # succeeds, since it doesn't depend on that data.
    data["funnel"]["title"] = f"{product} funnel"

    # kpis/retention/timeToConvert stay on fixtures for now —
    # horizontal_summary_daily only backs the funnel stage breakdown (and,
    # from it, the opportunity callout below).
    try:
        steps = queries.fetch_funnel_steps(
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
        # The query itself failed to run (DB unreachable, bad table, etc.) —
        # we have nothing better than the fixture to show.
        logger.exception("fetch_funnel_steps failed, falling back to fixture steps")
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
        if steps:
            # The opportunity callout looks at the whole funnel, even
            # though the panel it sits next to only charts the first 5
            # stages below — it's a distinct insight card, not a caption
            # for that chart, so a drop further down the funnel than what's
            # visible there is still worth surfacing.
            opportunity = _build_opportunity(steps)
            if opportunity:
                data["opportunity"] = opportunity
        data["funnel"]["totalStages"] = len(steps)

        # The panel itself re-queries with stage_orders=FIRST_STAGES rather
        # than slicing `steps` here — the `WHERE "STAGE_ORDER" IN (0,1,2,3,4)`
        # restriction lives in the query (server/queries.py), not in this
        # app code, so the DB is the source of truth for which stages the
        # preview shows. The full breakdown is still one click away on
        # Funnel Detail (get_funnel_detail), which never passes stage_orders.
        # convPct is taken from *this* slice's own last stage so the "conv"
        # badge next to the chart always matches what the chart actually
        # ends on, not the true end-to-end number.
        try:
            visible_steps = queries.fetch_funnel_steps(
                business=business,
                product=product,
                sub_product=sub_product,
                journey=journey,
                platform=platform,
                version=version,
                month=month,
                date=date,
                stage_orders=FIRST_STAGES,
            )
        except Exception:
            logger.exception("fetch_funnel_steps (stage_orders-filtered) failed, using full-funnel slice")
            visible_steps = steps[:5]

        data["funnel"]["steps"] = visible_steps
        if visible_steps:
            data["funnel"]["convPct"] = f"{visible_steps[-1]['convPct']}%"
    return data
