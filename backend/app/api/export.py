import re

from fastapi import APIRouter
from fastapi.responses import JSONResponse, PlainTextResponse
from app.models.api import ValidateResponse
from app.models.project import Project
from app.services.codegen_pipeline import run_codegen_pipeline
from app.services.project_validation import diagnostic_error_messages

router = APIRouter()


@router.post("/export")
def export(project: Project):
    result = run_codegen_pipeline(project)
    if not result.valid:
        response = ValidateResponse(
            valid=False,
            diagnostics=result.diagnostics,
            errors=diagnostic_error_messages(result.diagnostics),
        )
        return JSONResponse(status_code=422, content=response.model_dump())

    code = result.code
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', project.name) or "output"
    filename = safe_name + ".py"
    return PlainTextResponse(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
