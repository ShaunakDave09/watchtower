import logging
import os

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


def _dimension_predicates(params: dict) -> list[tuple[str, str]]:
    """Business/product/sub_product/journey/platform/version predicates, as
    (log_name, SQL predicate) pairs — shared by both HORIZONTAL_SUMMARY_TABLE
    and MONTHLY_SUMMARY_TABLE, since both tables carry the same dimension
    columns. Only the temporal predicate differs between them (DATE range vs.
    PARTITIONCOL), so each caller appends its own — see _overview_predicates
    and fetch_month_funnel_steps.

    journey/version are only included when they're not ALL_VALUE — that's
    what makes "All" mean "don't filter on this field" rather than a literal
    (and never-matching) string comparison.
    """
    predicates = [
        ("business", '"BUSINESS" = %(business)s'),
        ("product", '"PRODUCT" = %(product)s'),
        ("sub_product", '"SUB_PRODUCT" = %(sub_product)s'),
    ]
    if params.get("journey") != ALL_VALUE:
        predicates.append(("journey", '"Journey_name" = %(journey)s'))
    predicates.append(("platform", '"EP_PLATFORM" = %(platform)s'))
    if params.get("version") != ALL_VALUE:
        predicates.append(("version", '"ENTRYPOINT_STAGE" = %(version)s'))
    return predicates


def _overview_predicates(params: dict) -> list[tuple[str, str]]:
    """fetch_overview_funnel_steps's WHERE clause, as (log_name, SQL
    predicate) pairs in the order they're applied. Used both to build the
    real query and, on a genuine zero-row result, to work out which single
    predicate is responsible — see _diagnose_empty_overview_result below.
    """
    return [
        *_dimension_predicates(params),
        ("date_range", '"DATE" BETWEEN %(date_from)s AND %(date_to)s'),
    ]


def _diagnose_empty_overview_result(params: dict) -> None:
    """Best-effort: fetch_overview_funnel_steps matched zero rows for this
    exact combination — figure out *which* predicate is responsible instead
    of leaving it a mystery.

    Two of the seven predicates above (platform, date_range) aren't covered
    by fetch_filter_options's cascade: `platform` comes from a hardcoded
    App/Web toggle in the frontend rather than real EP_PLATFORM values, and
    the date range starts from a hardcoded default rather than the table's
    actual DATE span. So a mismatch there is invisible to the dropdowns —
    everything can look like a valid, cascaded selection and still match
    zero rows. business/product/sub_product/journey/version *are* covered
    by the cascade, so if one of those is the culprit instead, something
    upstream let an invalid combination through.

    Re-runs the query, adding one predicate at a time in the same order
    it's applied, and logs the row count after each addition — the first
    predicate that drops the count to zero is almost certainly the cause.
    Only ever called after the real query already came back empty, so a
    handful of extra COUNT(*) queries here is a fine trade for turning "the
    funnel is empty, no idea why" into a specific answer in the app logs.
    """
    try:
        pool = db.get_connection()
        with pool.connection() as conn:
            with conn.cursor() as cur:
                clauses: list[str] = []
                for name, predicate in _overview_predicates(params):
                    clauses.append(predicate)
                    cur.execute(
                        f'SELECT COUNT(*) FROM {HORIZONTAL_SUMMARY_TABLE} WHERE {" AND ".join(clauses)}',
                        params,
                    )
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
    which sorts identically to the dates it represents, so BETWEEN still
    does the right thing whether the column turns out to be text or
    integer.
    """
    return iso_date.replace("-", "")


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
    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT DISTINCT "PARTITIONCOL" FROM {MONTHLY_SUMMARY_TABLE} '
                f'WHERE "PARTITIONCOL" IS NOT NULL ORDER BY "PARTITIONCOL"'
            )
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
) -> list[dict]:
    """Same dimension filtering as fetch_overview_funnel_steps, but
    aggregates MONTHLY_SUMMARY_TABLE's pre-computed monthly rows for a
    single PARTITIONCOL instead of summing the daily table over a date
    range. Cast to text on both sides of the PARTITIONCOL comparison since
    the column's declared type isn't guaranteed (could be integer or text
    depending on how the gold layer materialized it) — this works either way.
    """
    params = {
        "business": business,
        "product": product,
        "sub_product": sub_product,
        "journey": journey,
        "platform": platform,
        "version": version,
        "month": _to_partition_month(month),
    }
    predicates = [*_dimension_predicates(params), ("month", 'CAST("PARTITIONCOL" AS TEXT) = %(month)s')]
    query = f"""
        SELECT "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {MONTHLY_SUMMARY_TABLE}
        WHERE {" AND ".join(predicate for _, predicate in predicates)}
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
    date_from: str,
    date_to: str,
) -> list[dict]:
    params = {
        "business": business,
        "product": product,
        "sub_product": sub_product,
        "journey": journey,
        "platform": platform,
        "version": version,
        "date_from": _to_table_date(date_from),
        "date_to": _to_table_date(date_to),
    }
    predicates = _overview_predicates(params)
    query = f"""
        SELECT "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE {" AND ".join(predicate for _, predicate in predicates)}
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
        _diagnose_empty_overview_result(params)
    return _rows_to_steps(rows)


def fetch_funnel_steps(
    *,
    business: str,
    product: str,
    sub_product: str,
    journey: str,
    platform: str,
    version: str,
    month: str,
    date_from: str,
    date_to: str,
) -> list[dict]:
    """Single entry point for both Overview's funnel chart and Funnel
    Detail's stage table — they're the exact same aggregation, grouped by
    STAGE_ORDER/STAGE_NAMES, just labeled differently for their respective
    pages (Funnel Detail used to only filter by journey; see git history for
    why that was a bug). This is also where the Month filter takes effect:
    month == ALL_VALUE (the default) means "no month picked," so it
    aggregates the daily table over date_from/date_to same as before the
    Month filter existed; any real month instead queries
    MONTHLY_SUMMARY_TABLE's pre-aggregated rows for that PARTITIONCOL
    directly — a coarser, separate data path, not just another way to
    express the same date range.
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
        )
    return fetch_overview_funnel_steps(
        business=business,
        product=product,
        sub_product=sub_product,
        journey=journey,
        platform=platform,
        version=version,
        date_from=date_from,
        date_to=date_to,
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
    business: str | None = None,
    product: str | None = None,
    sub_product: str | None = None,
    journey: str | None = None,
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
    """
    # Selected values, keyed by FilterOptions key, in cascade order — used
    # below to build the WHERE clause for each column from whatever's
    # already been picked "above" it.
    selected: dict[str, str | None] = {
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
                where_clauses = [f'"{column}" IS NOT NULL']
                params: dict[str, str] = {}
                for j, (upstream_column, value) in enumerate(upstream):
                    param_name = f"upstream_{j}"
                    where_clauses.append(f'"{upstream_column}" = %({param_name})s')
                    params[param_name] = value
                cur.execute(
                    f'SELECT DISTINCT "{column}" FROM {HORIZONTAL_SUMMARY_TABLE} '
                    f'WHERE {" AND ".join(where_clauses)} ORDER BY "{column}"',
                    params,
                )
                options[key] = [row[0] for row in cur.fetchall()]
    return options
