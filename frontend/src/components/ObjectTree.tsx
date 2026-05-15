import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import { useState } from "react";

function TreeNode({ widget, depth = 0 }: { widget: WidgetInstance; depth?: number }) {
  const { widgets, selectedId, selectWidget } = useDesignerStore();
  const [expanded, setExpanded] = useState(true);
  const children = widgets.filter(w => w.parentId === widget.id);
  const isSelected = selectedId === widget.id;
  const isContainer = widget.type === "Frame" || widget.type === "LabelFrame";

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 cursor-pointer text-xs hover:bg-gray-700 ${isSelected ? "bg-blue-900/50 text-blue-300" : "text-gray-300"}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => selectWidget(widget.id)}
      >
        {(isContainer || children.length > 0) ? (
          <button className="w-3 text-gray-500 shrink-0" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? "\u25BE" : "\u25B8"}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="truncate flex-1">{widget.name || String(widget.props.text ?? widget.type)}</span>
        {widget.locked && <span className="text-amber-500 text-[8px]">&#128274;</span>}
        <span className="text-gray-600 text-right">{widget.type}</span>
      </div>
      {expanded && children.map(child => <TreeNode key={child.id} widget={child} depth={depth + 1} />)}
    </div>
  );
}

export function ObjectTree() {
  const { widgets } = useDesignerStore();
  const rootWidgets = widgets.filter(w => w.parentId === null);

  return (
    <div className="bg-gray-800 border-r border-gray-700 overflow-y-auto shrink-0" style={{ width: "200px" }}>
      <h2 className="text-xs font-semibold text-gray-400 px-3 py-2 border-b border-gray-700">Objects</h2>
      {rootWidgets.length === 0 && (
        <p className="text-xs text-gray-600 px-3 py-2">No widgets</p>
      )}
      {rootWidgets.map(w => <TreeNode key={w.id} widget={w} />)}
    </div>
  );
}
