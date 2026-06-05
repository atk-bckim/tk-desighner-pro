from collections.abc import Iterable

from app.models.api import Diagnostic
from app.models.project import Project


def validate_project(project: Project) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []

    names: dict[str, list[str]] = {}
    for widget in project.widgets:
        names.setdefault(widget.name, []).append(widget.id)

    for name, widget_ids in names.items():
        if len(widget_ids) > 1:
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    code="duplicate_widget_name",
                    message=f"Duplicate widget name: '{name}' ({len(widget_ids)} widgets)",
                    path="widgets",
                    widget_name=name,
                )
            )

    widget_ids = {widget.id for widget in project.widgets}
    for index, widget in enumerate(project.widgets):
        if widget.parent_id and widget.parent_id not in widget_ids:
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    code="orphan_parent_reference",
                    message=(
                        f"Widget '{widget.name}' references non-existent parent "
                        f"'{widget.parent_id}'"
                    ),
                    path=f"widgets[{index}].parent_id",
                    widget_id=widget.id,
                    widget_name=widget.name,
                )
            )

    for index, widget in enumerate(project.widgets):
        if (
            widget.bindings
            and widget.bindings.command
            and widget.bindings.command not in widget_ids
        ):
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    code="missing_scrollbar_binding_target",
                    message=f"Scrollbar '{widget.name}' links to non-existent widget",
                    path=f"widgets[{index}].bindings.command",
                    widget_id=widget.id,
                    widget_name=widget.name,
                )
            )

    return diagnostics


def diagnostic_error_messages(diagnostics: Iterable[Diagnostic]) -> list[str]:
    return [
        diagnostic.message
        for diagnostic in diagnostics
        if diagnostic.severity == "error"
    ]
