# FILE: ml_service/api.py
"""Compatibility module for exposing the FastAPI app.

Some tooling expects `ml_service.api:app` as the ASGI callable. To keep the
implementation centralised, this module simply re-exports the app defined in
`ml_service.main`.
"""

# TODO: If the project switches the FastAPI entrypoint to a different module,
# update this re-export accordingly.

from .main import app

__all__ = ["app"]
