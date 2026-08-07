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


# Maps FilterOptions keys (client/src/api/types.ts) to the corresponding
# quoted column name in HORIZONTAL_SUMMARY_TABLE.
FILTER_COLUMNS = {
    "business": "BUSINESS",
    "product": "PRODUCT",
    "subProduct": "SUB_PRODUCT",
    "journey": "Journey_name",
    "version": "ENTRYPOINT_STAGE",
}


def fetch_filter_options() -> dict:
    """Distinct, non-null values for each filter dropdown, straight from the
    warehouse. Shape matches FilterOptions exactly, so the router can return
    this (or the fixture) with no frontend changes either way."""
    pool = db.get_connection()
    options: dict[str, list[str]] = {}
    with pool.connection() as conn:
        with conn.cursor() as cur:
            for key, column in FILTER_COLUMNS.items():
                cur.execute(
                    f'SELECT DISTINCT "{column}" FROM {HORIZONTAL_SUMMARY_TABLE} '
                    f'WHERE "{column}" IS NOT NULL ORDER BY "{column}"'
                )
                options[key] = [row[0] for row in cur.fetchall()]
    return options
