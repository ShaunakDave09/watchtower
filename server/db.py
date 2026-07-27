import os
import threading
import time

import psycopg

# The name of the Lakebase database instance (as created in the workspace),
# used to mint Postgres OAuth credentials. Distinct from PGHOST/PGDATABASE/
# PGUSER, which Databricks injects automatically once the instance is
# attached to the app as a resource.
INSTANCE_NAME = os.environ.get("LAKEBASE_INSTANCE_NAME", "digital360")

_TOKEN_TTL_SECONDS = 3600
_TOKEN_REFRESH_MARGIN_SECONDS = 300

_lock = threading.Lock()
_workspace_client = None
_token: str | None = None
_token_expires_at = 0.0


def _get_token() -> str:
    global _workspace_client, _token, _token_expires_at
    with _lock:
        if _token is None or time.time() > _token_expires_at - _TOKEN_REFRESH_MARGIN_SECONDS:
            if _workspace_client is None:
                from databricks.sdk import WorkspaceClient

                _workspace_client = WorkspaceClient()
            credential = _workspace_client.database.generate_database_credential(
                instance_names=[INSTANCE_NAME]
            )
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
