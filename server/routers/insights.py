import calendar
import json
import logging
from datetime import date as date_cls, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from server import queries
from server.entrypoint_detail import build_source_detail

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["insights"])


@router.get("/funnels/{funnel_id}/entrypoints")
def get_funnel_entrypoints(funnel_id: str) -> dict:
    entrypoints = json.loads((FIXTURES_DIR / "entrypoints.json").read_text())
    return entrypoints.get(funnel_id, entrypoints["guest-checkout"])


@router.get("/funnels/{funnel_id}/entrypoints/{source_id}")
def get_entrypoint_source_detail(funnel_id: str, source_id: str) -> dict:
    entrypoints = json.loads((FIXTURES_DIR / "entrypoints.json").read_text())
    funnel = entrypoints.get(funnel_id, entrypoints["guest-checkout"])
    source = next((s for s in funnel["bySource"] if s["id"] == source_id), None)
    if source is None:
        raise HTTPException(status_code=404, detail=f"Unknown entry point source: {source_id}")
    return build_source_detail(funnel_id, funnel["funnelName"], source)


# Quick-compare pill labels the frontend offers (comparison.json's
# quickCompare list, sent back verbatim as `compare`) mapped to a calendar
# offset from the selected date. "Yesterday"/"Same day last week" are plain
# day offsets; "last month"/"last quarter" step back whole months, clamping
# to the shifted month's real last day (e.g. Mar 31 -> Feb 28/29) instead of
# overflowing into the month after. "Custom date…" has no date-picker UI
# behind it yet (out of scope for now), so it — and any other unrecognized
# label — falls back to the same one-month-back behavior rather than
# erroring.
def _shift_compare_date(iso_date: str, quick_compare: str) -> str:
    y, m, d = (int(p) for p in iso_date.split("-"))
    base = date_cls(y, m, d)
    if quick_compare == "Yesterday":
        return (base - timedelta(days=1)).isoformat()
    if quick_compare == "Same day last week":
        return (base - timedelta(days=7)).isoformat()
    months_back = 3 if quick_compare == "Same day last quarter" else 1
    total_months = (y * 12 + (m - 1)) - months_back
    ny, nm0 = divmod(total_months, 12)
    nm = nm0 + 1
    last_day_of_month = calendar.monthrange(ny, nm)[1]
    return date_cls(ny, nm, min(d, last_day_of_month)).isoformat()


def _fmt_date_label(iso_date: str) -> tuple[str, str]:
    """(full "Jul 27, 2026", short "Jul 27") display labels for an ISO date."""
    y, m, d = (int(p) for p in iso_date.split("-"))
    dt = date_cls(y, m, d)
    return dt.strftime("%b %-d, %Y"), dt.strftime("%b %-d")


def _count_delta_str(a: int, b: int) -> str:
    """e.g. 24810 vs. 22150 -> \"▲12%\" — a plain percent change, no decimal,
    matching how the fixture already formatted the VISITED KPI's delta."""
    pct = 0 if b == 0 else round((a - b) / b * 100)
    return f"{'▲' if pct >= 0 else '▼'}{abs(pct)}%"


def _point_delta_str(a: float, b: float) -> str:
    """e.g. 19.4 vs. 15.2 -> \"▲4.2pt\" — a percentage-point difference, for
    KPIs that are already percentages (conversion rate, drop-off)."""
    diff = round(a - b, 1)
    return f"{'▲' if diff >= 0 else '▼'}{abs(diff):g}pt"


def _tone(a: float, b: float, *, higher_is_better: bool) -> str:
    if a == b:
        return "flat"
    favorable = (a > b) if higher_is_better else (a < b)
    return "up-good" if favorable else "up-bad"


def _build_callout(steps_a: list[dict], steps_b: list[dict], date_b_short: str) -> Optional[str]:
    """Find the single stage-to-stage transition whose drop-off changed the
    most between the two dates and describe it — the same "biggest
    gainer/decliner" framing the fixture used, computed from the two real
    step lists instead of hand-written. Returns None (leaving whatever
    calloutHtml the fixture already had) if the funnels don't overlap
    enough to compare even one transition.
    """
    n = min(len(steps_a), len(steps_b))
    if n < 2:
        return None
    best_i = 1
    best_swing = 0.0
    for i in range(1, n):
        drop_a = steps_a[i]["dropPct"] or 0.0
        drop_b = steps_b[i]["dropPct"] or 0.0
        swing = drop_b - drop_a  # positive = this date's drop-off is lower (better) than the comparison date's
        if abs(swing) > abs(best_swing):
            best_i, best_swing = i, swing
    if best_swing == 0:
        return None
    verb = "gainer" if best_swing > 0 else "decliner"
    direction = "up" if best_swing > 0 else "down"
    transition = f"{steps_a[best_i - 1]['label']} → {steps_a[best_i]['label']}"
    return (
        f'<b style="color:#e88a5f">{transition}</b> is the biggest {verb} vs. {date_b_short}, '
        f'{direction} <b style="color:#e88a5f">{abs(round(best_swing, 1)):g}pt</b>.'
    )


@router.get("/funnels/{funnel_id}/compare")
def get_funnel_comparison(
    funnel_id: str,
    # Same filter set Funnel Detail sends (see get_funnel_detail) — this
    # page compares two single days for one filter combination, so there's
    # no `month` param (that's a different, coarser query path entirely;
    # see fetch_month_funnel_steps).
    business: str = Query(...),
    product: str = Query(...),
    sub_product: str = Query(..., alias="subProduct"),
    journey: str = Query(...),
    platform: str = Query(...),
    version: str = Query(...),
    date: str = Query(...),
    compare: str = Query("Same day last month"),
) -> dict:
    comparisons = json.loads((FIXTURES_DIR / "comparison.json").read_text())
    data = comparisons.get(funnel_id, comparisons["guest-checkout"])
    data["funnelId"] = funnel_id
    data["activeQuickCompare"] = compare

    date_b = _shift_compare_date(date, compare)
    try:
        steps_a = queries.fetch_overview_funnel_steps(
            business=business, product=product, sub_product=sub_product,
            journey=journey, platform=platform, version=version, date=date,
        )
        steps_b = queries.fetch_overview_funnel_steps(
            business=business, product=product, sub_product=sub_product,
            journey=journey, platform=platform, version=version, date=date_b,
        )
    except Exception:
        logger.exception("fetch_overview_funnel_steps failed for comparison, falling back to fixture")
        steps_a = steps_b = None

    # `is not None` (not a truthiness check), same reasoning as
    # funnels.py/overview.py: a query that ran fine but matched zero rows
    # for one of the two dates is real information — that date genuinely
    # has no data for this filter combination — so the dates/funnels below
    # still get replaced (FunnelChart already renders an empty steps list
    # as "No data for this filter selection"). KPIs/callout are gated
    # separately (`steps_a and steps_b`) since there's nothing sensible to
    # compare against an empty side.
    if steps_a is not None and steps_b is not None:
        label_a, short_a = _fmt_date_label(date)
        label_b, short_b = _fmt_date_label(date_b)
        conv_a = steps_a[-1]["convPct"] if steps_a else 0
        conv_b = steps_b[-1]["convPct"] if steps_b else 0
        data["dateA"] = {"label": label_a, "short": short_a}
        data["dateB"] = {"label": label_b, "short": short_b}
        data["funnelA"] = {"dateLabel": short_a, "convPct": f"{conv_a}%", "steps": steps_a}
        data["funnelB"] = {"dateLabel": short_b, "convPct": f"{conv_b}%", "steps": steps_b}

        if steps_a and steps_b:
            users_a, users_b = steps_a[0]["users"], steps_b[0]["users"]
            dropoff_a, dropoff_b = round(100 - conv_a, 1), round(100 - conv_b, 1)

            # kpis[3] (TIME TO CONVERT) has no backing query anywhere yet —
            # no table carries per-user timing data — so it's left exactly
            # as the fixture had it instead of being faked from step counts.
            data["kpis"][0] = {
                "label": "VISITED",
                "value": f"{users_a:,}",
                "delta": _count_delta_str(users_a, users_b),
                "deltaTone": _tone(users_a, users_b, higher_is_better=True),
                "sub": f"vs. {users_b:,} on {short_b}",
            }
            data["kpis"][1] = {
                "label": "CONVERSION RATE",
                "value": f"{conv_a}%",
                "delta": _point_delta_str(conv_a, conv_b),
                "deltaTone": _tone(conv_a, conv_b, higher_is_better=True),
                "sub": f"vs. {conv_b}% on {short_b}",
            }
            data["kpis"][2] = {
                "label": "TOTAL DROP-OFF",
                "value": f"{dropoff_a}%",
                "delta": _point_delta_str(dropoff_a, dropoff_b),
                "deltaTone": _tone(dropoff_a, dropoff_b, higher_is_better=False),
                "sub": f"vs. {dropoff_b}% on {short_b}",
            }

            callout = _build_callout(steps_a, steps_b, short_b)
            if callout:
                data["calloutHtml"] = callout

    return data


@router.get("/trends")
def get_trends() -> dict:
    return json.loads((FIXTURES_DIR / "trends.json").read_text())


@router.get("/alerts")
def get_alerts() -> dict:
    return json.loads((FIXTURES_DIR / "alerts.json").read_text())
