import re
import py_compile
import tempfile

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from app.models.project import Project
from app.codegen.tkinter_gen import generate_tkinter_code

router = APIRouter()


@router.post("/validate")
def validate(project: Project):
    errors: list[str] = []

    # Check widget name collisions
    names: dict[str, list[str]] = {}
    for w in project.widgets:
        if w.name in names:
            names[w.name].append(w.id)
        else:
            names[w.name] = [w.id]
    for name, ids in names.items():
        if len(ids) > 1:
            errors.append(f"Duplicate widget name: '{name}' ({len(ids)} widgets)")

    # Check parent references
    widget_ids = {w.id for w in project.widgets}
    for w in project.widgets:
        if w.parent_id and w.parent_id not in widget_ids:
            errors.append(f"Widget '{w.name}' references non-existent parent '{w.parent_id}'")

    # Check binding references
    for w in project.widgets:
        if w.bindings:
            if w.bindings.command and w.bindings.command not in widget_ids:
                errors.append(f"Scrollbar '{w.name}' links to non-existent widget")

    # Syntax check generated code
    code = generate_tkinter_code(project)
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(code)
            tmp_path = f.name
        py_compile.compile(tmp_path, doraise=True)
    except py_compile.PyCompileError as e:
        errors.append(f"Generated code syntax error: {e}")
    finally:
        try:
            import os
            os.unlink(tmp_path)
        except Exception:
            pass

    return {"valid": len(errors) == 0, "errors": errors}


@router.post("/export")
def export(project: Project):
    code = generate_tkinter_code(project)
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', project.name) or "output"
    filename = safe_name + ".py"
    return PlainTextResponse(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
