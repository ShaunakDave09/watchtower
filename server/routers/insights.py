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


# Small, fixed palette to color an arbitrary number of adjacent-stage
# transitions — real stage counts vary a lot by filter combo (this app has
# shown anywhere from ~4 to 13 stages depending on business/product/journey/
# version), so a hardcoded one-color-per-named-transition list (like the
# fixture's) doesn't generalize. Cycles if there are more transitions than
# colors.
_TREND_COLORS = [
    "var(--color-accent)",
    "var(--color-warning)",
    "var(--color-success)",
    "#8a5fe8",
    "#5f9ee8",
    "#c9a68a",
]

def _fmt_hour_label(hour: int) -> str:
    """0 -> "12am", 14 -> "2pm" — mirrors PacingChart.tsx's own hourLabel()
    so backend- and frontend-formatted hours never disagree."""
    h = 12 if hour % 12 == 0 else hour % 12
    return f"{h}{'am' if hour < 12 else 'pm'}"


def _build_stage_trend(buckets: list[dict], labels: list[str]) -> dict:
    """One series per stage (not transition) — raw user counts reaching
    that stage per bucket, for the Stage-wise trends chart. `buckets` is
    either fetch_conversion_trend's per-day output (Daily mode) or
    fetch_hourly_funnel_steps' per-hour output for a single day (Hourly
    mode) — both are `[{"steps": [...]}, ...]` in chronological order, so
    the same builder works for either; `labels` carries whatever axis text
    (dates or hour-of-day strings) matches that ordering.

    Same reference-stage-order / zero-fill-if-missing reasoning either way:
    the *reference* stage order is the most recent bucket's stage list, and
    a bucket missing one of those stages entirely (no rows, not a real
    zero) contributes 0 users for it — real information, not a gap.
    """
    reference_labels = [s["label"] for s in buckets[-1]["steps"]]
    per_bucket_users = [{s["label"]: s["users"] for s in b["steps"]} for b in buckets]

    series = []
    for i, label in enumerate(reference_labels):
        values = [bucket_users.get(label, 0) for bucket_users in per_bucket_users]
        series.append(
            {
                "key": f"stage{i}",
                "label": label,
                "color": _TREND_COLORS[i % len(_TREND_COLORS)],
                "values": values,
                "endLabel": f"{values[-1]:,}",
            }
        )

    return {"dates": labels, "series": series}


def _build_conversion_trend(buckets: list[dict], labels: list[str]) -> dict:
    """One series per adjacent stage-to-stage transition, plus one overall
    first-stage-to-last-stage series — every real transition, per the
    "matches the original spirit most closely" choice over a fixed 1-2-line
    chart, since a real deep funnel can have many more than the fixture's 4
    stages. See _build_stage_trend for what `buckets`/`labels` are (Daily
    vs. Hourly mode both flow through here the same way).
    """
    reference_labels = [s["label"] for s in buckets[-1]["steps"]]
    per_bucket_users = [{s["label"]: s["users"] for s in b["steps"]} for b in buckets]

    def transition_values(prev_label: str, cur_label: str) -> list[float]:
        values = []
        for bucket_users in per_bucket_users:
            prev_users = bucket_users.get(prev_label, 0)
            cur_users = bucket_users.get(cur_label, 0)
            values.append(round(cur_users / prev_users * 100, 1) if prev_users else 0.0)
        return values

    series = []
    for i in range(1, len(reference_labels)):
        prev_label, cur_label = reference_labels[i - 1], reference_labels[i]
        values = transition_values(prev_label, cur_label)
        series.append(
            {
                "key": f"stage{i - 1}to{i}",
                "label": f"{prev_label}→{cur_label}",
                "color": _TREND_COLORS[(i - 1) % len(_TREND_COLORS)],
                "values": values,
                "endLabel": f"{values[-1]:g}%",
            }
        )

    if len(reference_labels) >= 2:
        values = transition_values(reference_labels[0], reference_labels[-1])
        series.append(
            {
                "key": "overall",
                "label": f"{reference_labels[0]}→{reference_labels[-1]}",
                "color": "#8a7c65",
                "values": values,
                "endLabel": None,
            }
        )

    return {"dates": labels, "series": series}


def _step_conv_pct(steps: list[dict]) -> float:
    """End-to-end conversion % for one bucket's step list (last stage's
    users as a % of the first) — 0 for an empty or all-zero-first-stage
    bucket rather than dividing by zero."""
    if not steps:
        return 0.0
    first = steps[0]["users"]
    return round(steps[-1]["users"] / first * 100, 1) if first else 0.0


def _build_hourly_throughput(today_buckets: list[dict], band_by_hour: dict[int, list[float]]) -> dict:
    """entrants/convRate for each hour of the selected date that actually
    has data, plus an expected [low, high] band per hour — the min/max
    conv% seen at that same hour across the trailing 7 days
    (`band_by_hour`, built by the caller from the rest of the 8-day
    fetch). A day that isn't fully "over" yet just ends up with fewer
    entries in every array — same "only real buckets" reasoning as
    everywhere else on this page, and HourlyThroughputChart already treats
    the last bar as "Now" regardless of how many bars there are.
    """
    hours = [b["hour"] for b in today_buckets]
    entrants = [b["steps"][0]["users"] if b["steps"] else 0 for b in today_buckets]
    conv_rate = [_step_conv_pct(b["steps"]) for b in today_buckets]
    expected_low = []
    expected_high = []
    for h, cr in zip(hours, conv_rate):
        band = band_by_hour.get(h)
        # No trailing data at all for this hour (e.g. a brand-new filter
        # combo) -> collapse the band to the current value instead of
        # crashing on min()/max() of an empty list.
        expected_low.append(min(band) if band else cr)
        expected_high.append(max(band) if band else cr)

    last_label = _fmt_hour_label(hours[-1]) if hours else "12am"
    return {
        "liveLabel": f"THROUGH {last_label.upper()}",
        "tickLabels": ["12am", "4am", "8am", "12pm", "4pm", "8pm", "Now"],
        "entrants": entrants,
        "convRate": conv_rate,
        "expectedLow": expected_low,
        "expectedHigh": expected_high,
        "alertHtml": _build_hourly_alert(conv_rate, expected_low),
    }


def _build_hourly_alert(conv_rate: list[float], expected_low: list[float]) -> Optional[str]:
    """Red-banner alert text when the last 3 real hours have all come in
    under that hour's own expected-low bound — None (no banner at all)
    otherwise, rather than showing a box with nothing wrong to report."""
    if len(conv_rate) < 3:
        return None
    last3, low3 = conv_rate[-3:], expected_low[-3:]
    if not all(last3[i] < low3[i] for i in range(3)):
        return None
    avg_low = round(sum(low3) / 3, 1)
    return (
        f"Conversion rate has been below the last 7d avg for the last <strong>3 hours</strong> "
        f"— down to <strong>{last3[-1]:g}%</strong> vs. a ~{avg_low:g}% average."
    )


def _project_remaining_hours(today_conv: list[float], current_hour: int) -> list[float]:
    """Naive trend projection for the hours of the day that haven't
    happened yet: extends the average hour-over-hour change from the last
    few real hours forward, clamped to [0, 100]. Good enough for "trending
    toward ~X% by end of day" — not a real forecasting model, same spirit
    as the rest of this endpoint's derived numbers."""
    remaining = 23 - current_hour
    if remaining <= 0 or not today_conv:
        return []
    window = today_conv[-4:] if len(today_conv) >= 4 else today_conv
    slope = (window[-1] - window[0]) / (len(window) - 1) if len(window) >= 2 else 0.0
    values = []
    last = today_conv[-1]
    for _ in range(remaining):
        last = max(0.0, min(100.0, last + slope))
        values.append(round(last, 1))
    return values


def _build_pacing(today_buckets: list[dict], yesterday_buckets: list[dict]) -> dict:
    """Today vs. yesterday's hour-by-hour end-to-end conversion, plus a
    projection for the rest of today — backs the "Today's pacing" panel.
    """
    today_conv = [_step_conv_pct(b["steps"]) for b in today_buckets]
    yesterday_conv = [_step_conv_pct(b["steps"]) for b in yesterday_buckets]
    current_hour = today_buckets[-1]["hour"] if today_buckets else 0
    now_value = today_conv[-1] if today_conv else 0.0

    if current_hour < len(yesterday_conv):
        now_delta = f"{_point_delta_str(now_value, yesterday_conv[current_hour])} vs. yesterday"
    else:
        now_delta = "No comparable data for yesterday"

    projection = _project_remaining_hours(today_conv, current_hour)
    projection_text = (
        f"Trending toward ~{projection[-1]:g}% by end of day" if projection else "Day complete"
    )

    return {
        "currentHour": current_hour,
        "today": today_conv,
        "yesterday": yesterday_conv,
        "projection": projection,
        "nowValue": now_value,
        "nowDelta": now_delta,
        "projectionText": projection_text,
    }


@router.get("/trends")
def get_trends(
    # Same filter set Funnel Detail sends (minus `month` — this endpoint
    # always queries the daily table directly rather than switching to the
    # monthly one; there's no range picker anymore, see the window
    # comment below).
    business: str = Query(...),
    product: str = Query(...),
    sub_product: str = Query(..., alias="subProduct"),
    journey: str = Query(...),
    platform: str = Query(...),
    version: str = Query(...),
    date: str = Query(...),
) -> dict:
    data = json.loads((FIXTURES_DIR / "trends.json").read_text())

    # The daily window is fixed at the selected date +/- 15 days (31 days
    # total) rather than a user-picked range: centering on the filter
    # panel's own date keeps this consistent with every other page, which
    # already treats that date as the anchor "today."
    y, m, d = (int(p) for p in date.split("-"))
    center = date_cls(y, m, d)
    start = center - timedelta(days=15)
    end = center + timedelta(days=15)

    try:
        daily = queries.fetch_conversion_trend(
            business=business,
            product=product,
            sub_product=sub_product,
            journey=journey,
            platform=platform,
            version=version,
            start_date=start.isoformat(),
            end_date=end.isoformat(),
        )
    except Exception:
        logger.exception("fetch_conversion_trend failed, falling back to fixture conversion trend")
        daily = None

    # `daily` (not `is not None`) deliberately: an empty list means the
    # query ran fine but matched nothing across the whole window, and
    # there's no sensible reference stage list or date axis to build either
    # chart from in that case — same "nothing to compare against" reasoning
    # as the empty-one-side case in get_funnel_comparison, just with no
    # other side to fall back on here.
    if daily:
        daily_labels = [_fmt_date_label(b["date"])[1] for b in daily]
        data["conversionTrend"] = _build_conversion_trend(daily, daily_labels)
        data["stageTrend"] = _build_stage_trend(daily, daily_labels)
        _, short_start = _fmt_date_label(start.isoformat())
        _, short_end = _fmt_date_label(end.isoformat())
        data["subtitle"] = f"FUNNEL-WIDE + ENTRY-POINT TRENDS · {short_start.upper()} – {short_end.upper()}"

    # One 8-day (selected date and the 7 days before it) hourly fetch backs
    # everything hour-of-day on this page: the selected date's own buckets
    # back Hourly throughput, Hourly mode on the two trend charts above,
    # and "today" in Today's pacing; the day right before it backs
    # "yesterday"; the other 6 back the trailing-7-day-same-hour band.
    try:
        hourly = queries.fetch_hourly_funnel_steps(
            business=business,
            product=product,
            sub_product=sub_product,
            journey=journey,
            platform=platform,
            version=version,
            start_date=(center - timedelta(days=7)).isoformat(),
            end_date=date,
        )
    except Exception:
        logger.exception("fetch_hourly_funnel_steps failed, falling back to fixture hourly data")
        hourly = None

    if hourly:
        today_buckets = [b for b in hourly if b["date"] == date]
        yesterday_date = (center - timedelta(days=1)).isoformat()
        yesterday_buckets = [b for b in hourly if b["date"] == yesterday_date]

        # Trailing-7-day-same-hour band: every bucket that isn't today,
        # grouped by hour (yesterday's included — it's part of "the last 7
        # days" for this purpose even though it's *also* its own line on
        # the pacing chart, two different questions about the same data).
        band_by_hour: dict[int, list[float]] = {}
        for b in hourly:
            if b["date"] == date:
                continue
            band_by_hour.setdefault(b["hour"], []).append(_step_conv_pct(b["steps"]))

        # today_buckets (not `hourly`) deliberately: there's no reference
        # stage list / hour axis to build Hourly-mode charts or throughput
        # from if the selected date itself has no data, even if the
        # trailing days do.
        if today_buckets:
            hour_labels = [_fmt_hour_label(b["hour"]) for b in today_buckets]
            data["hourlyConversionTrend"] = _build_conversion_trend(today_buckets, hour_labels)
            data["hourlyStageTrend"] = _build_stage_trend(today_buckets, hour_labels)
            data["hourly"] = _build_hourly_throughput(today_buckets, band_by_hour)
            data["pacing"] = _build_pacing(today_buckets, yesterday_buckets)

    return data


@router.get("/alerts")
def get_alerts() -> dict:
    return json.loads((FIXTURES_DIR / "alerts.json").read_text())
