"""
Pytest configuration that ensures the repository root is on sys.path, so
`ml_service` imports work even when tests are invoked from other directories.
"""

from pathlib import Path
import sys


PKG_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]

for path in (PKG_ROOT, REPO_ROOT):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
