from __future__ import annotations

import os
from pathlib import Path
from typing import Tuple

import joblib  # type: ignore[import-untyped]
from sklearn.ensemble import RandomForestRegressor  # type: ignore[import-untyped]
from sklearn.metrics import mean_absolute_error  # type: ignore[import-untyped]

from .data import load_training_data
from .model import MODEL_PATH

DEFAULT_N_ESTIMATORS = 200
DEFAULT_RANDOM_STATE = 42


def train_model(
    conn_str: str, model_path: Path | None = None
) -> Tuple[RandomForestRegressor, float]:
    """Train a RandomForestRegressor on historical data.

    Returns the trained model and validation MAE.
    """
    X, y = load_training_data(conn_str)

    # Simple train/validation split
    n = len(X)
    if n < 10:
        raise ValueError("Not enough training data to train model")

    split = int(n * 0.8)
    X_train, X_val = X.iloc[:split], X.iloc[split:]
    y_train, y_val = y.iloc[:split], y.iloc[split:]

    model = RandomForestRegressor(
        n_estimators=DEFAULT_N_ESTIMATORS,
        random_state=DEFAULT_RANDOM_STATE,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_val)
    mae = float(mean_absolute_error(y_val, preds))
    model.model_version_ = f"rf-{DEFAULT_N_ESTIMATORS}-v1"

    save_path = model_path or MODEL_PATH
    save_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, save_path)

    return model, mae


def main() -> None:
    conn_str = os.environ["DD_DECIDER_DATABASE_URL"]
    train_model(conn_str)


if __name__ == "__main__":
    main()
