import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useState, useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { Toolbox } from "./components/Toolbox";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { CodePreview } from "./components/CodePreview";
import { ObjectTree } from "./components/ObjectTree";
import { StatusBar } from "./components/StatusBar";
import { useDesignerStore } from "./store/designerStore";
import type { WidgetType } from "./types/widgets";
import { getAbsolutePosition } from "./utils/position";

export default function App() {
  const addWidget = useDesignerStore((s) => s.addWidget);
  const [draggingType, setDraggingType] = useState<WidgetType | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const store = useDesignerStore.getState();

      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.selectedIds.length > 0) {
          store.snapshot();
          [...store.selectedIds].forEach(id => store.removeWidget(id));
        }
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }
      if (
        (e.key === "y" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        store.redo();
      }
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.selectedIds.length > 0) {
          store.snapshot();
          store.duplicateWidget(store.selectedIds[0]);
        }
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && store.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? store.gridSize : 1;
        const widget = store.widgets.find(w => w.id === store.selectedIds[0]);
        if (widget) {
          let { x, y } = widget;
          if (e.key === "ArrowUp") y -= step;
          if (e.key === "ArrowDown") y += step;
          if (e.key === "ArrowLeft") x -= step;
          if (e.key === "ArrowRight") x += step;
          store.moveWidget(widget.id, x, y);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Canvas zoom with Ctrl+scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const store = useDesignerStore.getState();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        store.setZoom(store.zoom + delta);
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingType(null);
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current;
    if (data?.fromToolbox && data.widgetType) {
      const canvasEl = document.querySelector('[data-canvas="true"]');
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const translated = active.rect.current.translated;
      const dropX = translated
        ? Math.max(0, Math.round(translated.left - rect.left))
        : Math.round(rect.width / 2 - 60);
      const dropY = translated
        ? Math.max(0, Math.round(translated.top - rect.top))
        : Math.round(rect.height / 2 - 20);

      // Check if dropped on a Frame
      const overId = String(over.id);
      if (overId.startsWith("frame-")) {
        const frameId = overId.replace("frame-", "");
        const store = useDesignerStore.getState();
        const frameWidget = store.widgets.find((w) => w.id === frameId);
        if (frameWidget) {
          const frameAbs = getAbsolutePosition(frameWidget, store.widgets);
          const relX = Math.max(0, dropX - frameAbs.x);
          const relY = Math.max(0, dropY - frameAbs.y);
          addWidget(data.widgetType, relX, relY, frameId);
          return;
        }
      }

      // Drop on canvas root
      if (overId === "canvas") {
        addWidget(data.widgetType, dropX, dropY);
      }
    }
  };

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={(e) => {
        const data = e.active.data.current;
        if (data?.fromToolbox) setDraggingType(data.widgetType);
      }}
    >
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Toolbox />
          <ObjectTree />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Canvas />
            <CodePreview />
          </div>
          <PropertyPanel />
        </div>
        <StatusBar />
      </div>
      <DragOverlay>
        {draggingType ? (
          <div className="bg-gray-600 px-3 py-2 rounded text-sm opacity-80 text-white">
            {draggingType}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
