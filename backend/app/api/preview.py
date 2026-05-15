import tempfile
import subprocess
import os
import threading

from fastapi import APIRouter, HTTPException
from app.models.project import Project
from app.codegen.tkinter_gen import generate_tkinter_code

router = APIRouter()


@router.post("/preview")
def preview(project: Project):
    code = generate_tkinter_code(project)

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, prefix="tkdesigner_"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        subprocess.Popen(
            ["python", tmp_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

    def _cleanup(path: str) -> None:
        if os.path.exists(path):
            os.unlink(path)

    threading.Timer(5.0, _cleanup, args=[tmp_path]).start()

    return {"status": "launched", "code": code}
