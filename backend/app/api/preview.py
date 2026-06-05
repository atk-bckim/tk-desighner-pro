import tempfile
import subprocess
import os
import threading
import sys

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models.api import ValidateResponse
from app.models.project import Project
from app.services.codegen_pipeline import run_codegen_pipeline
from app.services.project_validation import diagnostic_error_messages

router = APIRouter()

# Check if tkinter is available at startup
_TKINTER_AVAILABLE = True
try:
    import tkinter  # noqa: F401
except ImportError:
    _TKINTER_AVAILABLE = False


@router.post("/preview")
def preview(project: Project):
    pipeline_result = run_codegen_pipeline(project)
    if not pipeline_result.valid:
        response = ValidateResponse(
            valid=False,
            diagnostics=pipeline_result.diagnostics,
            errors=diagnostic_error_messages(pipeline_result.diagnostics),
        )
        return JSONResponse(status_code=422, content=response.model_dump())

    code = pipeline_result.code

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
        completed_process = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if completed_process.returncode != 0:
            error_msg = completed_process.stderr.strip() or "Unknown error"
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
