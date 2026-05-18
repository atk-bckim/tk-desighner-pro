import { useDroppable } from "@dnd-kit/core";
import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import { getAbsolutePosition } from "../utils/position";
import { ContextMenu } from "./ContextMenu";
import { EventEditorModal } from "./EventEditorModal";
import { Ruler } from "./Ruler";
import { WIDGET_EVENTS } from "../utils/widgetDefaults";
import React, { useRef, useCallback, useState, useEffect } from "react";

function getWidgetDynamicStyle(widget: WidgetInstance): React.CSSProperties {
  const props = widget.props;
  const style: React.CSSProperties = {};

  if (props.bg && typeof props.bg === "string") style.backgroundColor = props.bg;
  if (props.fg && typeof props.fg === "string") style.color = props.fg;

  const bd = typeof props.bd === "number" ? props.bd : undefined;
  if (bd !== undefined) style.borderWidth = `${bd}px`;

  const relief = typeof props.relief === "string" ? props.relief : undefined;
  if (relief === "raised") style.boxShadow = "1px 1px 0 0 #888, inset 1px 1px 0 0 #fff";
  else if (relief === "sunken") style.boxShadow = "inset 1px 1px 2px 0 rgba(0,0,0,0.4), inset -1px -1px 0 0 rgba(255,255,255,0.3)";
  else if (relief === "groove") style.boxShadow = "inset 1px 1px 0 0 #888, inset -1px -1px 0 0 #ccc, 1px 1px 0 0 #ccc, -1px -1px 0 0 #888";
  else if (relief === "ridge") style.boxShadow = "inset 1px 1px 0 0 #ccc, inset -1px -1px 0 0 #888, 1px 1px 0 0 #888, -1px -1px 0 0 #ccc";
  else if (relief === "flat") style.boxShadow = "none";

  if (props.font && typeof props.font === "string") {
    const m = props.font.match(/["'](\w+)["']\s*,\s*(\d+)/);
    if (m) { style.fontFamily = m[1]; style.fontSize = `${m[2]}px`; }
    if (props.font.includes("bold")) style.fontWeight = "bold";
    if (props.font.includes("italic")) style.fontStyle = "italic";
  }

  if (props.state === "disabled") { style.opacity = 0.5; style.cursor = "not-allowed"; }
  if (props.state === "active" && !props.state_disabled) style.boxShadow = (style.boxShadow ? style.boxShadow + ", " : "") + "inset 0 1px 2px rgba(0,0,0,0.15)";

  if (props.wraplength && typeof props.wraplength === "number") {
    style.maxWidth = `${props.wraplength}px`;
    style.whiteSpace = "normal";
    style.wordWrap = "break-word";
  }

  // anchor → CSS textAlign + justifyContent
  if (typeof props.anchor === "string") {
    const a = props.anchor as string;
    if (a.includes("w")) style.textAlign = "left";
    else if (a.includes("e")) style.textAlign = "right";
    else if (a.includes("center")) style.textAlign = "center";
    // vertical alignment
    const isTop = a.includes("n");
    const isBottom = a.includes("s");
    if (!isTop && !isBottom) style.justifyContent = "center";
    else if (isTop) style.justifyContent = "flex-start";
    else style.justifyContent = "flex-end";
  }

  // justify → CSS textAlign
  if (typeof props.justify === "string") {
    if (props.justify === "left") style.textAlign = "left";
    else if (props.justify === "center") style.textAlign = "center";
    else if (props.justify === "right") style.textAlign = "right";
  }

  return style;
}

const ALIGN_THRESHOLD = 4;

function computeGuides(
  dragWidget: WidgetInstance,
  absX: number,
  absY: number,
  allWidgets: WidgetInstance[],
): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];

  for (const w of allWidgets) {
    if (w.id === dragWidget.id) continue;
    const wAbs = getAbsolutePosition(w, allWidgets);
    const wX = wAbs.x;
    const wY = wAbs.y;

    // Vertical guides
    for (const refX of [wX, wX + w.width, wX + w.width / 2]) {
      for (const dragX of [absX, absX + dragWidget.width, absX + dragWidget.width / 2]) {
        if (Math.abs(refX - dragX) < ALIGN_THRESHOLD) {
          v.push(refX);
        }
      }
    }

    // Horizontal guides
    for (const refY of [wY, wY + w.height, wY + w.height / 2]) {
      for (const dragY of [absY, absY + dragWidget.height, absY + dragWidget.height / 2]) {
        if (Math.abs(refY - dragY) < ALIGN_THRESHOLD) {
          h.push(refY);
        }
      }
    }
  }

  return { v: [...new Set(v)], h: [...new Set(h)] };
}

function getAnchorJustifyStyle(widget: WidgetInstance): React.CSSProperties {
  const style: React.CSSProperties = {};
  const anchor = typeof widget.props.anchor === "string" ? widget.props.anchor : "";
  const justify = typeof widget.props.justify === "string" ? widget.props.justify : "";

  if (anchor) {
    const isLeft = anchor.includes("w");
    const isRight = anchor.includes("e");
    const isTop = anchor.includes("n");
    const isBottom = anchor.includes("s");
    const isCenterH = anchor.includes("center") || (!isLeft && !isRight);
    const isCenterV = !isTop && !isBottom;

    style.display = "flex";
    style.alignItems = isCenterV ? "center" : isTop ? "flex-start" : "flex-end";
    style.justifyContent = isCenterH ? "center" : isLeft ? "flex-start" : "flex-end";
  }

  if (justify) {
    style.textAlign = justify as React.CSSProperties["textAlign"];
  }

  return style;
}

function renderWidgetContent(widget: WidgetInstance) {
  const text = String(widget.props.text ?? "");
  const fgColor = typeof widget.props.fg === "string" ? widget.props.fg : undefined;
  const textColor = fgColor ? { color: fgColor } : undefined;
  const anchorStyle = getAnchorJustifyStyle(widget);

  switch (widget.type) {
    case "Button":
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ ...anchorStyle, boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #888" }}>
          <span className="text-xs font-medium truncate px-2" style={textColor}>{text || "Button"}</span>
        </div>
      );
    case "Label":
      return <span className="text-xs truncate px-1 w-full h-full" style={{ ...textColor, ...anchorStyle }}>{text || "Label"}</span>;
    case "Entry":
      return (
        <div className="w-full h-full relative">
          <div className="absolute inset-0 bg-white" style={{ boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.3)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-black" />
        </div>
      );
    case "Text":
      return (
        <div className="absolute inset-0 bg-white overflow-hidden" style={{ boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.3)" }}>
          <div className="absolute inset-1 text-xs" style={{ ...textColor, ...anchorStyle, color: textColor?.color ?? "#9ca3af" }}>Text</div>
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-gray-100 border-l border-gray-300 flex flex-col items-center py-0.5 gap-px">
            <div className="w-1.5 h-2 bg-gray-300 rounded-sm" />
            <div className="flex-1 w-1.5 bg-gray-200 rounded" />
            <div className="w-1.5 h-2 bg-gray-300 rounded-sm" />
          </div>
        </div>
      );
    case "Checkbutton":
      return (
        <div className="w-full h-full flex items-center gap-1.5 px-1" style={anchorStyle}>
          <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded-sm shrink-0" />
          <span className="text-xs truncate" style={textColor}>{text || "Check"}</span>
        </div>
      );
    case "Radiobutton":
      return (
        <div className="w-full h-full flex items-center gap-1.5 px-1" style={anchorStyle}>
          <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded-full shrink-0" />
          <span className="text-xs truncate" style={textColor}>{text || "Radio"}</span>
        </div>
      );
    case "Listbox":
      return <div className="absolute inset-1 text-xs" style={textColor || { color: "#6b7280" }}><div className="border-b border-gray-200 pb-0.5">Item 1</div><div className="border-b border-gray-200 pb-0.5">Item 2</div></div>;
    case "Scale":
      return <div className="w-full flex items-center px-3"><div className="flex-1 h-1 bg-gray-300 rounded relative"><div className="w-3 h-3 bg-blue-500 rounded-full absolute -top-1 left-1/3" /></div></div>;
    case "Separator":
      return null;
    case "Scrollbar":
      return <div className="w-full h-full flex flex-col items-center py-1 gap-0.5"><div className="w-2 h-2 bg-gray-400 rounded-sm" /><div className="flex-1 w-2 bg-gray-300 rounded" /><div className="w-2 h-2 bg-gray-400 rounded-sm" /></div>;
    case "OptionMenu":
      return <div className="flex items-center justify-between w-full px-2"><span className="text-xs" style={textColor || { color: "#4b5563" }}>{(String(widget.props.values ?? "")).split(",")[0] || "Select..."}</span><span className="text-xs text-gray-400">&#9660;</span></div>;
    case "Spinbox":
      return <div className="flex items-center w-full px-1"><span className="text-xs flex-1" style={textColor || { color: "#4b5563" }}>0</span><div className="flex flex-col"><span className="text-xs leading-none">&#9650;</span><span className="text-xs leading-none">&#9660;</span></div></div>;
    case "Progressbar": {
      const mode = String(widget.props.mode ?? "determinate");
      return (
        <div className="w-full h-full bg-gray-200 rounded overflow-hidden">
          {mode === "determinate" ? (
            <div className="h-full bg-green-500 rounded" style={{ width: "60%" }} />
          ) : (
            <div className="h-full bg-green-500 rounded animate-pulse" style={{ width: "40%" }} />
          )}
        </div>
      );
    }
    case "Combobox": {
      const vals = String(widget.props.values ?? "").split(",");
      return (
        <div className="flex items-center justify-between w-full px-2">
          <span className="text-xs truncate" style={textColor || { color: "#4b5563" }}>{vals[0] || "Select..."}</span>
          <span className="text-xs text-gray-400">&#9660;</span>
        </div>
      );
    }
    case "Treeview":
      return (
        <div className="absolute inset-0 overflow-hidden">
          <div className="flex border-b border-gray-300 bg-gray-100">
            <div className="flex-1 px-2 text-[10px] font-medium text-gray-600 py-0.5">Column 1</div>
            <div className="flex-1 px-2 text-[10px] font-medium text-gray-600 py-0.5 border-l border-gray-300">Column 2</div>
          </div>
          <div className="border-b border-gray-200 py-0.5"><div className="px-2 text-[10px]" style={textColor || { color: "#374151" }}>Item 1</div></div>
          <div className="border-b border-gray-200 py-0.5"><div className="px-2 text-[10px]" style={textColor || { color: "#374151" }}>Item 2</div></div>
          <div className="py-0.5"><div className="px-2 text-[10px]" style={textColor || { color: "#374151" }}>Item 3</div></div>
        </div>
      );
    case "Sizegrip":
      return (
        <div className="w-full h-full flex items-end justify-end p-0.5">
          <div className="flex flex-col items-end gap-px">
            <div className="flex gap-px">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          </div>
        </div>
      );
    case "Menubutton":
      return (
        <div className="flex items-center justify-center gap-1 w-full">
          <span className="text-xs font-medium truncate" style={textColor}>{text || "Menu"}</span>
          <span className="text-[10px] text-gray-500">&#9662;</span>
        </div>
      );
    case "Message":
      return <div className="absolute inset-1 text-xs overflow-hidden" style={{ ...textColor, ...anchorStyle, color: textColor?.color ?? "#9ca3af" }}>{text || "Message"}</div>;
    case "Frame":
    case "LabelFrame":
    case "Toplevel":
      return null; // Container widgets render children
    default:
      return <span className="text-xs text-gray-500">{widget.type}</span>;
  }
}

function WidgetRenderer({
  widget,
  allWidgets,
  isSelected,
  onSelect,
  onMove,
  onResize,
  renderChild,
  setActiveTab,
  onContextMenu,
  onDoubleClick,
  onSetGuides,
  zoom,
  onSnapshot,
}: {
  widget: WidgetInstance;
  allWidgets: WidgetInstance[];
  isSelected: boolean;
  onSelect: (multi?: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  renderChild: (child: WidgetInstance) => React.ReactNode;
  setActiveTab: (notebookId: string, index: number) => void;
  onContextMenu: (e: React.MouseEvent, widgetId: string) => void;
  onDoubleClick: (widgetId: string) => void;
  onSetGuides?: (guides: { v: number[]; h: number[] }) => void;
  zoom: number;
  onSnapshot: () => void;
}) {
  const isContainer = widget.type === "Frame" || widget.type === "LabelFrame" || widget.type === "Notebook" || widget.type === "Toplevel";

  // Make container widgets droppable targets for nesting children
  const { setNodeRef: setFrameRef, isOver: isFrameOver } = useDroppable({
    id: `frame-${widget.id}`,
    disabled: !isContainer,
  });

  const moveRef = useRef<{ startX: number; startY: number; widgetX: number; widgetY: number } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(e.ctrlKey || e.metaKey);
      if (widget.locked) return;
      moveRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        widgetX: widget.x,
        widgetY: widget.y,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!moveRef.current) return;
        const dx = (e.clientX - moveRef.current.startX) / zoom;
        const dy = (e.clientY - moveRef.current.startY) / zoom;
        const newX = Math.max(0, moveRef.current.widgetX + dx);
        const newY = Math.max(0, moveRef.current.widgetY + dy);
        onMove(widget.id, newX, newY);
        setDragInfo({ x: Math.round(newX), y: Math.round(newY), w: widget.width, h: widget.height });

        // Compute alignment guides using absolute position
        const updatedWidget = { ...widget, x: newX, y: newY };
        const absPos = getAbsolutePosition(updatedWidget, allWidgets);
        const newGuides = computeGuides(updatedWidget, absPos.x, absPos.y, allWidgets);
        onSetGuides?.({ v: newGuides.v, h: newGuides.h });
      };

      const handleMouseUp = () => {
        if (moveRef.current) onSnapshot();
        moveRef.current = null;
        setDragInfo(null);
        onSetGuides?.({ v: [], h: [] });
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [widget.id, widget.x, widget.y, widget.locked, onSelect, onMove, onSetGuides, allWidgets, zoom],
  );

  const createResizeHandler = useCallback(
    (direction: "se" | "sw" | "ne" | "nw") => (e: React.MouseEvent) => {
      e.stopPropagation();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startW = widget.width;
      const startH = widget.height;
      const startX = widget.x;
      const startY = widget.y;

      const handleMouseMove = (e: MouseEvent) => {
        const dx = (e.clientX - startClientX) / zoom;
        const dy = (e.clientY - startClientY) / zoom;
        let newW = startW, newH = startH, newX = startX, newY = startY;

        if (direction.includes("e")) newW = startW + dx;
        if (direction.includes("w")) { newW = startW - dx; newX = startX + dx; }
        if (direction.includes("s")) newH = startH + dy;
        if (direction.includes("n")) { newH = startH - dy; newY = startY + dy; }

        newW = Math.max(20, newW);
        newH = Math.max(20, newH);
        onResize(widget.id, newW, newH);
        if (newX !== startX || newY !== startY) {
          onMove(widget.id, newX, newY);
        }
        setDragInfo({ x: Math.round(newX), y: Math.round(newY), w: Math.round(newW), h: Math.round(newH) });
      };

      const handleMouseUp = () => {
        onSnapshot();
        setDragInfo(null);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [widget.id, widget.width, widget.height, widget.x, widget.y, onResize, onMove, zoom],
  );

  const dynamicStyle = getWidgetDynamicStyle(widget);

  // Render container content (Frame, LabelFrame, Notebook)
  const renderContainerContent = () => {
    if (widget.type === "Notebook") {
      const children = allWidgets.filter(w => w.parentId === widget.id);
      const activeTab = typeof widget.props.activeTab === "number" ? widget.props.activeTab : 0;
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex shrink-0 bg-gray-200 border-b border-gray-400">
            {children.map((child, i) => (
              <button
                key={child.id}
                className={`px-3 py-1 text-xs transition-colors ${
                  i === activeTab
                    ? "bg-white text-gray-800 border-t-2 border-x border-gray-400 rounded-t -mb-px font-medium"
                    : "bg-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
                onClick={(e) => { e.stopPropagation(); setActiveTab(widget.id, i); }}
              >
                {String(child.props.text ?? `Tab ${i + 1}`)}
              </button>
            ))}
          </div>
          <div className="flex-1 relative bg-white border-x border-b border-gray-400">
            {children[activeTab] && renderChild(children[activeTab])}
          </div>
        </div>
      );
    }

    // Frame / LabelFrame / Toplevel
    return (
      <div className="relative w-full h-full">
        {widget.type === "Toplevel" && (
          <div className="absolute top-0 left-0 right-0 h-6 bg-[#0078d4] flex items-center px-2 rounded-t z-10" style={{ marginTop: "-1px" }}>
            <span className="text-[10px] text-white font-medium truncate flex-1">{String(widget.props.title ?? "") || "Toplevel"}</span>
            <div className="flex gap-1">
              <span className="text-[9px] text-white/60 hover:text-white">&#8211;</span>
              <span className="text-[9px] text-white/60 hover:text-white">&#9723;</span>
              <span className="text-[9px] text-white/60 hover:text-white">&#10005;</span>
            </div>
          </div>
        )}
        {widget.type === "LabelFrame" && (
          <fieldset className="absolute inset-0 border border-gray-400 rounded m-0 p-0">
            <legend className="text-xs text-gray-600 px-1 ml-1">{String(widget.props.text ?? "") || "LabelFrame"}</legend>
          </fieldset>
        )}
        {widget.type === "Frame" && !widget.props.bg && (
          <div className="absolute inset-0 border border-dashed border-gray-300 rounded pointer-events-none" />
        )}
        <div className={widget.type === "Toplevel" ? "w-full h-full pt-6" : "w-full h-full"}>
          {allWidgets.filter(c => c.parentId === widget.id).map(child => renderChild(child))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={isContainer ? setFrameRef : undefined}
      className={`absolute border border-gray-300 rounded flex items-center justify-center cursor-move select-none overflow-hidden ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent" : ""
      } ${isContainer && isFrameOver ? "ring-2 ring-green-400" : ""}`}
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        ...dynamicStyle,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(widget.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, widget.id);
      }}
    >
      {isContainer ? renderContainerContent() : renderWidgetContent(widget)}
      {isSelected && !widget.locked && (
        <>
          <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-se-resize" onMouseDown={createResizeHandler("se")} />
          <div className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-sw-resize" onMouseDown={createResizeHandler("sw")} />
          <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-ne-resize" onMouseDown={createResizeHandler("ne")} />
          <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-nw-resize" onMouseDown={createResizeHandler("nw")} />
        </>
      )}
      {widget.locked && (
        <div className="absolute top-0.5 right-0.5 text-[8px] text-gray-500">&#128274;</div>
      )}
      {widget.events && Object.keys(widget.events).some(k => widget.events![k]?.trim()) && (
        <div className="absolute top-0.5 left-0.5 text-[8px] text-amber-400 pointer-events-none">&#9889;</div>
      )}
      {dragInfo && (
        <div className="absolute -top-6 left-0 bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
          x:{dragInfo.x} y:{dragInfo.y} | {dragInfo.w}×{dragInfo.h}
        </div>
      )}
    </div>
  );
}

export function Canvas() {
  const { widgets, selectedIds, canvasWidth, canvasHeight, selectWidget, moveWidget, resizeWidget, gridSize, snapEnabled, setActiveTab, zoom, snapshot, setMousePos, menuBar, rootBg } =
    useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; widgetId: string } | null>(null);
  const [eventEditor, setEventEditor] = useState<string | null>(null);
  const [selRect, setSelRect] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const scrollRef = useRef<HTMLDivElement>(null);
  const panningRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const rootWidgets = widgets.filter(w => w.parentId === null);

  // Marquee selection
  useEffect(() => {
    if (!selRect) return;
    const canvasEl = document.querySelector('[data-canvas="true"]');
    if (!canvasEl) return;

    const handleMove = (e: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      setSelRect(prev => prev ? { ...prev, ex: e.clientX - rect.left, ey: e.clientY - rect.top } : null);
    };

    const handleUp = () => {
      setSelRect(prev => {
        if (prev) {
          const x1 = Math.min(prev.sx, prev.ex);
          const y1 = Math.min(prev.sy, prev.ey);
          const x2 = Math.max(prev.sx, prev.ex);
          const y2 = Math.max(prev.sy, prev.ey);

          if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
            const toSelect: string[] = [];
            const allWidgets = useDesignerStore.getState().widgets;
            for (const w of allWidgets) {
              const absPos = getAbsolutePosition(w, allWidgets);
              if (absPos.x >= x1 && absPos.x + w.width <= x2 && absPos.y >= y1 && absPos.y + w.height <= y2) {
                toSelect.push(w.id);
              }
            }
            toSelect.forEach(id => selectWidget(id, true));
          }
        }
        return null;
      });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [selectWidget]);

  const snapFn = (v: number) => snapEnabled ? Math.round(v / gridSize) * gridSize : v;

  const gridStyle = snapEnabled ? {
    backgroundImage: `linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)`,
    backgroundSize: `${gridSize}px ${gridSize}px`,
  } : {};

  const renderWidget = (w: WidgetInstance): React.ReactNode => {
    return (
      <WidgetRenderer
        key={w.id}
        widget={w}
        allWidgets={widgets}
        isSelected={selectedIds.includes(w.id)}
        onSelect={(multi) => selectWidget(w.id, multi)}
        onMove={(id, x, y) => moveWidget(id, snapFn(x), snapFn(y))}
        onResize={(id, w, h) => resizeWidget(id, Math.max(20, snapFn(w)), Math.max(20, snapFn(h)))}
        renderChild={renderWidget}
        setActiveTab={setActiveTab}
        onContextMenu={(e, widgetId) => {
          setContextMenu({ x: e.clientX, y: e.clientY, widgetId });
        }}
        onDoubleClick={(widgetId) => {
          const w = useDesignerStore.getState().widgets.find((w) => w.id === widgetId);
          if (w) {
            const events = WIDGET_EVENTS[w.type] ?? [];
            if (events.length > 0) {
              setEventEditor(widgetId);
            }
          }
        }}
        onSetGuides={setGuides}
        zoom={zoom}
        onSnapshot={snapshot}
      />
    );
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto bg-[#141422] p-4"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#06b6d440 transparent" }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          if (scrollRef.current) {
            panningRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              scrollLeft: scrollRef.current.scrollLeft,
              scrollTop: scrollRef.current.scrollTop,
            };
          }
        }
      }}
      onMouseMove={(e) => {
        if (panningRef.current && scrollRef.current) {
          scrollRef.current.scrollLeft = panningRef.current.scrollLeft - (e.clientX - panningRef.current.startX);
          scrollRef.current.scrollTop = panningRef.current.scrollTop - (e.clientY - panningRef.current.startY);
        }
      }}
      onMouseUp={() => { panningRef.current = null; }}
      onMouseLeave={() => { panningRef.current = null; }}
    >
      <style>{`
        .canvas-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .canvas-scroll::-webkit-scrollbar-track { background: transparent; }
        .canvas-scroll::-webkit-scrollbar-thumb { background: #06b6d440; border-radius: 4px; }
        .canvas-scroll::-webkit-scrollbar-thumb:hover { background: #06b6d480; }
        .canvas-scroll::-webkit-scrollbar-corner { background: transparent; }
      `}</style>
      <div className="inline-flex flex-col">
        <div className="flex">
          <div className="w-5 h-5 shrink-0" />
          <Ruler length={canvasWidth} direction="horizontal" zoom={zoom} />
        </div>
        <div className="flex">
          <Ruler length={canvasHeight} direction="vertical" zoom={zoom} />
          <div
            ref={setNodeRef}
            data-canvas="true"
            role="application"
            aria-label="Design canvas"
            className={`relative border-2 border-dashed ${
              isOver ? "border-blue-400" : "border-gray-600"
            }`}
            style={{ width: canvasWidth * zoom, height: canvasHeight * zoom, backgroundColor: rootBg || "#ffffff" }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
            }}
            onMouseLeave={() => setMousePos(null)}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if (e.target === e.currentTarget) {
                const rect = e.currentTarget.getBoundingClientRect();
                setSelRect({
                  sx: (e.clientX - rect.left) / zoom,
                  sy: (e.clientY - rect.top) / zoom,
                  ex: (e.clientX - rect.left) / zoom,
                  ey: (e.clientY - rect.top) / zoom,
                });
                selectWidget(null);
              }
            }}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: canvasWidth, height: canvasHeight, ...gridStyle }}>
              {menuBar && (
                <div className="absolute top-0 left-0 right-0 h-6 bg-[#f0f0f0] border-b border-gray-400 flex items-center z-50" style={{ width: canvasWidth }}>
                  {menuBar.menus.map((menu) => (
                    <div key={menu.id} className="relative group">
                      <button className="px-3 h-6 text-[11px] text-gray-800 hover:bg-gray-200 transition-colors">{menu.label}</button>
                      <div className="absolute left-0 top-full bg-white border border-gray-300 shadow-lg py-1 min-w-36 hidden group-hover:block z-50">
                        {menu.items.map((item) =>
                          item.separator ? (
                            <div key={item.id} className="border-t border-gray-200 my-0.5" />
                          ) : (
                            <div key={item.id} className="flex items-center justify-between px-3 py-1 text-[11px] text-gray-700 hover:bg-[#0078d4] hover:text-white cursor-default">
                              <span>{item.label}</span>
                              {item.accelerator && <span className="text-gray-400 ml-4 text-[10px] group-hover:text-white/70">{item.accelerator}</span>}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {rootWidgets.map(renderWidget)}
              {selRect && (
                <div
                  className="absolute border border-blue-400 bg-blue-400/10 pointer-events-none"
                  style={{
                    left: Math.min(selRect.sx, selRect.ex),
                    top: Math.min(selRect.sy, selRect.ey),
                    width: Math.abs(selRect.ex - selRect.sx),
                    height: Math.abs(selRect.ey - selRect.sy),
                  }}
                />
              )}
              {guides.v.map((x, i) => (
                <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-red-400 pointer-events-none z-50" style={{ left: x }} />
              ))}
              {guides.h.map((y, i) => (
                <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-red-400 pointer-events-none z-50" style={{ top: y }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} widgetId={contextMenu.widgetId} onClose={() => setContextMenu(null)} />}
      {eventEditor && (
        <EventEditorModal widgetId={eventEditor} onClose={() => setEventEditor(null)} />
      )}
    </div>
  );
}
