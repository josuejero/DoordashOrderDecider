import pandas as pd  # type: ignore[import-untyped]
import psycopg
import pytest

from ml_service.data import TRAINING_SQL, load_training_data


class _DummyConnection:
    """Lightweight stand-in object for psycopg connections used in tests."""

    def __init__(self, dsn: str) -> None:
        self.dsn = dsn

    def __enter__(self) -> "_DummyConnection":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None


def test_load_training_data_shapes_and_columns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """load_training_data should return non-empty, aligned X/y with expected columns."""
    captured_dsn: list[str] = []
    captured_sql: list[str] = []

    def fake_connect(dsn: str) -> _DummyConnection:
        captured_dsn.append(dsn)
        return _DummyConnection(dsn)

    monkeypatch.setattr(psycopg, "connect", fake_connect)

    def fake_read_sql_query(sql: str, conn: _DummyConnection) -> pd.DataFrame:  # type: ignore[override]
        captured_sql.append(sql)
        data = {
            "gross_payout": [20.0, 25.0],
            "miles": [5.0, 10.0],
            "est_minutes": [30.0, 45.0],
            "hour_of_day": [12, 18],
            "day_of_week": [1, 2],
            "label_hourly": [24.0, 30.0],
        }
        return pd.DataFrame(data)

    monkeypatch.setattr(pd, "read_sql_query", fake_read_sql_query)

    conn_str = "postgres://test-dsn"
    X, y = load_training_data(conn_str)

    assert captured_dsn == [conn_str]
    assert captured_sql, "Expected SQL query to be executed"
    # Basic shape checks
    assert len(X) == len(y) > 0
    for col in ["gross_payout", "miles", "est_minutes", "hour_of_day", "day_of_week"]:
        assert col in X.columns
