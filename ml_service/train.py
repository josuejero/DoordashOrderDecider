import json
import os
from datetime import datetime
from pathlib import Path

import joblib
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split

from .data import load_training_data
from .model import MODEL_METADATA_PATH, MODEL_PATH

try:
    from xgboost import XGBRegressor
except ImportError:
    XGBRegressor = None


MLRUNS_DIR = Path(__file__).with_name("mlruns")


def _write_metadata(model_version: str, run_id: str | None, rmse: float) -> None:
    """Persist lightweight model metadata for the inference API to serve."""
    MODEL_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "modelVersion": model_version,
        "runId": run_id,
        "trainedAt": datetime.utcnow().isoformat(),
        "rmse": rmse,
        "trackingUri": os.environ.get("MLFLOW_TRACKING_URI") or str(MLRUNS_DIR),
        "source": "mlflow",
    }
    MODEL_METADATA_PATH.write_text(json.dumps(payload, indent=2))


def build_model():
    """
    Prefer a small XGBoost baseline when available, otherwise fall back to
    scikit-learn's GradientBoostingRegressor. Both are lightweight and fast
    enough for local training and inference.
    """
    if XGBRegressor:
        return (
            XGBRegressor(
                n_estimators=300,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                objective="reg:squarederror",
                random_state=42,
            ),
            "xgboost",
        )

    return GradientBoostingRegressor(random_state=42), "gradient_boosting"


def train_and_log_experiment(conn_str: str) -> str:
    X, y = load_training_data(conn_str)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    with mlflow.start_run(run_name="phase3-hybrid-net-hourly") as run:
        model, model_kind = build_model()
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        rmse = mse**0.5

        mlflow.log_param("model_type", model_kind)
        mlflow.log_param("train_rows", len(X_train))
        mlflow.log_param("test_rows", len(X_test))
        mlflow.log_metric("rmse", rmse)

        model.model_version_ = (
            f"phase3-{model_kind}-rmse-{rmse:.2f}"
        )

        mlflow.sklearn.log_model(model, artifact_path="model")


        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)

        _write_metadata(model.model_version_, run.info.run_id if run else None, rmse)

        return model.model_version_


def main():
    conn_str = os.environ.get("DD_DECIDER_DATABASE_URL")
    if not conn_str:
        raise SystemExit("DD_DECIDER_DATABASE_URL not set")

    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI") or str(MLRUNS_DIR)
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("DoorDashDecider-Phase3")

    version = train_and_log_experiment(conn_str)
    print(f"Trained model version: {version}")
    print(f"Saved model to {MODEL_PATH}")
    print(f"MLflow tracking URI: {tracking_uri}")


if __name__ == "__main__":
    main()
