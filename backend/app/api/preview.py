import tempfile
import subprocess
import os
import threading
import sys

from fastapi import APIRouter, HTTPException
from app.models.project import Project
from app.codegen.tkinter_gen import generate_tkinter_code

router = APIRouter()

# Check if tkinter is available at startup
_TKINTER_AVAILABLE = True
try:
    import tkinter  # noqa: F401
except ImportError:
    _TKINTER_AVAILABLE = False


@router.post("/preview")
def preview(project: Project):
    code = generate_tkinter_code(project)

    if not _TKINTER_AVAILABLE:
        return {
            "status": "code_only",
            "code": code,
            "warning": "tkinter is not installed. Preview requires Python with tkinter support. "
                       "The generated code is shown below - save it as a .py file and run it manually.",
        }

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, prefix="tkdesigner_"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            error_msg = result.stderr.strip() or "Unknown error"
            os.unlink(tmp_path)
            raise HTTPException(status_code=400, detail=error_msg)
    except subprocess.TimeoutExpired:
        os.unlink(tmp_path)
        raise HTTPException(status_code=408, detail="Preview timed out")
    except HTTPException:
        raise
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

    def _cleanup(path: str) -> None:
        if os.path.exists(path):
            os.unlink(path)

    threading.Timer(5.0, _cleanup, args=[tmp_path]).start()

    return {"status": "launched", "code": code}
