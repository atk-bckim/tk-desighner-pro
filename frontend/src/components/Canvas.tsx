import { useDroppable } from "@dnd-kit/core";
import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import React, { useRef, useCallback } from "react";

const WIDGET_STYLES: Record<string, string> = {
  Button: "bg-gray-100 border-gray-400 shadow-sm",
  Label: "bg-transparent border-transparent border-0",
  Entry: "bg-white border-gray-300",
  Text: "bg-white border-gray-300",
  Checkbutton: "bg-transparent border-transparent border-0",
  Radiobutton: "bg-transparent border-transparent border-0",
  Listbox: "bg-white border-gray-300",
  Scale: "bg-gray-50 border-gray-200",
  Frame: "bg-gray-50/50 border-gray-400 border-dashed",
  LabelFrame: "bg-gray-50/50 border-gray-400",
  OptionMenu: "bg-white border-gray-300",
  Spinbox: "bg-white border-gray-300",
  Scrollbar: "bg-gray-100 border-gray-300",
  Separator: "bg-gray-400 border-transparent border-0",
};

function renderWidgetContent(widget: WidgetInstance) {
  const text = String(widget.props.text ?? "");
  switch (widget.type) {
    case "Button":
      return <span className="text-xs text-gray-700 font-medium truncate">{text || "Button"}</span>;
    case "Label":
      return <span className="text-xs text-gray-800 truncate">{text || "Label"}</span>;
    case "Entry":
      return <div className="w-full h-0.5 bg-gray-400 absolute bottom-0.5 left-0 right-0" />;
    case "Text":
      return <div className="absolute inset-1 text-xs text-gray-400 overflow-hidden">Text</div>;
    case "Checkbutton":
      return (
        <div className="flex items-center gap-1.5 px-1">
          <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded-sm shrink-0" />
          <span className="text-xs text-gray-700 truncate">{text || "Check"}</span>
        </div>
      );
    case "Radiobutton":
      return (
        <div className="flex items-center gap-1.5 px-1">
          <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded-full shrink-0" />
          <span className="text-xs text-gray-700 truncate">{text || "Radio"}</span>
        </div>
      );
    case "Listbox":
      return <div className="absolute inset-1 text-xs text-gray-500"><div className="border-b border-gray-200 pb-0.5">Item 1</div><div className="border-b border-gray-200 pb-0.5">Item 2</div></div>;
    case "Scale":
      return <div className="w-full flex items-center px-3"><div className="flex-1 h-1 bg-gray-300 rounded relative"><div className="w-3 h-3 bg-blue-500 rounded-full absolute -top-1 left-1/3" /></div></div>;
    case "Separator":
      return null;
    case "Scrollbar":
      return <div className="w-full h-full flex flex-col items-center py-1 gap-0.5"><div className="w-2 h-2 bg-gray-400 rounded-sm" /><div className="flex-1 w-2 bg-gray-300 rounded" /><div className="w-2 h-2 bg-gray-400 rounded-sm" /></div>;
    case "OptionMenu":
      return <div className="flex items-center justify-between w-full px-2"><span className="text-xs text-gray-600">{(String(widget.props.values ?? "")).split(",")[0] || "Select..."}</span><span className="text-xs text-gray-400">&#9660;</span></div>;
    case "Spinbox":
      return <div className="flex items-center w-full px-1"><span className="text-xs text-gray-600 flex-1">0</span><div className="flex flex-col"><span className="text-xs leading-none">&#9650;</span><span className="text-xs leading-none">&#9660;</span></div></div>;
    case "Frame":
    case "LabelFrame":
      return null; // Container widgets render children
    default:
      return <span className="text-xs text-gray-500">{widget.type}</span>;
  }
}

function WidgetRenderer({
  widget,
  isSelected,
  onSelect,
  onMove,
  onResize,
  children,
}: {
  widget: WidgetInstance;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  children?: React.ReactNode;
}) {
  const moveRef = useRef<{ startX: number; startY: number; widgetX: number; widgetY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();
      moveRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        widgetX: widget.x,
        widgetY: widget.y,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!moveRef.current) return;
        const dx = e.clientX - moveRef.current.startX;
        const dy = e.clientY - moveRef.current.startY;
        onMove(widget.id, Math.max(0, moveRef.current.widgetX + dx), Math.max(0, moveRef.current.widgetY + dy));
      };

      const handleMouseUp = () => {
        moveRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [widget.id, widget.x, widget.y, onSelect, onMove],
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
        const dx = e.clientX - startClientX;
        const dy = e.clientY - startClientY;
        let newW = startW, newH = startH, newX = startX, newY = startY;

        if (direction.includes("e")) newW = startW + dx;
        if (direction.includes("w")) { newW = startW - dx; newX = startX + dx; }
        if (direction.includes("s")) newH = startH + dy;
        if (direction.includes("n")) { newH = startH - dy; newY = startY + dy; }

        if (newW >= 20 && newH >= 20) {
          onResize(widget.id, newW, newH);
          if (newX !== startX || newY !== startY) {
            onMove(widget.id, newX, newY);
          }
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [widget.id, widget.width, widget.height, widget.x, widget.y, onResize, onMove],
  );

  const color = WIDGET_STYLES[widget.type] || "bg-gray-100 border-gray-400";
  const isContainer = widget.type === "Frame" || widget.type === "LabelFrame";

  return (
    <div
      className={`absolute border ${color} rounded flex items-center justify-center cursor-move select-none overflow-hidden ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent" : ""
      }`}
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {isContainer ? (
        <div className="relative w-full h-full">
          {widget.type === "LabelFrame" && (
            <span className="absolute -top-2.5 left-2 text-xs text-gray-600 bg-gray-50 px-1">
              {String(widget.props.text ?? "") || "LabelFrame"}
            </span>
          )}
          {children}
        </div>
      ) : (
        renderWidgetContent(widget)
      )}
      {isSelected && (
        <>
          <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-se-resize" onMouseDown={createResizeHandler("se")} />
          <div className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-sw-resize" onMouseDown={createResizeHandler("sw")} />
          <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-ne-resize" onMouseDown={createResizeHandler("ne")} />
          <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-nw-resize" onMouseDown={createResizeHandler("nw")} />
        </>
      )}
    </div>
  );
}

export function Canvas() {
  const { widgets, selectedId, canvasWidth, canvasHeight, selectWidget, moveWidget, resizeWidget, gridSize, snapEnabled } =
    useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  const rootWidgets = widgets.filter(w => w.parentId === null);

  const snapFn = (v: number) => snapEnabled ? Math.round(v / gridSize) * gridSize : v;

  const gridStyle = snapEnabled ? {
    backgroundImage: `linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)`,
    backgroundSize: `${gridSize}px ${gridSize}px`,
  } : {};

  const renderWidget = (w: WidgetInstance): React.ReactNode => {
    const children = widgets.filter(c => c.parentId === w.id);
    const isContainer = w.type === "Frame" || w.type === "LabelFrame";

    return (
      <WidgetRenderer
        key={w.id}
        widget={w}
        isSelected={w.id === selectedId}
        onSelect={() => selectWidget(w.id)}
        onMove={(id, x, y) => moveWidget(id, snapFn(x), snapFn(y))}
        onResize={(id, w, h) => resizeWidget(id, Math.max(20, snapFn(w)), Math.max(20, snapFn(h)))}
        children={isContainer ? children.map(child => renderWidget(child)) : undefined}
      />
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-4">
      <div
        ref={setNodeRef}
        data-canvas="true"
        className={`relative bg-white border-2 border-dashed ${
          isOver ? "border-blue-400" : "border-gray-600"
        }`}
        style={{ width: canvasWidth, height: canvasHeight, ...gridStyle }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectWidget(null);
        }}
      >
        {rootWidgets.map(renderWidget)}
      </div>
    </div>
  );
}
