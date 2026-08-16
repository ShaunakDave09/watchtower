import logging
import os
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

# Sentinel for "don't filter on this field" — only offered for Journey and
# Version. Unlike business/product/sub_product (which narrow which data
# exists at all and always need a real pick), journey and version are
# optional refinements: the filter panel defaults to this rather than
# auto-selecting an arbitrary real journey/version, so the dashboard starts
# aggregated across all of them until the user picks a specific one.
ALL_VALUE = "All"


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
    """
    params = {
        "business": business.upper(),
        "product": product.upper(),
        "sub_product": sub_product.upper(),
    }

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
    return {
        "min": _from_table_date(str(min_date)) if min_date is not None else None,
        "max": _from_table_date(str(max_date)) if max_date is not None else None,
    }


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
    """
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
    return [f"{str(row[0])[:4]}-{str(row[0])[4:]}" for row in rows]


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


def fetch_filter_options(
    *,
    business: Optional[str] = None,
    product: Optional[str] = None,
    sub_product: Optional[str] = None,
    journey: Optional[str] = None,
) -> dict:
    """Distinct, non-null values for each filter dropdown, straight from the
    warehouse — optionally narrowed by whatever the caller already has
    selected upstream in the cascade.

    `business`/`product`/`sub_product`/`journey` are the *currently selected*
    values for those fields (or None if nothing's selected yet). Each of
    them constrains every column that comes after it in FILTER_COLUMNS: e.g.
    passing business="Retail" narrows the product, sub-product, journey, and
    version lists to rows where BUSINESS = 'Retail', but the business list
    itself stays unfiltered (it's the top of the hierarchy, nothing narrows
    it). This mirrors how a human would explore the data top-down, and it's
    exactly what the frontend needs to keep the dropdowns from ever showing
    a combination that doesn't actually exist together.

    Shape of the return value matches FilterOptions exactly, so the router
    can return this (or the fixture) with no frontend changes either way.

    The number of upstream fields narrowing each column varies (0 for
    business, up to 4 for version), so unlike the fixed-shape funnel-steps
    queries above, this one genuinely needs to build its WHERE clause in a
    loop rather than as literal `if` blocks — the loop and its `where_clauses`
    list are local to this one function, not a shared predicate helper.
    """
    # Selected values, keyed by FilterOptions key, in cascade order — used
    # below to build the WHERE clause for each column from whatever's
    # already been picked "above" it.
    selected: dict[str, Optional[str]] = {
        "business": business,
        "product": product,
        "subProduct": sub_product,
        "journey": journey,
        # "version" has nothing after it to narrow, so it's never a filter
        # input here — only an output.
    }

    pool = db.get_connection()
    options: dict[str, list[str]] = {}
    with pool.connection() as conn:
        with conn.cursor() as cur:
            for i, (key, column) in enumerate(FILTER_COLUMNS):
                # Only the fields *above* this one in the cascade (i.e.
                # earlier in FILTER_COLUMNS) narrow its options, and only
                # when the caller actually selected something for them.
                # "All" (only ever passed for journey — see ALL_VALUE) means
                # "nothing selected for this field," same as None: it must
                # not narrow anything downstream, or e.g. picking journey =
                # "All" would filter version options down to rows literally
                # matching Journey_name = 'All' (i.e. none).
                upstream = [
                    (upstream_column, selected[upstream_key])
                    for upstream_key, upstream_column in FILTER_COLUMNS[:i]
                    if selected.get(upstream_key) and selected[upstream_key] != ALL_VALUE
                ]

                # upper()/upper() for the same reason as the funnel-steps
                # queries: the value selected earlier in the cascade can be
                # cased differently from the row that's actually in the table.
                where_clauses = [f'"{column}" IS NOT NULL']
                params: dict[str, str] = {}
                for j, (upstream_column, value) in enumerate(upstream):
                    param_name = f"upstream_{j}"
                    where_clauses.append(f'upper("{upstream_column}") = upper(%({param_name})s)')
                    params[param_name] = value

                query = f"""
                    SELECT DISTINCT "{column}"
                    FROM {HORIZONTAL_SUMMARY_TABLE}
                    WHERE {" AND ".join(where_clauses)}
                    ORDER BY "{column}"
                """
                cur.execute(query, params)

                options[key] = [row[0] for row in cur.fetchall()]
    return options
