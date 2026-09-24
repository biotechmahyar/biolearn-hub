import os
from pathlib import Path
import sys
import tempfile

TEST_ROOT = Path(tempfile.mkdtemp(prefix="genova-emergency-tests-"))
os.environ["EMERGENCY_DATABASE_PATH"] = str(TEST_ROOT / "emergency.sqlite3")
BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
