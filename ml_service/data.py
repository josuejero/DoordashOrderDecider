# ml_service/data.py
from typing import Tuple

import pandas as pd
import psycopg

TRAINING_SQL = """
SELECT
  fo.order_id,
  fo.platform,
  fo.base_payout + COALESCE(fo.tip, 0) AS gross_payout,
  fo.estimated_distance_miles AS miles,
  fo.estimated_time_minutes AS est_minutes,
  dt.hour AS hour_of_day,
  dt.day_of_week,
  dt.time_of_day_bucket,
  dz.zone_name,
  fd.effective_hourly_rate AS label_hourly,
  fd.final_decision
FROM fact_orders fo
JOIN fact_decisions fd ON fd.order_id = fo.order_id
JOIN dim_time dt ON dt.time_id = fo.time_id
JOIN dim_zone dz ON dz.zone_id = fo.zone_id
WHERE fd.final_decision IS NOT NULL
  AND fd.effective_hourly_rate IS NOT NULL
;
"""


def load_training_data(conn_str: str) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Connects to Postgres using conn_str, runs TRAINING_SQL, and returns (X, y)
    where y is label_hourly and X is a feature matrix.
    """
    with psycopg.connect(conn_str) as conn:
        df = pd.read_sql_query(TRAINING_SQL, conn)

    # Simple feature set; extend as needed
    feature_cols = [
        "gross_payout",
        "miles",
        "est_minutes",
        "hour_of_day",
        "day_of_week",
    ]

    df = df.dropna(subset=["label_hourly"])
    X = df[feature_cols].fillna(0.0)
    y = df["label_hourly"]
    return X, y
