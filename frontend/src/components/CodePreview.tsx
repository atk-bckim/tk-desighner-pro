import { useDesignerStore } from "../store/designerStore";
import { useState } from "react";

function generateCode(
  widgets: ReturnType<typeof useDesignerStore.getState>["widgets"],
  canvasWidth: number,
  canvasHeight: number,
): string {
  const lines: string[] = [
    "import tkinter as tk",
    "",
    "",
    "def create_window():",
    `    root = tk.Tk()`,
    `    root.geometry("${canvasWidth}x${canvasHeight}")`,
    `    root.title("Tkinter Designer")`,
    "",
  ];

  for (const w of widgets) {
    const varName = `${w.type.toLowerCase()}_${w.id.slice(0, 6)}`;
    const propsParts: string[] = [];
    for (const [k, v] of Object.entries(w.props)) {
      if (v === "" || v === undefined || v === null) continue;
      if (typeof v === "string") {
        propsParts.push(`${k}="${v}"`);
      } else {
        propsParts.push(`${k}=${v}`);
      }
    }

    const propsStr = propsParts.length > 0 ? ", " + propsParts.join(", ") : "";
    lines.push(`    ${varName} = tk.${w.type}(root${propsStr})`);
    lines.push(
      `    ${varName}.place(x=${Math.round(w.x)}, y=${Math.round(w.y)}, width=${Math.round(w.width)}, height=${Math.round(w.height)})`,
    );
    lines.push("");
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
  const { widgets, canvasWidth, canvasHeight } = useDesignerStore();
  const [open, setOpen] = useState(false);
  const code = generateCode(widgets, canvasWidth, canvasHeight);

  return (
    <div className="bg-gray-800 border-t border-gray-700 shrink-0">
      <button
        className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <span>Generated Code ({widgets.length} widgets)</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <pre className="px-4 pb-3 text-xs text-green-300 overflow-auto max-h-48 font-mono">
          {code}
        </pre>
      )}
    </div>
  );
}
