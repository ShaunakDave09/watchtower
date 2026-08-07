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
                _pool = ConnectionPool(
                    conninfo=(
                        f"dbname={os.environ['PGDATABASE']} "
                        f"user={os.environ['PGUSER']} "
                        f"host={os.environ['PGHOST']} "
                        f"port={os.environ.get('PGPORT', '5432')} "
                        f"sslmode={os.environ.get('PGSSLMODE', 'require')}"
                    ),
                    connection_class=OAuthConnection,
                    min_size=1,
                    max_size=10,
                    open=True,
                )
    return _pool
