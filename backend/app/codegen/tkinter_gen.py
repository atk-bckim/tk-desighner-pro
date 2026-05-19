from app.models.project import Project


def _escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

# Props that are UI-only and should not appear in generated Tkinter code
_UI_ONLY_PROPS = {"activeTab"}

# ttk widget types (use ttk. prefix instead of tk.)
_TTK_TYPES = {"Notebook", "Progressbar", "Combobox", "Treeview", "Sizegrip", "Separator"}

# Props that should be rendered as Python tuples instead of strings
_TUPLE_PROPS = {"values"}

# Props that should be rendered unquoted (raw Python expressions)
_RAW_PROPS = {"font", "command", "variable", "textvariable"}


def _filter_props(props: dict) -> list[str]:
    parts: list[str] = []
    for k, v in props.items():
        if k in _UI_ONLY_PROPS or v == "" or v is None:
            continue
        if k in _RAW_PROPS:
            parts.append(f"{k}={v}")
        elif k in _TUPLE_PROPS and isinstance(v, str):
            items = ", ".join(f'"{_escape(item.strip())}"' for item in v.split(",") if item.strip())
            parts.append(f"{k}=({items},)")
        elif isinstance(v, str):
            parts.append(f'{k}="{_escape(v)}"')
        else:
            parts.append(f"{k}={v}")
    return parts


def _layout_call(var_name: str, w, indent: str = "    ") -> str:
    """Generate .place() or .grid() call based on layout_manager."""
    if w.layout_manager == "grid":
        parts = [f"row={w.grid_row or 0}", f"column={w.grid_col or 0}"]
        if w.grid_row_span and w.grid_row_span > 1:
            parts.append(f"rowspan={w.grid_row_span}")
        if w.grid_col_span and w.grid_col_span > 1:
            parts.append(f"columnspan={w.grid_col_span}")
        if w.grid_sticky:
            parts.append(f'sticky="{_escape(w.grid_sticky)}"')
        if w.grid_pad_x and w.grid_pad_x > 0:
            parts.append(f"padx={w.grid_pad_x}")
        if w.grid_pad_y and w.grid_pad_y > 0:
            parts.append(f"pady={w.grid_pad_y}")
        return f"{indent}{var_name}.grid({', '.join(parts)})"
    else:
        return (
            f"{indent}{var_name}.place("
            f"x={round(w.x)}, y={round(w.y)}, "
            f"width={round(w.width)}, height={round(w.height)})"
        )


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
    ]

    if project.root_bg:
        lines.append(f'    root.configure(bg="{_escape(project.root_bg)}")')

    if not project.root_resizable:
        lines.append("    root.resizable(False, False)")

    lines.append("")

    # Theme setup
    if project.tk_theme and project.tk_theme != "default":
        lines.append("    style = ttk.Style(root)")
        lines.append(f'    style.theme_use("{_escape(project.tk_theme)}")')
        lines.append("")

    # Menu bar
    if project.menu_bar and project.menu_bar.menus:
        lines.append("    menubar = tk.Menu(root)")
        for menu in project.menu_bar.menus:
            menu_var = f"menu_{menu.label.lower().replace(' ', '_')}"
            lines.append(f"    {menu_var} = tk.Menu(menubar, tearoff=0)")
            for item in menu.items:
                if item.separator:
                    lines.append(f"    {menu_var}.add_separator()")
                else:
                    acc_part = f', accelerator="{_escape(item.accelerator)}"' if item.accelerator else ""
                    lines.append(f'    {menu_var}.add_command(label="{_escape(item.label)}"{acc_part})')
            lines.append(f'    menubar.add_cascade(label="{_escape(menu.label)}", menu={menu_var})')
        lines.append("    root.config(menu=menubar)")
        lines.append("")

    # Generate Tkinter variable declarations
    if project.variables:
        for var in project.variables:
            default_part = f', value="{_escape(var.default_value)}"' if var.default_value else ""
            lines.append(f"    {var.name} = tk.{var.var_type}({default_part})")
        lines.append("")

    # Build parent-child map and name lookup
    children_map: dict[str | None, list] = {}
    name_map: dict[str, str] = {}  # id -> var_name
    for w in project.widgets:
        pid = w.parent_id
        children_map.setdefault(pid, []).append(w)
        name_map[w.id] = w.name if w.name else f"{w.type.lower()}_{w.id[:8]}"

    def render_widget(w, parent_var: str, indent: str = "    "):
        var_name = name_map.get(w.id, f"{w.type.lower()}_{w.id[:8]}")

        # Special handling for Notebook
        if w.type == "Notebook":
            lines.append(f"{indent}{var_name} = ttk.Notebook({parent_var})")
            lines.append(_layout_call(var_name, w, indent))
            lines.append("")
            for tab in children_map.get(w.id, []):
                tab_var = name_map.get(tab.id, f"frame_{tab.id[:8]}")
                lines.append(f"{indent}{tab_var} = ttk.Frame({var_name})")
                lines.append(
                    f"{indent}{var_name}.add({tab_var}, text=\"{_escape(str(tab.props.get('text', '')))}\")"
                )
                for child in children_map.get(tab.id, []):
                    render_widget(child, tab_var, indent)
                lines.append("")
            return

        # Special handling for Toplevel
        if w.type == "Toplevel":
            title = str(w.props.get("title", ""))
            props_parts = [p for p in _filter_props(w.props) if not p.startswith("title=")]
            props_str = ", " + ", ".join(props_parts) if props_parts else ""
            lines.append(f"{indent}{var_name} = tk.Toplevel({parent_var}{props_str})")
            if title:
                lines.append(f'{indent}{var_name}.title("{_escape(title)}")')
            lines.append(_layout_call(var_name, w, indent))
            lines.append("")
            for child in children_map.get(w.id, []):
                render_widget(child, var_name, indent)
            return

        # Special handling for OptionMenu
        if w.type == "OptionMenu":
            values_str = str(w.props.get("values", ""))
            values = [v.strip() for v in values_str.split(",") if v.strip()]
            default_val = _escape(values[0]) if values else ""
            values_py = ", ".join(f'"{_escape(v)}"' for v in values) if values else '""'
            lines.append(f"{indent}{var_name}_var = tk.StringVar(value=\"{default_val}\")")
            lines.append(f"{indent}{var_name} = tk.OptionMenu({parent_var}, {var_name}_var, {values_py})")
            lines.append(_layout_call(var_name, w, indent))
            lines.append("")
            for child in children_map.get(w.id, []):
                render_widget(child, var_name, indent)
            return

        props_parts = _filter_props(w.props)
        props_str = ", " + ", ".join(props_parts) if props_parts else ""
        module = "ttk" if w.type in _TTK_TYPES else "tk"
        lines.append(f"{indent}{var_name} = {module}.{w.type}({parent_var}{props_str})")
        lines.append(_layout_call(var_name, w, indent))
        lines.append("")
        for child in children_map.get(w.id, []):
            render_widget(child, var_name, indent)

    for w in children_map.get(None, []):
        render_widget(w, "root")

    # Generate binding code for Scrollbar ↔ Text/Listbox
    for w in project.widgets:
        if w.type == "Scrollbar" and w.bindings and w.bindings.command:
            scrollbar_var = name_map.get(w.id, f"scrollbar_{w.id[:8]}")
            target_var = name_map.get(w.bindings.command, f"widget_{w.bindings.command[:8]}")
            orient = str(w.props.get("orient", "vertical"))
            if orient == "vertical":
                lines.append(f"    {scrollbar_var}.config(command={target_var}.yview)")
                lines.append(f"    {target_var}.config(yscrollcommand={scrollbar_var}.set)")
            else:
                lines.append(f"    {scrollbar_var}.config(command={target_var}.xview)")
                lines.append(f"    {target_var}.config(xscrollcommand={scrollbar_var}.set)")
            lines.append("")

    # Generate event binding code
    for w in project.widgets:
        if not w.events:
            continue
        var_name = name_map.get(w.id, f"{w.type.lower()}_{w.id[:8]}")
        first_event = True
        for event_name, code in w.events.items():
            if not code or not code.strip():
                continue
            if not first_event:
                lines.append("")
            first_event = False
            code_lines = code.strip().split("\n")
            if event_name == "command":
                func_name = f"_{var_name}_command"
                lines.append(f"    def {func_name}():")
                for cl in code_lines:
                    lines.append(f"        {cl}")
                lines.append(f"    {var_name}.config(command={func_name})")
            else:
                sanitized = event_name.replace("<", "").replace(">", "").replace(" ", "_")
                func_name = f"_{var_name}_{sanitized}"
                lines.append(f"    def {func_name}(event):")
                for cl in code_lines:
                    lines.append(f"        {cl}")
                lines.append(f'    {var_name}.bind("{_escape(event_name)}", {func_name})')

    lines.append("    return root")
    lines.append("")
    lines.append("")
    lines.append('if __name__ == "__main__":')
    lines.append("    app = create_window()")
    lines.append("    app.mainloop()")
    lines.append("")

    return "\n".join(lines)
