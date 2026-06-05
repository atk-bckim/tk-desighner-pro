from typing import Literal

from pydantic import BaseModel, Field


class Diagnostic(BaseModel):
    severity: Literal["error", "warning", "info"]
    code: str
    message: str
    path: str | None = None
    widget_id: str | None = None
    widget_name: str | None = None


class CodegenResponse(BaseModel):
    code: str
    valid: bool
    diagnostics: list[Diagnostic] = Field(default_factory=list)
    generator_version: str
    project_schema_version: int


class ValidateResponse(BaseModel):
    valid: bool
    diagnostics: list[Diagnostic] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
