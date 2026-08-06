import logging
import os
import threading
import time

import psycopg

logger = logging.getLogger(__name__)

# The name of the Lakebase database instance (as created in the workspace),
# used to mint Postgres OAuth credentials. Distinct from PGHOST/PGDATABASE/
# PGUSER, which Databricks injects automatically once the instance is
# attached to the app as a resource. Easy to mix up: PGDATABASE is almost
# always "databricks_postgres" (the default database Lakebase creates
# inside every instance) — that is NOT the instance name. The instance
# name is whatever you called it under Database Instances in the
# workspace, and is what generate_database_credential() below needs.
INSTANCE_NAME = os.environ.get("LAKEBASE_INSTANCE_NAME", "digital360")

_TOKEN_TTL_SECONDS = 3600
_TOKEN_REFRESH_MARGIN_SECONDS = 300

_lock = threading.Lock()
_workspace_client = None
_token: str | None = None
_token_expires_at = 0.0


def _log_available_instances() -> None:
    """Best-effort: list the workspace's actual Lakebase instance names so a
    wrong INSTANCE_NAME is self-diagnosing from the app logs instead of
    requiring a trip through the UI to check."""
    try:
        names = [i.name for i in _workspace_client.database.list_database_instances()]
    except Exception:
        logger.exception("Also failed to list database instances for diagnostics")
        return
    if names:
        logger.error(
            "LAKEBASE_INSTANCE_NAME=%r not found. Database instances available in this "
            "workspace: %s",
            INSTANCE_NAME,
            names,
        )
    else:
        logger.error(
            "LAKEBASE_INSTANCE_NAME=%r not found, and no database instances exist in this "
            "workspace at all — create one under Database Instances first.",
            INSTANCE_NAME,
        )


def _get_token() -> str:
    global _workspace_client, _token, _token_expires_at
    with _lock:
        if _token is None or time.time() > _token_expires_at - _TOKEN_REFRESH_MARGIN_SECONDS:
            if _workspace_client is None:
                from databricks.sdk import WorkspaceClient

                _workspace_client = WorkspaceClient()
            try:
                credential = _workspace_client.database.generate_database_credential(
                    instance_names=[INSTANCE_NAME]
                )
            except Exception:
                _log_available_instances()
                raise
            _token = credential.token
            _token_expires_at = time.time() + _TOKEN_TTL_SECONDS
    return _token


def get_connection() -> psycopg.Connection:
    return psycopg.connect(
        host=os.environ["PGHOST"],
        port=os.environ.get("PGPORT", "5432"),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=_get_token(),
        sslmode=os.environ.get("PGSSLMODE", "require"),
    )
