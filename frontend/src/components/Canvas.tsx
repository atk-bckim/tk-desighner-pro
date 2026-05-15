import { useDroppable } from "@dnd-kit/core";
import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import { getSpec } from "../utils/widgetDefaults";
import { useRef, useCallback } from "react";

const WIDGET_COLORS: Record<string, string> = {
  Button: "bg-blue-900/60 border-blue-500",
  Label: "bg-green-900/60 border-green-500",
  Entry: "bg-yellow-900/60 border-yellow-500",
  Text: "bg-yellow-900/60 border-yellow-500",
  Checkbutton: "bg-purple-900/60 border-purple-500",
  Radiobutton: "bg-pink-900/60 border-pink-500",
  Listbox: "bg-orange-900/60 border-orange-500",
  Scale: "bg-cyan-900/60 border-cyan-500",
  Frame: "bg-gray-700/40 border-gray-400 border-dashed",
};

function WidgetRenderer({
  widget,
  isSelected,
  onSelect,
  onMove,
  onResize,
}: {
  widget: WidgetInstance;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
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

  const color = WIDGET_COLORS[widget.type] || "bg-gray-700/60 border-gray-500";
  const displayText = String(widget.props.text ?? widget.type);
  const spec = getSpec(widget.type);

  return (
    <div
      className={`absolute border-2 ${color} rounded flex items-center justify-center cursor-move select-none ${
        isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-transparent" : ""
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
      <span className="text-xs text-gray-300 truncate px-1">
        {spec.defaultProps.text !== undefined ? displayText : widget.type}
      </span>
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
  const { widgets, selectedId, canvasWidth, canvasHeight, selectWidget, moveWidget, resizeWidget } =
    useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-4">
      <div
        ref={setNodeRef}
        data-canvas="true"
        className={`relative bg-white border-2 border-dashed ${
          isOver ? "border-blue-400" : "border-gray-600"
        }`}
        style={{ width: canvasWidth, height: canvasHeight }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectWidget(null);
        }}
      >
        {widgets.map((w) => (
          <WidgetRenderer
            key={w.id}
            widget={w}
            isSelected={w.id === selectedId}
            onSelect={() => selectWidget(w.id)}
            onMove={moveWidget}
            onResize={resizeWidget}
          />
        ))}
      </div>
    </div>
  );
}
