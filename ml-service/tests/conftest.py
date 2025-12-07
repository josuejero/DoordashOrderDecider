"""
Pytest configuration that ensures the repository root is on sys.path, so
`ml_service` imports work even when tests are invoked from other directories.
"""
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
  sys.path.insert(0, str(ROOT))
