from app.codegen.tkinter_gen import generate_tkinter_code
from app.models.api import CodegenResponse, Diagnostic
from app.models.project import Project
from app.services.project_validation import validate_project


GENERATOR_VERSION = "1"
PROJECT_SCHEMA_VERSION = 1


def run_codegen_pipeline(project: Project) -> CodegenResponse:
    diagnostics = validate_project(project)
    code = ""

    try:
        code = generate_tkinter_code(project)
    except Exception as exc:
        diagnostics.append(
            Diagnostic(
                severity="error",
                code="code_generation_failed",
                message=f"Code generation failed: {exc}",
            )
        )
        return _response(code=code, diagnostics=diagnostics)

    diagnostics.extend(_compile_diagnostics(code))
    return _response(code=code, diagnostics=diagnostics)


def _compile_diagnostics(code: str) -> list[Diagnostic]:
    try:
        compile(code, "<tkdesigner-generated>", "exec")
    except SyntaxError as exc:
        return [
            Diagnostic(
                severity="error",
                code="generated_code_syntax_error",
                message=f"Generated code syntax error: {exc}",
            )
        ]
    except Exception as exc:
        return [
            Diagnostic(
                severity="error",
                code="generated_code_compile_failed",
                message=f"Generated code syntax check failed: {exc}",
            )
        ]

    return []


def _response(code: str, diagnostics: list[Diagnostic]) -> CodegenResponse:
    return CodegenResponse(
        code=code,
        valid=not any(diagnostic.severity == "error" for diagnostic in diagnostics),
        diagnostics=diagnostics,
        generator_version=GENERATOR_VERSION,
        project_schema_version=PROJECT_SCHEMA_VERSION,
    )
