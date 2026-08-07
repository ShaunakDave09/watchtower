import os

from psycopg.rows import dict_row
from server import db


# schema.table of the Lakebase-synced copy of
# bfl_std_lake.digital360.horizontal_summary_daily
HORIZONTAL_SUMMARY_TABLE = os.environ.get(
    "HORIZONTAL_SUMMARY_TABLE", "digital360.business_funnel_daily"
)


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
    query = f"""
        SELECT "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE "BUSINESS" = %(business)s
          AND "PRODUCT"= %(product)s
          AND "SUB_PRODUCT" = %(sub_product)s
          AND "Journey_name" = %(journey)s
          AND "EP_PLATFORM" = %(platform)s
          AND "ENTRYPOINT_STAGE" = %(version)s
          AND "DATE" BETWEEN %(date_from)s AND %(date_to)s
        GROUP BY "STAGE_ORDER", "STAGE_NAMES"
        ORDER BY "STAGE_ORDER"
    """
    params = {
        "business": business,
        "product": product,
        "sub_product": sub_product,
        "journey": journey,
        "platform": platform,
        "version": version,
        "date_from": date_from,
        "date_to": date_to,
    }
    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    return _rows_to_steps(rows)


def fetch_funnel_stages(journey_name: str) -> list[dict]:
    # Funnel Detail doesn't currently carry business/product/subProduct/
    # platform/version/date filters from the frontend, so this aggregates
    # across all of them for the given journey.
    query = f"""
        SELECT "STAGE_ORDER", "STAGE_NAMES", SUM(users) AS users
        FROM {HORIZONTAL_SUMMARY_TABLE}
        WHERE lower("Journey_name") = lower(%(journey_name)s)
        GROUP BY "STAGE_ORDER", "STAGE_NAMES"
        ORDER BY "STAGE_ORDER"
    """
    pool = db.get_connection()
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, {"journey_name": journey_name})
            rows = cur.fetchall()
    return _rows_to_steps(rows)


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
                upstream = [
                    (upstream_column, selected[upstream_key])
                    for upstream_key, upstream_column in FILTER_COLUMNS[:i]
                    if selected.get(upstream_key)
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
