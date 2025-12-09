import os
from pathlib import Path

import joblib
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split

from .data import load_training_data
from .model import MODEL_PATH


def train_and_log_experiment(conn_str: str) -> str:
  X, y = load_training_data(conn_str)

  X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
  )

  with mlflow.start_run(run_name="phase3-hybrid-net-hourly"):
    model = GradientBoostingRegressor(random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = mse ** 0.5

    mlflow.log_param("model_type", "GradientBoostingRegressor")
    mlflow.log_metric("rmse", rmse)

    model.model_version_ = f"phase3-gbr-rmse-{rmse:.2f}"

    mlflow.sklearn.log_model(model, artifact_path="model")


    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    return model.model_version_


def main():
  conn_str = os.environ.get("DD_DECIDER_DATABASE_URL")
  if not conn_str:
    raise SystemExit("DD_DECIDER_DATABASE_URL not set")

  mlflow.set_experiment("DoorDashDecider-Phase3")
  version = train_and_log_experiment(conn_str)
  print(f"Trained model version: {version}")
  print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
  main()
