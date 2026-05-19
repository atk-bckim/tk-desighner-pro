import { useDesignerStore } from "../store/designerStore";
import type { NonVisualComponent, ProjectResource } from "../types/widgets";
import { useState } from "react";

const TTK_TYPES = new Set(["Notebook", "Progressbar", "Combobox", "Treeview", "Sizegrip", "Separator"]);
const TUPLE_PROPS = new Set(["values"]);
const RAW_PROPS = new Set(["font", "command", "variable", "textvariable"]);

function escapePy(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function generateCode(
  widgets: ReturnType<typeof useDesignerStore.getState>["widgets"],
  canvasWidth: number,
  canvasHeight: number,
  tkTheme: string,
  menuBar: ReturnType<typeof useDesignerStore.getState>["menuBar"],
  projectName: string,
  rootBg: string,
  rootResizable: boolean,
  nonVisuals: NonVisualComponent[],
  resources: ProjectResource[],
): string {
  // Track non-visual imports
  const nvImports: string[] = [];
  if (nonVisuals.some(nv => nv.type === "FileDialog")) nvImports.push("filedialog");
  if (nonVisuals.some(nv => nv.type === "ColorChooser")) nvImports.push("colorchooser");
  if (nonVisuals.some(nv => nv.type === "MessageBox")) nvImports.push("messagebox");

  const lines: string[] = [
    "import tkinter as tk",
    "from tkinter import ttk",
  ];
  if (nvImports.length > 0) {
    lines.push(`from tkinter import ${nvImports.join(", ")}`);
  }
  lines.push("", "", "def create_window():", `    root = tk.Tk()`, `    root.geometry("${canvasWidth}x${canvasHeight}")`, `    root.title("${escapePy(projectName)}")`);

  if (rootBg) {
    lines.push(`    root.configure(bg="${escapePy(rootBg)}")`);
  }
  if (!rootResizable) {
    lines.push("    root.resizable(False, False)");
  }
  lines.push("");

  if (tkTheme && tkTheme !== "default") {
    lines.push("    style = ttk.Style(root)");
    lines.push(`    style.theme_use("${tkTheme}")`);
    lines.push("");
  }

  // Generate PhotoImage declarations for used resources
  const usedResourceIds = new Set<string>();
  for (const w of widgets) {
    if (w.props.image && typeof w.props.image === "string") {
      usedResourceIds.add(w.props.image);
    }
  }
  const usedResources = resources.filter(r => usedResourceIds.has(r.id));
  if (usedResources.length > 0) {
    lines.push("    # Image resources");
    for (const res of usedResources) {
      lines.push(`    ${res.name.replace(/[^a-zA-Z0-9_]/g, "_")} = tk.PhotoImage(data="${escapePy(res.dataUrl)}")`);
    }
    lines.push("");
  }

  // Menu bar
  if (menuBar && menuBar.menus.length > 0) {
    lines.push("    menubar = tk.Menu(root)");
    for (const menu of menuBar.menus) {
      const menuVar = `menu_${menu.label.toLowerCase().replace(/\s+/g, "_")}`;
      lines.push(`    ${menuVar} = tk.Menu(menubar, tearoff=0)`);
      for (const item of menu.items) {
        if (item.separator) {
          lines.push(`    ${menuVar}.add_separator()`);
        } else {
          const accPart = item.accelerator ? `, accelerator="${escapePy(item.accelerator)}"` : "";
          lines.push(`    ${menuVar}.add_command(label="${escapePy(item.label)}"${accPart})`);
        }
      }
      lines.push(`    menubar.add_cascade(label="${escapePy(menu.label)}", menu=${menuVar})`);
    }
    lines.push("    root.config(menu=menubar)");
    lines.push("");
  }

  // Build parent-child map
  const childrenMap = new Map<string | null, typeof widgets>();
  for (const w of widgets) {
    const pid = w.parentId ?? null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(w);
  }

  const renderProps = (w: typeof widgets[0], excludeKeys: Set<string> = new Set()): string => {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(w.props)) {
      if (excludeKeys.has(k) || v === "" || v === undefined || v === null) continue;
      if (k === "image") {
        const resource = resources.find(r => r.id === v);
        if (resource) {
          parts.push(`image=${resource.name.replace(/[^a-zA-Z0-9_]/g, "_")}`);
        }
        continue;
      }
      if (RAW_PROPS.has(k)) {
        parts.push(`${k}=${v}`);
      } else if (TUPLE_PROPS.has(k) && typeof v === "string") {
        const items = (v as string).split(",").map(s => s.trim()).filter(Boolean).map(s => `"${escapePy(s)}"`).join(", ");
        parts.push(`${k}=(${items},)`);
      } else if (typeof v === "string") {
        parts.push(`${k}="${escapePy(v)}"`);
      } else {
        parts.push(`${k}=${v}`);
      }
    }
    return parts.length > 0 ? ", " + parts.join(", ") : "";
  };

  const renderWidget = (w: typeof widgets[0], parentVar: string, indent: string) => {
    const varName = w.name || `${w.type.toLowerCase()}_${w.id.slice(0, 8)}`;

    // Helper to generate layout call
    const layoutCall = () => {
      if (w.layoutManager === "grid") {
        const parts: string[] = [`row=${w.gridRow ?? 0}`, `column=${w.gridCol ?? 0}`];
        if (w.gridRowSpan && w.gridRowSpan > 1) parts.push(`rowspan=${w.gridRowSpan}`);
        if (w.gridColSpan && w.gridColSpan > 1) parts.push(`columnspan=${w.gridColSpan}`);
        if (w.gridSticky) parts.push(`sticky="${escapePy(w.gridSticky)}"`);
        if (w.gridPadX && w.gridPadX > 0) parts.push(`padx=${w.gridPadX}`);
        if (w.gridPadY && w.gridPadY > 0) parts.push(`pady=${w.gridPadY}`);
        return `${indent}${varName}.grid(${parts.join(", ")})`;
      }
      return `${indent}${varName}.place(x=${Math.round(w.x)}, y=${Math.round(w.y)}, width=${Math.round(w.width)}, height=${Math.round(w.height)})`;
    };

    // Notebook
    if (w.type === "Notebook") {
      lines.push(`${indent}${varName} = ttk.Notebook(${parentVar})`);
      lines.push(layoutCall());
      lines.push("");
      const tabs = childrenMap.get(w.id) || [];
      for (const tab of tabs) {
        const tabVar = tab.name || `frame_${tab.id.slice(0, 8)}`;
        lines.push(`${indent}${tabVar} = ttk.Frame(${varName})`);
        lines.push(`${indent}${varName}.add(${tabVar}, text="${escapePy(String(tab.props.text ?? ""))}")`);
        const tabChildren = childrenMap.get(tab.id) || [];
        for (const child of tabChildren) {
          renderWidget(child, tabVar, indent);
        }
        lines.push("");
      }
      return;
    }

    // Toplevel
    if (w.type === "Toplevel") {
      const title = String(w.props.title ?? "");
      const propsStr = renderProps(w, new Set(["title"]));
      lines.push(`${indent}${varName} = tk.Toplevel(${parentVar}${propsStr})`);
      if (title) lines.push(`${indent}${varName}.title("${escapePy(title)}")`);
      lines.push(layoutCall());
      lines.push("");
      const children = childrenMap.get(w.id) || [];
      for (const child of children) {
        renderWidget(child, varName, indent);
      }
      return;
    }

    // OptionMenu
    if (w.type === "OptionMenu") {
      const valuesStr = String(w.props.values ?? "");
      const values = valuesStr.split(",").map(s => s.trim()).filter(Boolean);
      const defaultVal = values[0] || "";
      const valuesPy = values.map(v => `"${escapePy(v)}"`).join(", ") || '""';
      lines.push(`${indent}${varName}_var = tk.StringVar(value="${escapePy(defaultVal)}")`);
      lines.push(`${indent}${varName} = tk.OptionMenu(${parentVar}, ${varName}_var, ${valuesPy})`);
      lines.push(layoutCall());
      lines.push("");
      const optChildren = childrenMap.get(w.id) || [];
      for (const child of optChildren) {
        renderWidget(child, varName, indent);
      }
      return;
    }

    // Regular widgets
    const propsStr = renderProps(w);
    const module = TTK_TYPES.has(w.type) ? "ttk" : "tk";
    lines.push(`${indent}${varName} = ${module}.${w.type}(${parentVar}${propsStr})`);
    lines.push(layoutCall());
    lines.push("");
    const children = childrenMap.get(w.id) || [];
    for (const child of children) {
      renderWidget(child, varName, indent);
    }
  };

  const rootWidgets = childrenMap.get(null) || [];
  for (const w of rootWidgets) {
    renderWidget(w, "root", "    ");
  }

  // Generate non-visual component code
  if (nonVisuals.length > 0) {
    lines.push("    # Non-visual components");
    for (const nv of nonVisuals) {
      if (nv.type === "Timer") {
        const interval = Number(nv.props.interval) || 1000;
        const oneshot = !!nv.props.oneshot;
        lines.push(`    # ${nv.name}: root.after(${interval}, callback)${oneshot ? "  # one-shot" : ""}`);
      } else if (nv.type === "FileDialog") {
        const mode = String(nv.props.mode ?? "open");
        const title = String(nv.props.title ?? "");
        const titlePart = title ? `, title="${escapePy(title)}"` : "";
        if (mode === "save") {
          lines.push(`    # ${nv.name}: filedialog.asksaveasfilename(${titlePart.replace(", ", "")})`);
        } else if (mode === "directory") {
          lines.push(`    # ${nv.name}: filedialog.askdirectory(${titlePart.replace(", ", "")})`);
        } else {
          lines.push(`    # ${nv.name}: filedialog.askopenfilename(${titlePart.replace(", ", "")})`);
        }
      } else if (nv.type === "ColorChooser") {
        const title = String(nv.props.title ?? "");
        const titlePart = title ? `title="${escapePy(title)}"` : "";
        lines.push(`    # ${nv.name}: colorchooser.askcolor(${titlePart})`);
      } else if (nv.type === "MessageBox") {
        const mbType = String(nv.props.mbType ?? "info");
        const title = String(nv.props.title ?? "");
        const message = String(nv.props.message ?? "");
        if (mbType === "yesno") {
          lines.push(`    # ${nv.name}: messagebox.askyesno(title="${escapePy(title)}", message="${escapePy(message)}")`);
        } else if (mbType === "warning") {
          lines.push(`    # ${nv.name}: messagebox.showwarning(title="${escapePy(title)}", message="${escapePy(message)}")`);
        } else if (mbType === "error") {
          lines.push(`    # ${nv.name}: messagebox.showerror(title="${escapePy(title)}", message="${escapePy(message)}")`);
        } else {
          lines.push(`    # ${nv.name}: messagebox.showinfo(title="${escapePy(title)}", message="${escapePy(message)}")`);
        }
      }
    }
    lines.push("");
  }

  // Generate binding code for Scrollbar ↔ Text/Listbox
  const nameMap = new Map<string, string>();
  for (const w of widgets) {
    nameMap.set(w.id, w.name || `${w.type.toLowerCase()}_${w.id.slice(0, 8)}`);
  }
  for (const w of widgets) {
    if (w.type === "Scrollbar" && w.bindings?.command) {
      const sbVar = nameMap.get(w.id) || `scrollbar_${w.id.slice(0, 8)}`;
      const tgtVar = nameMap.get(w.bindings.command) || `widget_${w.bindings.command.slice(0, 8)}`;
      const orient = String(w.props.orient ?? "vertical");
      if (orient === "vertical") {
        lines.push(`    ${sbVar}.config(command=${tgtVar}.yview)`);
        lines.push(`    ${tgtVar}.config(yscrollcommand=${sbVar}.set)`);
      } else {
        lines.push(`    ${sbVar}.config(command=${tgtVar}.xview)`);
        lines.push(`    ${tgtVar}.config(xscrollcommand=${sbVar}.set)`);
      }
      lines.push("");
    }
  }

  lines.push("    return root");
  lines.push("");
  lines.push("");
  lines.push('if __name__ == "__main__":');
  lines.push("    app = create_window()");
  lines.push("    app.mainloop()");
  lines.push("");

  return lines.join("\n");
}

export function CodePreview() {
  const { widgets, canvasWidth, canvasHeight, tkTheme, menuBar, projectName, rootBg, rootResizable, nonVisuals, resources } = useDesignerStore();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const code = generateCode(widgets, canvasWidth, canvasHeight, tkTheme, menuBar, projectName, rootBg, rootResizable, nonVisuals, resources);

  const handleValidate = async () => {
    try {
      const store = useDesignerStore.getState();
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.projectName,
          canvas_width: store.canvasWidth,
          canvas_height: store.canvasHeight,
          tk_theme: store.tkTheme,
          widgets: store.widgets.map(w => ({
            id: w.id, type: w.type, name: w.name, parent_id: w.parentId,
            x: w.x, y: w.y, width: w.width, height: w.height, props: w.props,
            bindings: w.bindings || {}, events: w.events || {},
            layout_manager: w.layoutManager ?? "place",
            grid_row: w.gridRow ?? null,
            grid_col: w.gridCol ?? null,
            grid_row_span: w.gridRowSpan ?? null,
            grid_col_span: w.gridColSpan ?? null,
            grid_sticky: w.gridSticky ?? null,
            grid_pad_x: w.gridPadX ?? null,
            grid_pad_y: w.gridPadY ?? null,
          })),
          menu_bar: store.menuBar,
          variables: store.variables,
          non_visuals: store.nonVisuals ?? [],
          resources: (store.resources ?? []).map(r => ({ id: r.id, name: r.name, type: r.type, data_url: r.dataUrl })),
        }),
      });
      const data = await res.json();
      setErrors(data.errors || []);
    } catch {
      setErrors(["Validation request failed"]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-[#252536] border-t border-[#3c3c52] shrink-0">
      <div className="flex items-center justify-between px-4 py-1.5">
        <button
          className="text-xs text-[#8888a8] hover:text-[#d4d4e8] flex items-center gap-2 transition-colors"
          onClick={() => setOpen(!open)}
        >
          <span>Generated Code ({widgets.length} widgets)</span>
          <span className="text-[10px]">{open ? "▾" : "▸"}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleValidate}
            className="text-[10px] bg-[#1e1e2e] border border-[#3c3c52] hover:border-[#06b6d4]/50 text-[#8888a8] hover:text-[#d4d4e8] px-2 py-0.5 rounded transition-colors"
          >
            {errors.length > 0 ? `${errors.length} issues` : "Check"}
          </button>
          <button
            onClick={handleCopy}
            className="text-[10px] bg-[#1e1e2e] border border-[#3c3c52] hover:border-[#06b6d4]/50 text-[#8888a8] hover:text-[#d4d4e8] px-2 py-0.5 rounded transition-colors"
          >
          {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {open && (
        <>
          <pre className="px-4 pb-3 text-[11px] text-[#10b981] overflow-auto max-h-48 font-mono">
            {code}
          </pre>
          {errors.length > 0 && (
            <div className="px-4 pb-2">
              {errors.map((err, i) => (
                <div key={i} className="text-[10px] text-[#f59e0b] flex items-center gap-1 mb-0.5">
                  <span>&#9888;</span> {err}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
