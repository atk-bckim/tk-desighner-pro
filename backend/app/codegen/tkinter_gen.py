from app.models.project import Project


def _escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def generate_tkinter_code(project: Project) -> str:
    lines = [
        "import tkinter as tk",
        "from tkinter import ttk",
        "",
        "",
        "def create_window():",
        "    root = tk.Tk()",
        f'    root.geometry("{project.canvas_width}x{project.canvas_height}")',
        f'    root.title("{_escape(project.name)}")',
        "",
    ]

    # Build parent-child map
    children_map: dict[str | None, list] = {}
    for w in project.widgets:
        pid = w.parent_id
        children_map.setdefault(pid, []).append(w)

    def render_widget(w, parent_var: str, indent: str = "    "):
        var_name = w.name if w.name else f"{w.type.lower()}_{w.id[:8]}"

        # Special handling for Notebook
        if w.type == "Notebook":
            lines.append(f"{indent}{var_name} = ttk.Notebook({parent_var})")
            lines.append(
                f"{indent}{var_name}.place("
                f"x={round(w.x)}, y={round(w.y)}, "
                f"width={round(w.width)}, height={round(w.height)})"
            )
            lines.append("")
            for tab in children_map.get(w.id, []):
                tab_var = tab.name if tab.name else f"frame_{tab.id[:8]}"
                lines.append(f"{indent}    {tab_var} = ttk.Frame({var_name})")
                lines.append(
                    f"{indent}    {var_name}.add({tab_var}, text=\"{_escape(str(tab.props.get('text', '')))}\")"
                )
                # render tab children inside the tab frame
                for child in children_map.get(tab.id, []):
                    render_widget(child, tab_var, indent + "        ")
                lines.append("")
            return

        props_parts: list[str] = []
        for k, v in w.props.items():
            if v == "" or v is None:
                continue
            if isinstance(v, str):
                props_parts.append(f'{k}="{_escape(v)}"')
            else:
                props_parts.append(f"{k}={v}")

        props_str = ", " + ", ".join(props_parts) if props_parts else ""
        lines.append(f"{indent}{var_name} = tk.{w.type}({parent_var}{props_str})")
        lines.append(
            f"{indent}{var_name}.place("
            f"x={round(w.x)}, y={round(w.y)}, "
            f"width={round(w.width)}, height={round(w.height)})"
        )
        lines.append("")
        for child in children_map.get(w.id, []):
            render_widget(child, var_name, indent + "    ")

    for w in children_map.get(None, []):
        render_widget(w, "root")

    lines.append("    return root")
    lines.append("")
    lines.append("")
    lines.append('if __name__ == "__main__":')
    lines.append("    app = create_window()")
    lines.append("    app.mainloop()")
    lines.append("")

    return "\n".join(lines)
