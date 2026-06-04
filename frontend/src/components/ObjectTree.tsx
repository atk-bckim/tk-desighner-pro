import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import { useState, useRef } from "react";

function isContainer(widget: WidgetInstance): boolean {
  return widget.type === "Frame" || widget.type === "LabelFrame" || widget.type === "Notebook" || widget.type === "Toplevel";
}

function matchesSearch(widget: WidgetInstance, query: string, allWidgets: WidgetInstance[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (widget.name.toLowerCase().includes(q)) return true;
  if (widget.type.toLowerCase().includes(q)) return true;
  if (String(widget.props.text ?? "").toLowerCase().includes(q)) return true;
  if (widget.parentId) {
    const parent = allWidgets.find(w => w.id === widget.parentId);
    if (parent && matchesSearch(parent, q, allWidgets)) return true;
  }
  return false;
}

function TreeNode({ widget, depth = 0, onDragStart, onDrop, searchQuery, allWidgets }: {
  widget: WidgetInstance;
  depth?: number;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string | null) => void;
  searchQuery: string;
  allWidgets: WidgetInstance[];
}) {
  const { widgets, selectedIds, selectWidget } = useDesignerStore();
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const children = widgets.filter(w => w.parentId === widget.id);
  const isSelected = selectedIds.includes(widget.id);
  const container = isContainer(widget) || children.length > 0;

  const visibleChildren = searchQuery
    ? children.filter(c => matchesSearch(c, searchQuery, allWidgets))
    : children;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 cursor-pointer text-xs transition-colors duration-100 ${
          isSelected ? "bg-[#06b6d4]/15 text-[#06b6d4]" : "text-[#8888a8] hover:bg-[#2d2d42] hover:text-[#d4d4e8]"
        } ${dragOver ? "bg-[#06b6d4]/25 ring-1 ring-[#06b6d4]/50" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => selectWidget(widget.id)}
        draggable
        onDragStart={(e) => onDragStart(e, widget.id)}
        onDragOver={(e) => {
          if (!container) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); onDrop(e, widget.id); }}
      >
        {container ? (
          <button className="w-3 text-[#5a5a72] shrink-0 text-[10px] hover:text-[#8888a8]" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? "\u25BE" : "\u25B8"}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="truncate flex-1">{widget.name || String(widget.props.text ?? widget.type)}</span>
        {widget.locked && <span className="text-amber-500 text-[8px]">&#128274;</span>}
        <span className="text-[#5a5a72] text-[10px] text-right">{widget.type}</span>
      </div>
      {expanded && visibleChildren.map(child => (
        <TreeNode key={child.id} widget={child} depth={depth + 1} onDragStart={onDragStart} onDrop={onDrop} searchQuery={searchQuery} allWidgets={allWidgets} />
      ))}
    </div>
  );
}

export function ObjectTree() {
  const { widgets, reparentWidget, snapshot, projectName, selectedIds, selectWidget, canvasWidth, canvasHeight } = useDesignerStore();
  const draggedIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rootExpanded, setRootExpanded] = useState(true);
  const isRootSelected = selectedIds.length === 0;

  // Split: non-Toplevel with no parent → children of root node
  //         Toplevel with no parent → separate window nodes
  const rootChildren = widgets.filter(w => w.parentId === null && w.type !== "Toplevel");
  const toplevels = widgets.filter(w => w.parentId === null && w.type === "Toplevel");

  const filteredRootChildren = searchQuery
    ? rootChildren.filter(w => matchesSearch(w, searchQuery, widgets))
    : rootChildren;

  const filteredToplevels = searchQuery
    ? toplevels.filter(w => matchesSearch(w, searchQuery, widgets))
    : toplevels;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDropOnWidget = (_e: React.DragEvent, targetId: string | null) => {
    const draggedId = draggedIdRef.current;
    draggedIdRef.current = null;
    if (!draggedId || draggedId === targetId) return;
    if (targetId !== null) {
      const target = widgets.find(w => w.id === targetId);
      if (!target || !isContainer(target)) return;
    }
    snapshot();
    reparentWidget(draggedId, targetId);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = draggedIdRef.current;
    draggedIdRef.current = null;
    if (!draggedId) return;
    snapshot();
    reparentWidget(draggedId, null);
  };

  return (
    <div
      className="bg-[#1e1e2e] border-r border-[#3c3c52] overflow-y-auto shrink-0 flex flex-col"
      style={{ width: "180px" }}
      onDragOver={(e) => e.preventDefault()}
    >
      <h2 className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wider px-3 py-2 border-b border-[#3c3c52]">Objects</h2>
      <div className="px-2 py-1.5 border-b border-[#3c3c52]">
        <input
          type="text"
          placeholder="Filter..."
          className="w-full bg-[#252536] border border-[#3c3c52] rounded px-2 py-0.5 text-[10px] text-[#d4d4e8] placeholder-[#5a5a72] focus:border-[#06b6d4] focus:outline-none transition-colors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main window root node */}
      <div
        className={`flex items-center gap-1 py-0.5 cursor-pointer text-xs transition-colors duration-100 ${
          isRootSelected ? "bg-[#06b6d4]/15 text-[#06b6d4]" : "text-[#8888a8] hover:bg-[#2d2d42] hover:text-[#d4d4e8]"
        }`}
        style={{ paddingLeft: "8px" }}
        onClick={() => selectWidget(null)}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDropOnRoot}
      >
        <button className="w-3 text-[#5a5a72] shrink-0 text-[10px] hover:text-[#8888a8]" onClick={(e) => { e.stopPropagation(); setRootExpanded(!rootExpanded); }}>
          {rootExpanded ? "\u25BE" : "\u25B8"}
        </button>
        <span className="truncate flex-1 font-medium">{projectName}</span>
        <span className="text-[10px] text-[#06b6d4]">{canvasWidth}x{canvasHeight}</span>
      </div>

      {/* Main window's children (non-Toplevel root widgets) */}
      {rootExpanded && filteredRootChildren.map(w => (
        <TreeNode key={w.id} widget={w} onDragStart={handleDragStart} onDrop={handleDropOnWidget} searchQuery={searchQuery} allWidgets={widgets} />
      ))}

      {/* Toplevel windows as separate root nodes */}
      {filteredToplevels.map(w => (
        <TreeNode key={w.id} widget={w} depth={0} onDragStart={handleDragStart} onDrop={handleDropOnWidget} searchQuery={searchQuery} allWidgets={widgets} />
      ))}

      {widgets.length === 0 && !searchQuery && (
        <p className="text-[10px] text-[#5a5a72] px-3 py-2 pl-7">Drop widgets here</p>
      )}
    </div>
  );
}
