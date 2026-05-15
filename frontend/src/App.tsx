import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useState, useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { Toolbox } from "./components/Toolbox";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { CodePreview } from "./components/CodePreview";
import { ObjectTree } from "./components/ObjectTree";
import { useDesignerStore } from "./store/designerStore";
import type { WidgetType } from "./types/widgets";

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
        if (store.selectedId) {
          store.snapshot();
          store.removeWidget(store.selectedId);
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
        if (store.selectedId) {
          store.snapshot();
          store.duplicateWidget(store.selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingType(null);
    const { active, over } = event;
    if (!over || over.id !== "canvas") return;

    const data = active.data.current;
    if (data?.fromToolbox && data.widgetType) {
      const canvasEl = document.querySelector('[data-canvas="true"]');
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      // Drop at mouse position relative to canvas, or center if delta is 0
      const translated = active.rect.current.translated;
      const dropX = translated
        ? Math.max(0, Math.round(translated.left - rect.left))
        : Math.round(rect.width / 2 - 60);
      const dropY = translated
        ? Math.max(0, Math.round(translated.top - rect.top))
        : Math.round(rect.height / 2 - 20);
      addWidget(data.widgetType, dropX, dropY);
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
