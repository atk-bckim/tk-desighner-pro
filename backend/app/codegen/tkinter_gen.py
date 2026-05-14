from app.models.project import Project


def generate_tkinter_code(project: Project) -> str:
    lines = [
        "import tkinter as tk",
        "",
        "",
        "def create_window():",
        "    root = tk.Tk()",
        f'    root.geometry("{project.canvas_width}x{project.canvas_height}")',
        f'    root.title("{project.name}")',
        "",
    ]

    for w in project.widgets:
        var_name = f"{w.type.lower()}_{w.id[:6]}"
        props_parts: list[str] = []
        for k, v in w.props.items():
            if v == "" or v is None:
                continue
            if isinstance(v, str):
                props_parts.append(f'{k}="{v}"')
            else:
                props_parts.append(f"{k}={v}")

        props_str = ", " + ", ".join(props_parts) if props_parts else ""
        lines.append(f"    {var_name} = tk.{w.type}(root{props_str})")
        lines.append(
            f"    {var_name}.place("
            f"x={round(w.x)}, y={round(w.y)}, "
            f"width={round(w.width)}, height={round(w.height)})"
        )
        lines.append("")

    lines.append("    return root")
    lines.append("")
    lines.append("")
    lines.append('if __name__ == "__main__":')
    lines.append("    app = create_window()")
    lines.append("    app.mainloop()")
    lines.append("")

    return "\n".join(lines)
