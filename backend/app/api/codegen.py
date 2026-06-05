from fastapi import APIRouter

from app.models.api import CodegenResponse, ValidateResponse
from app.models.project import Project
from app.services.codegen_pipeline import run_codegen_pipeline
from app.services.project_validation import diagnostic_error_messages

router = APIRouter()


@router.post("/codegen", response_model=CodegenResponse)
def codegen(project: Project) -> CodegenResponse:
    return run_codegen_pipeline(project)


@router.post("/validate", response_model=ValidateResponse)
def validate(project: Project) -> ValidateResponse:
    result = run_codegen_pipeline(project)
    return ValidateResponse(
        valid=result.valid,
        diagnostics=result.diagnostics,
        errors=diagnostic_error_messages(result.diagnostics),
    )
