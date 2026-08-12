import os
import threading

from databricks.sdk import WorkspaceClient
import psycopg
from psycopg_pool import ConnectionPool

_lock = threading.Lock()
_workspace_client: WorkspaceClient | None = None
_pool: ConnectionPool | None = None


def _get_workspace_client() -> WorkspaceClient:
    global _workspace_client
    if _workspace_client is None:
        with _lock:
            if _workspace_client is None:
                _workspace_client = WorkspaceClient()
    return _workspace_client


def _use_oauth() -> bool:
    """Databricks Apps (and `databricks auth login` against the Lakebase
    workspace) authenticate with short-lived OAuth tokens minted via the
    Databricks SDK -- there's no static password to set. A plain local
    Postgres instance has no such thing; it just wants an ordinary password.

    PGPASSWORD is the standard libpq env var for that password, so its
    presence is what distinguishes the two setups here: export it (alongside
    the usual PGHOST/PGPORT/PGDATABASE/PGUSER) to point at a local Postgres,
    or leave it unset -- the default both in `app.yaml` and when connecting
    to Lakebase locally via `databricks auth login` -- to get OAuth.
    """
    return "PGPASSWORD" not in os.environ


class OAuthConnection(psycopg.Connection):
    @classmethod
    def connect(cls, conninfo="", **kwargs):
        cred = _get_workspace_client().postgres.generate_database_credential(
            endpoint=os.environ["ENDPOINT_NAME"]
        )
        kwargs["password"] = cred.token
        return super().connect(conninfo, **kwargs)


def get_connection() -> ConnectionPool:
    global _pool
    if _pool is None:
        with _lock:
            if _pool is None:
                oauth = _use_oauth()
                _pool = ConnectionPool(
                    conninfo=(
                        f"dbname={os.environ['PGDATABASE']} "
                        f"user={os.environ['PGUSER']} "
                        f"host={os.environ['PGHOST']} "
                        f"port={os.environ.get('PGPORT', '5432')} "
                        # Lakebase always sits behind TLS; a local Postgres
                        # usually isn't configured for it, so only default to
                        # requiring SSL when we're actually doing OAuth --
                        # PGSSLMODE still wins if the caller sets it either way.
                        f"sslmode={os.environ.get('PGSSLMODE', 'require' if oauth else 'prefer')}"
                    ),
                    # psycopg.Connection (not OAuthConnection) leaves password
                    # handling to plain libpq, which picks up PGPASSWORD from
                    # the environment on its own -- nothing else to wire up.
                    connection_class=OAuthConnection if oauth else psycopg.Connection,
                    min_size=1,
                    max_size=10,
                    open=True,
                )
    return _pool
