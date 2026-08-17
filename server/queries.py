import logging
import os
import threading
import time
from typing import Optional

from psycopg.rows import dict_row
from server import db

logger = logging.getLogger(__name__)


# schema.table of the Lakebase-synced copy of
# bfl_std_lake.digital360.horizontal_summary_daily
HORIZONTAL_SUMMARY_TABLE = os.environ.get(
    "HORIZONTAL_SUMMARY_TABLE", "digital360.business_funnel_daily"
)

# Same dimension columns as HORIZONTAL_SUMMARY_TABLE (business, product,
# sub_product, journey, entrypoint_stage/version, ep_platform), but rows are
# pre-aggregated per calendar month (PARTITIONCOL, a "YYYYMM" string/int)
# instead of per day. Backs the Month filter: picking a month queries this
# table directly rather than summing the daily table over that month's date
# range — a genuinely separate, coarser data path (see fetch_month_funnel_steps).
MONTHLY_SUMMARY_TABLE = os.environ.get(
    "MONTHLY_SUMMARY_TABLE", "digital360.business_funnel_monthly"
)

# Same dimension columns and grain as HORIZONTAL_SUMMARY_TABLE, plus one
# more: an "HOUR" column (0-23). Backs every hour-of-day view on the Trends
# page (Hourly throughput, Today's pacing, and Hourly mode on the two daily
# trend charts) — none of that existed for real until this table did.
HOURLY_SUMMARY_TABLE = os.environ.get(
    "HOURLY_SUMMARY_TABLE", "digital360.business_funnel_hourly"
)

# Same dimension columns as HORIZONTAL_SUMMARY_TABLE, plus ENTRYPOINT_GROUP
# (which entrypoint_group a session came in through) and five pre-computed
# percentage columns: PDP_VIEW_PCT / PDP_CLICK_PCT / FORM1_VIEW_PCT /
# FORM1_CLICK_PCT (that group's own 4-stage funnel, each a % of that group's
# own entered sessions — same "cumulative % of the first stage" shape as
# convPct elsewhere, not stage-to-stage) and PDP_VIEW_EP_CONTRI_PCT (this
# group's % contribution to the *total* PDP views across every group).
# Backs the Entrypoint Performance page end to end. This table is
# session-level, not user-level — the raw count column is still named
# "users" (same as every other table here), but counts sessions, not
# deduplicated users, hence that page labeling everything "sessions".
ENTRYPOINT_FUNNEL_TABLE = os.environ.get(
    "ENTRYPOINT_FUNNEL_TABLE", "digital360.entrypoint_wise_funnel"
)

# Sentinel for "don't filter on this field" — only offered for Journey and
# Version. Unlike business/product/sub_product (which narrow which data
# exists at all and always need a real pick), journey and version are
# optional refinements: the filter panel defaults to this rather than
# auto-selecting an arbitrary real journey/version, so the dashboard starts
# aggregated across all of them until the user picks a specific one.
ALL_VALUE = "All"

# The three fields the filter panel lets you leave unset (journey/version/
# month). ALL_VALUE is always a legitimate selection for them, so cascade
# resolution must never "correct" it away to an arbitrary real value the way
# it does for a genuinely invalid pick.
OPTIONAL_FILTER_KEYS = frozenset({"journey", "version", "month"})

# Every filter dropdown's option list is a DISTINCT scan over the daily
# table, and the lists are near-static: which businesses/products exist
# changes when the warehouse gets new data, not between two clicks a second
# apart. The topmost one (business) isn't even narrowed by anything, so it's
# the same full-table DISTINCT on every single call. Caching them per
# (column, upstream-selection) for a few minutes is what keeps opening the
# filter modal from re-scanning the fact table once per dropdown.
FILTER_OPTIONS_CACHE_TTL_SECONDS = float(
    os.environ.get("FILTER_OPTIONS_CACHE_TTL_SECONDS", "300")
)
_filter_cache: dict[tuple, tuple[float, object]] = {}
_filter_cache_lock = threading.Lock()

# Sentinel distinguishing "cached value is None/empty" from "not cached" —
# a plain `if cached:` would re-query every time a field legitimately has no
# options, which is exactly the combination that's slowest to discover.
_CACHE_MISS = object()


def clear_filter_options_cache() -> None:
    """Drop every cached dropdown list / date range. Nothing in the app calls
    this during normal operation — it exists so a test (or a REPL session) can
    force the next lookup to hit Postgres again instead of waiting out the
    TTL."""
    with _filter_cache_lock:
        _filter_cache.clear()


def _cache_get(key: tuple):
    with _filter_cache_lock:
        cached = _filter_cache.get(key)
        if cached is not None and time.monotonic() - cached[0] < FILTER_OPTIONS_CACHE_TTL_SECONDS:
            return cached[1]
    return _CACHE_MISS


def _cache_put(key: tuple, value: object) -> None:
    with _filter_cache_lock:
        _filter_cache[key] = (time.monotonic(), value)


def _distinct_column_options(cur, column: str, upstream: list[tuple[str, str]]) -> list[str]:
    """DISTINCT non-null values of `column`, narrowed by `upstream` (already-
    resolved (column, value) pairs from higher in the cascade), memoized for
    FILTER_OPTIONS_CACHE_TTL_SECONDS.

    upper()/upper() on both sides for the same reason as the funnel-steps
    queries: a value selected earlier in the cascade can be cased differently
    from the row that's actually in the table.
    """
    key = ("distinct", column, tuple(upstream))
    cached = _cache_get(key)
    if cached is not _CACHE_MISS:
        return cached  # type: ignore[return-value]

    where_clauses = [f'"{column}" IS NOT NULL']
    params: dict[str, str] = {}
    for i, (upstream_column, value) in enumerate(upstream):
        param_name = f"upstream_{i}"
        where_clauses.append(f'upper("{upstream_column}") = upper(%({param_name})s)')
        params[param_name] = value

    cur.execute(
        f"""
        SELECT DISTINCT "{column}"
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE {" AND ".join(where_clauses)}
        ORDER BY "{column}"
        """,
        params,
    )
    values = [row[0] for row in cur.fetchall()]
    _cache_put(key, values)
    return values


def _rows_to_steps(rows: list[dict]) -> list[dict]:
    steps = []
    first_users = rows[0]["users"] if rows else 0
    prev_users = None
    for i, row in enumerate(rows):
        users = row["users"]
        conv_pct = round(users / first_users * 100, 1) if first_users else 0.0
        drop_pct = (
            None
            if i == 0 or not prev_users
            else round((prev_users - users) / prev_users * 100, 1)
        )
        steps.append(
            {
                "step": i + 1,
                "label": row["STAGE_NAMES"],
                "users": users,
                "convPct": conv_pct,
                "dropPct": drop_pct,
            }
        )
        prev_users = users
    return steps


def _to_table_date(iso_date: str) -> str:
    """The DATE column doesn't hold real SQL dates — it holds 'YYYYMMDD'
    strings (e.g. "20260401"). The frontend's date picker and the /api/
    overview query params both deal in ordinary ISO 'YYYY-MM-DD' dates
    (e.g. "2026-04-01"), which is the right format for that layer — nothing
    else in the app needs to know the warehouse stores dates this way. So
    the ISO -> table-native conversion happens here, at the one place that
    actually builds the SQL, rather than leaking the table's storage quirk
    out to the API contract or the UI.

    Plain string-slicing (not a real date parse) because the input is
    already a validated "YYYY-MM-DD" string by construction — it comes from
    either the calendar widget or a hardcoded default, never free text.
    Stripping the dashes keeps it a zero-padded, fixed-width digit string,
    which compares equal to the table's own values whether the column
    turns out to be text or integer.
    """
    return iso_date.replace("-", "")


def _from_table_date(table_date: str) -> str:
    """The reverse of _to_table_date — "20260401" -> "2026-04-01". Used for
    values read *out* of the DATE column (fetch_date_range's MIN/MAX)
    rather than values going into a WHERE clause, so the frontend never
    needs to know the table's storage quirk either way.
    """
    return f"{table_date[:4]}-{table_date[4:6]}-{table_date[6:8]}"


def fetch_date_range(*, business: str, product: str, sub_product: str) -> dict:
    """Earliest/latest real DATE for this business/product/sub_product, as
    ISO "YYYY-MM-DD" strings — bounds the date picker so it can't be used
    to pick a day this combination has no data for at all (the daily table
    doesn't span every calendar day for every combination).

    Only narrowed by business/product/sub_product, not journey/version/
    platform/month — those still get to pick any day within the wider
    business/product/sub_product range and simply see "no data" if their
    own combination doesn't actually have data that day, same as every
    other filter.

    Memoized on the same TTL as the dropdown lists (see
    _distinct_column_options): this runs on every /api/filters call, and a
    MIN/MAX over the fact table is not something to repeat for an unchanged
    business/product/sub_product between two clicks.
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
    }
    cache_key = ("date_range", params["business"], params["product"], params["sub_product"])
    cached = _cache_get(cache_key)
    if cached is not _CACHE_MISS:
        return cached  # type: ignore[return-value]

    query = f"""
        SELECT MIN("DATE") AS min_date, MAX("DATE") AS max_date
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE upper("BUSINESS") = upper(%(business)s)
          AND upper("PRODUCT") = upper(%(product)s)
          AND upper("SUB_PRODUCT") = upper(%(sub_product)s)
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            min_date, max_date = cur.fetchone()
    date_range = {
        "min": _from_table_date(str(min_date)) if min_date is not None else None,
        "max": _from_table_date(str(max_date)) if max_date is not None else None,
    }
    _cache_put(cache_key, date_range)
    return date_range


def _to_partition_month(iso_month: str) -> str:
    """"YYYY-MM" (what the Month filter and this module's callers deal in)
    -> PARTITIONCOL's actual "YYYYMM" form (e.g. "2026-08" -> "202608").
    Mirrors _to_table_date's reasoning for the daily table's DATE column:
    the conversion happens here, at the one place that builds the SQL,
    rather than leaking the warehouse's storage format out to the API or UI.
    """
    return iso_month.replace("-", "")


def fetch_month_options() -> list[str]:
    """Distinct months with data in MONTHLY_SUMMARY_TABLE, as sorted
    "YYYY-MM" strings — powers the Month filter's dropdown. Deliberately not
    narrowed by business/product/subProduct/journey the way fetch_filter_options
    narrows its fields: this only tells you which months exist *at all*, not
    which ones have data for the current selection — the funnel query itself
    is what surfaces a genuinely empty result for a bad combination.

    Memoized on the same TTL as the dropdown lists. Taking no arguments, this
    is the most obviously repeated query of the lot: an unnarrowed DISTINCT
    over the monthly table returning the identical answer on every single
    /api/filters call.
    """
    cache_key = ("month_options",)
    cached = _cache_get(cache_key)
    if cached is not _CACHE_MISS:
        return cached  # type: ignore[return-value]

    query = f"""
        SELECT DISTINCT "PARTITIONCOL"
        FROM {MONTHLY_SUMMARY_TABLE}
        WHERE "PARTITIONCOL" IS NOT NULL
        ORDER BY "PARTITIONCOL"
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
    months = [f"{str(row[0])[:4]}-{str(row[0])[4:]}" for row in rows]
    _cache_put(cache_key, months)
    return months


def fetch_month_funnel_steps(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    month: str,
    stage_orders: Optional[list[int]] = None,
) -> list[dict]:
    """Same dimension filtering as fetch_overview_funnel_steps, but
    aggregates MONTHLY_SUMMARY_TABLE's pre-computed monthly rows for a
    single PARTITIONCOL instead of summing the daily table over a date
    range — a genuinely separate, coarser data path, not just another way
    to express the same date range.

    Uppercasing every value in Python and wrapping both sides in upper() in
    the SQL is deliberately belt-and-suspenders: the same business/product/
    journey/etc. name can show up with inconsistent casing across rows
    (e.g. "PERSONALLOAN" in some places, "Personalloan" in others), so an
    exact `=` would silently drop rows a human would consider the same
    value. coalesce(..., 'APP') on EP_PLATFORM treats a null platform as
    App rather than excluding the row entirely.

    stage_orders, when given, restricts the result to just those STAGE_ORDER
    values (e.g. Overview's 5-stage funnel preview) via the DB query itself
    rather than fetching every stage and slicing the list in Python — so
    "which stages count as the preview" lives in one query parameter, not
    duplicated app-side logic.

    The query is built directly here rather than through a shared predicate
    helper — journey/version are the only two parts of the WHERE clause
    that ever change shape (dropped entirely when the filter is "All"), so
    a couple of `if` blocks appending to the query string keeps the whole
    thing visible and easy to copy into a SQL client to debug, instead of
    being assembled from predicate fragments defined somewhere else.
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
        "journey": journey.upper(),
        "platform": platform.upper(),
        "version": version.upper(),
        "month": _to_partition_month(month),
    }

    query = f"""
        SELECT "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {MONTHLY_SUMMARY_TABLE}
        WHERE upper("BUSINESS") = upper(%(business)s)
          AND upper("PRODUCT") = upper(%(product)s)
          AND upper("SUB_PRODUCT") = upper(%(sub_product)s)
          AND coalesce(upper("EP_PLATFORM"), 'APP') = upper(%(platform)s)
          AND CAST("PARTITIONCOL" AS TEXT) = %(month)s"""
    if journey != ALL_VALUE:
        query += """
          AND upper("Journey_name") = upper(%(journey)s)"""
    if version != ALL_VALUE:
        query += """
          AND upper("ENTRYPOINT_STAGE") = upper(%(version)s)"""
    if stage_orders is not None:
        query += """
          AND "STAGE_ORDER" = ANY(%(stage_orders)s)"""
        params["stage_orders"] = list(stage_orders)
    query += """
        GROUP BY "STAGE_ORDER", "STAGE_NAMES"
        ORDER BY "STAGE_ORDER"
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    if not rows:
        logger.error("fetch_month_funnel_steps matched 0 rows for params=%r", params)
    return _rows_to_steps(rows)


def fetch_overview_funnel_steps(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    date: str,
    stage_orders: Optional[list[int]] = None,
) -> list[dict]:
    """Same reasoning as fetch_month_funnel_steps (upper() everywhere,
    coalesce on platform, journey/version dropped entirely on "All",
    stage_orders restricting to specific STAGE_ORDER values in SQL rather
    than in Python) — aggregates the daily table for a single calendar day
    instead of a PARTITIONCOL (the filter panel picks one date, not a
    range).
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
        "journey": journey.upper(),
        "platform": platform.upper(),
        "version": version.upper(),
        "date": _to_table_date(date),
    }

    query = f"""
        SELECT "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE upper("BUSINESS") = upper(%(business)s)
          AND upper("PRODUCT") = upper(%(product)s)
          AND upper("SUB_PRODUCT") = upper(%(sub_product)s)
          AND coalesce(upper("EP_PLATFORM"), 'APP') = upper(%(platform)s)
          AND "DATE" = %(date)s"""
    if journey != ALL_VALUE:
        query += """
          AND upper("Journey_name") = upper(%(journey)s)"""
    if version != ALL_VALUE:
        query += """
          AND upper("ENTRYPOINT_STAGE") = upper(%(version)s)"""
    if stage_orders is not None:
        query += """
          AND "STAGE_ORDER" = ANY(%(stage_orders)s)"""
        params["stage_orders"] = list(stage_orders)
    query += """
        GROUP BY "STAGE_ORDER", "STAGE_NAMES"
        ORDER BY "STAGE_ORDER"
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    if not rows:
        logger.error("fetch_overview_funnel_steps matched 0 rows for params=%r", params)
        _diagnose_empty_overview_result(params, journey, version)
    return _rows_to_steps(rows)


def fetch_entrypoint_performance(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    date: str,
) -> list[dict]:
    """Backs the Entrypoint Performance page end to end: one row per
    entrypoint_group for the selected filters/date, with a raw session
    count plus the percentage columns described in ENTRYPOINT_FUNNEL_TABLE's
    comment. Same dimension filtering (upper()/coalesce()/journey&version
    dropped on "All") as fetch_overview_funnel_steps, grouped by
    entrypoint_group instead of STAGE_ORDER.

    The percentage columns are averaged across whatever rows share an
    entrypoint_group after every other filter is applied — with every other
    dimension already pinned to one value and one date, that's normally
    exactly one row per group; AVG just collapses defensively to one number
    if the table ever has more than one row per group at this grain.
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
        "journey": journey.upper(),
        "platform": platform.upper(),
        "version": version.upper(),
        "date": _to_table_date(date),
    }

    query = f"""
        SELECT
            entrypoint_group,
            SUM(users) AS sessions,
            AVG("PDP_VIEW_EP_CONTRI_PCT") AS contribution_pct,
            AVG("PDP_VIEW_PCT") AS pdp_view_pct,
            AVG("PDP_CLICK_PCT") AS pdp_click_pct,
            AVG("FORM1_VIEW_PCT") AS form1_view_pct,
            AVG("FORM1_CLICK_PCT") AS form1_click_pct
        FROM {ENTRYPOINT_FUNNEL_TABLE}
        WHERE upper("BUSINESS") = upper(%(business)s)
          AND upper("PRODUCT") = upper(%(product)s)
          AND upper("SUB_PRODUCT") = upper(%(sub_product)s)
          AND coalesce(upper("EP_PLATFORM"), 'APP') = upper(%(platform)s)
          AND "DATE" = %(date)s"""
    if journey != ALL_VALUE:
        query += """
          AND upper("Journey_name") = upper(%(journey)s)"""
    if version != ALL_VALUE:
        query += """
          AND upper("ENTRYPOINT_STAGE") = upper(%(version)s)"""
    query += """
        GROUP BY entrypoint_group
        ORDER BY sessions DESC
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    if not rows:
        logger.error("fetch_entrypoint_performance matched 0 rows for params=%r", params)
    return rows


def fetch_conversion_trend(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    start_date: str,
    end_date: str,
) -> list[dict]:
    """Same dimension filtering as fetch_overview_funnel_steps, but grouped
    by DATE too and over an inclusive date range instead of a single day —
    backs the Daily mode of Trends' two trend charts (selected date +/- 15
    days).

    One day can genuinely have data for some stages and not others (e.g. a
    stage nobody reached that day just has no matching rows at all — there's
    no zero-row to group), so this returns each day's *actual* stage list
    rather than a fixed-length one; the caller decides how to reconcile
    that against a reference stage set instead of this function guessing.
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
        "journey": journey.upper(),
        "platform": platform.upper(),
        "version": version.upper(),
        "start_date": _to_table_date(start_date),
        "end_date": _to_table_date(end_date),
    }

    query = f"""
        SELECT "DATE", "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE upper("BUSINESS") = upper(%(business)s)
          AND upper("PRODUCT") = upper(%(product)s)
          AND upper("SUB_PRODUCT") = upper(%(sub_product)s)
          AND coalesce(upper("EP_PLATFORM"), 'APP') = upper(%(platform)s)
          AND "DATE" BETWEEN %(start_date)s AND %(end_date)s"""
    if journey != ALL_VALUE:
        query += """
          AND upper("Journey_name") = upper(%(journey)s)"""
    if version != ALL_VALUE:
        query += """
          AND upper("ENTRYPOINT_STAGE") = upper(%(version)s)"""
    query += """
        GROUP BY "DATE", "STAGE_ORDER", "STAGE_NAMES"
        ORDER BY "DATE", "STAGE_ORDER"
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    if not rows:
        logger.error("fetch_conversion_trend matched 0 rows for params=%r", params)
        return []

    by_date: dict[str, list[dict]] = {}
    for row in rows:
        iso_date = _from_table_date(str(row["DATE"]))
        by_date.setdefault(iso_date, []).append({"label": row["STAGE_NAMES"], "users": row["users"]})
    return [{"date": d, "steps": steps} for d, steps in sorted(by_date.items())]


def fetch_hourly_funnel_steps(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    start_date: str,
    end_date: str,
) -> list[dict]:
    """Same dimension filtering (and the same day-can-be-partial reasoning)
    as fetch_conversion_trend, but grouped by HOUR too and read from
    HOURLY_SUMMARY_TABLE instead of the daily table — backs every
    hour-of-day view on the Trends page. A single call covering the
    selected date and the 7 days before it is enough to build all of them:
    the selected date's own (date, hour) buckets back Hourly throughput,
    Hourly mode on the two trend charts, and "today" in Today's pacing; the
    other 7 days back "yesterday" and the trailing-7-day-same-hour band.
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
        "journey": journey.upper(),
        "platform": platform.upper(),
        "version": version.upper(),
        "start_date": _to_table_date(start_date),
        "end_date": _to_table_date(end_date),
    }

    query = f"""
        SELECT "DATE", "HOUR", "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {HOURLY_SUMMARY_TABLE}
        WHERE upper("BUSINESS") = upper(%(business)s)
          AND upper("PRODUCT") = upper(%(product)s)
          AND upper("SUB_PRODUCT") = upper(%(sub_product)s)
          AND coalesce(upper("EP_PLATFORM"), 'APP') = upper(%(platform)s)
          AND "DATE" BETWEEN %(start_date)s AND %(end_date)s"""
    if journey != ALL_VALUE:
        query += """
          AND upper("Journey_name") = upper(%(journey)s)"""
    if version != ALL_VALUE:
        query += """
          AND upper("ENTRYPOINT_STAGE") = upper(%(version)s)"""
    query += """
        GROUP BY "DATE", "HOUR", "STAGE_ORDER", "STAGE_NAMES"
        ORDER BY "DATE", "HOUR", "STAGE_ORDER"
    """

    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    if not rows:
        logger.error("fetch_hourly_funnel_steps matched 0 rows for params=%r", params)
        return []

    by_bucket: dict[tuple[str, int], list[dict]] = {}
    for row in rows:
        key = (_from_table_date(str(row["DATE"])), int(row["HOUR"]))
        by_bucket.setdefault(key, []).append({"label": row["STAGE_NAMES"], "users": row["users"]})
    return [{"date": d, "hour": h, "steps": steps} for (d, h), steps in sorted(by_bucket.items())]


def _diagnose_empty_overview_result(params: dict, journey: str, version: str) -> None:
    """Best-effort: fetch_overview_funnel_steps matched zero rows for this
    exact combination — figure out *which* predicate is responsible instead
    of leaving it a mystery.

    date is the one predicate below not covered by fetch_filter_options's
    cascade: it starts from a hardcoded default rather than the table's
    actual DATE span, so a mismatch there is invisible to the dropdowns —
    everything can look like a valid, cascaded selection and still match
    zero rows purely because that single day has no real data.

    Re-runs the query, adding one predicate at a time in the same order
    fetch_overview_funnel_steps applies them, and logs the row count after
    each addition — the first predicate that drops the count to zero is
    almost certainly the cause. Only ever called after the real query
    already came back empty, so a handful of extra COUNT(*) queries here is
    a fine trade for turning "the funnel is empty, no idea why" into a
    specific answer in the app logs.
    """
    try:
        clauses = [
            ("business", 'upper("BUSINESS") = upper(%(business)s)'),
            ("product", 'upper("PRODUCT") = upper(%(product)s)'),
            ("sub_product", 'upper("SUB_PRODUCT") = upper(%(sub_product)s)'),
            ("platform", "coalesce(upper(\"EP_PLATFORM\"), 'APP') = upper(%(platform)s)"),
            ("date", '"DATE" = %(date)s'),
        ]
        if journey != ALL_VALUE:
            clauses.append(("journey", 'upper("Journey_name") = upper(%(journey)s)'))
        if version != ALL_VALUE:
            clauses.append(("version", 'upper("ENTRYPOINT_STAGE") = upper(%(version)s)'))

        pool = db.get_connection()
        with pool.connection() as conn:
            with conn.cursor() as cur:
                applied: list[str] = []
                for name, clause in clauses:
                    applied.append(clause)
                    query = f"""
                        SELECT COUNT(*)
                        FROM {HORIZONTAL_SUMMARY_TABLE}
                        WHERE {" AND ".join(applied)}
                    """
                    cur.execute(query, params)

                    count = cur.fetchone()[0]
                    logger.error("  ...after %s=%r: %d matching rows", name, params.get(name), count)
                    if count == 0:
                        logger.error(
                            "fetch_overview_funnel_steps: %r eliminated every remaining row — "
                            "this is almost certainly why the funnel shows no data for this selection",
                            name,
                        )
                        return
    except Exception:
        logger.exception("Also failed to run empty-result diagnostics")


def fetch_funnel_steps(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    month: str,
    date: str,
    stage_orders: Optional[list[int]] = None,
) -> list[dict]:
    """Single entry point for both Overview's funnel chart and Funnel
    Detail's stage table — they're the exact same aggregation, grouped by
    STAGE_ORDER/STAGE_NAMES, just labeled differently for their respective
    pages. This is also where the Month filter takes effect: month ==
    ALL_VALUE (the default) means "no month picked," so it aggregates the
    daily table for the single selected `date` same as before the Month
    filter existed; any real month instead queries MONTHLY_SUMMARY_TABLE's
    pre-aggregated rows for that PARTITIONCOL directly — a coarser,
    separate data path, not just another way to express the same date.

    stage_orders is threaded straight through to whichever of the two
    underlying queries actually runs, so callers (Overview's 5-stage
    preview) get the restriction applied in SQL regardless of which data
    path (daily vs. monthly) a given request resolves to. Funnel Detail
    never passes it, so it keeps seeing every stage.
    """
    if month != ALL_VALUE:
        return fetch_month_funnel_steps(
            business=business,
            product=product,
            sub_product=sub_product,
            journey=journey,
            platform=platform,
            version=version,
            month=month,
            stage_orders=stage_orders,
        )
    return fetch_overview_funnel_steps(
        business=business,
        product=product,
        sub_product=sub_product,
        journey=journey,
        platform=platform,
        version=version,
        date=date,
        stage_orders=stage_orders,
    )


# FilterOptions keys (client/src/api/types.ts), in the same order the filter
# modal shows them: BUSINESS -> PRODUCT -> SUB-PRODUCT -> JOURNEY -> VERSION.
# That order is also the *cascade* hierarchy: each field's dropdown should
# only offer values that actually co-occur with whatever was picked for the
# fields above it (picking BUSINESS="Retail" should narrow PRODUCT down to
# products that exist under Retail, and so on). FILTER_COLUMNS pairs each
# key with its quoted column name in HORIZONTAL_SUMMARY_TABLE, in that same
# cascade order.
FILTER_COLUMNS: list[tuple[str, str]] = [
    ("business", "BUSINESS"),
    ("product", "PRODUCT"),
    ("subProduct", "SUB_PRODUCT"),
    ("journey", "Journey_name"),
    ("version", "ENTRYPOINT_STAGE"),
]


def correct_selection(key: str, current: Optional[str], values: list[str]) -> Optional[str]:
    """The one-field version of the cascade correction the frontend used to
    do across a separate HTTP round trip per level: given a field's real
    options, return what it should actually be set to.

    Unset (None) resolves to ALL_VALUE for the three optional fields and to
    the first real option for the rest, so a caller that sends no selection
    at all still gets back a complete, valid one. A value that isn't among
    `values` is replaced by the first real option — except ALL_VALUE on an
    optional field, which is always legitimate and left alone. Returns
    `current` unchanged when there's nothing to fix.
    """
    optional = key in OPTIONAL_FILTER_KEYS
    if current is None:
        return ALL_VALUE if optional else (values[0] if values else None)
    if optional and current == ALL_VALUE:
        return current
    if current in values:
        return current
    # Genuinely invalid. Prefer a real option; fall back to ALL_VALUE only
    # when this field has no real options at all *and* is allowed to be
    # unset (e.g. a combination with no journeys recorded against it).
    if values:
        return values[0]
    return ALL_VALUE if optional else current


def fetch_filter_options(
    *,
    business: Optional[str] = None,
    product: Optional[str] = None,
    sub_product: Optional[str] = None,
    journey: Optional[str] = None,
    version: Optional[str] = None,
) -> dict:
    """Resolves the *entire* filter cascade in one call: every dropdown's
    real option list, plus the corrected selection those lists imply.

    Each field's options are narrowed by the fields above it in
    FILTER_COLUMNS: business="Retail" narrows product/sub-product/journey/
    version to rows where BUSINESS = 'Retail', while the business list itself
    stays unfiltered (nothing narrows the top of the hierarchy). ALL_VALUE
    means "nothing selected for this field," same as None, and must not
    narrow anything downstream — otherwise journey="All" would filter version
    options down to rows literally matching Journey_name = 'All', i.e. none.

    The important part is that correction happens *inside* this loop, so each
    level is validated against options computed from the already-corrected
    levels above it. The frontend used to get the same guarantee by fixing
    one field per response and re-requesting — correct, but it made picking a
    business a serial chain of HTTP round trips, with the product list
    unresolved until the second reply and sub-product until the third. Doing
    it here collapses that chain into a single request over a single pooled
    connection, and `_distinct_column_options`' cache means the repeated
    levels usually cost nothing.

    Returns {"options": {...}, "selection": {...}}: `options` matches
    FilterOptions' cascade keys, and `selection` is what the caller should
    actually have selected (`platform`/`date`/`month` aren't part of this
    cascade and are left to the router/caller).
    """
    selection: dict[str, Optional[str]] = {
        "business": business,
        "product": product,
        "subProduct": sub_product,
        "journey": journey,
        "version": version,
    }

    pool = db.get_connection()
    options: dict[str, list[str]] = {}
    with pool.connection() as conn:
        with conn.cursor() as cur:
            for i, (key, column) in enumerate(FILTER_COLUMNS):
                upstream = [
                    (upstream_column, selection[upstream_key])
                    for upstream_key, upstream_column in FILTER_COLUMNS[:i]
                    if selection.get(upstream_key) and selection[upstream_key] != ALL_VALUE
                ]
                values = _distinct_column_options(cur, column, upstream)
                options[key] = values
                selection[key] = correct_selection(key, selection.get(key), values)

    return {"options": options, "selection": selection}
