from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from app.models.project import Project
from app.codegen.tkinter_gen import generate_tkinter_code

router = APIRouter()


@router.post("/export")
def export(project: Project):
    code = generate_tkinter_code(project)
    filename = project.name.replace(" ", "_") + ".py"
    return PlainTextResponse(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
