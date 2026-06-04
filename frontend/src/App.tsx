import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useState, useEffect, useCallback } from "react";
import { CommandBar } from "./components/CommandBar";
import { Toolbox } from "./components/Toolbox";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { CodePreview } from "./components/CodePreview";
import { ObjectTree } from "./components/ObjectTree";
import { StatusBar } from "./components/StatusBar";
import { ComponentTray } from "./components/ComponentTray";
import { ToastContainer } from "./components/Toast";
import { useDesignerStore } from "./store/designerStore";
import type { WidgetType } from "./types/widgets";
import type { OutputRecord } from "./types/output";
import { getAbsolutePosition } from "./utils/position";

export default function App() {
  const addWidget = useDesignerStore((s) => s.addWidget);
  const [draggingType, setDraggingType] = useState<WidgetType | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [outputRecords, setOutputRecords] = useState<OutputRecord[]>([]);
  const addOutput = useCallback((record: Omit<OutputRecord, "id" | "createdAt">) => {
    setOutputRecords((prev) => [
      {
        ...record,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
      },
      ...prev,
    ].slice(0, 80));
  }, []);

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
      if (e.key === "Escape") {
        store.selectWidget(null);
        if (useDesignerStore.getState().tabOrderMode) {
          useDesignerStore.getState().toggleTabOrderMode();
        }
      }
      if (e.key === "Tab" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const { widgets, selectedIds, selectWidget } = store;
        if (widgets.length === 0) return;
        if (e.shiftKey) {
          const last = selectedIds.length > 0 ? widgets.findIndex(w => w.id === selectedIds[0]) : widgets.length;
          const prev = last <= 0 ? widgets.length - 1 : last - 1;
          selectWidget(widgets[prev].id);
        } else {
          const last = selectedIds.length > 0 ? widgets.findIndex(w => w.id === selectedIds[selectedIds.length - 1]) : -1;
          const next = last >= widgets.length - 1 ? 0 : last + 1;
          selectWidget(widgets[next].id);
        }
      }
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.selectAll();
      }
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.selectedIds.length > 0) {
          store.copyWidgets(store.selectedIds);
        }
      }
      if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.clipboard.length > 0) {
          store.snapshot();
          store.pasteWidgets();
        }
      }
      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.selectedIds.length > 0) {
          store.selectedIds.forEach(id => store.toggleLock(id));
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
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.setZoom(1);
      }
      if (e.key === "1" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const canvasEl = document.querySelector('[data-canvas="true"]');
        if (canvasEl) {
          const parent = canvasEl.parentElement;
          if (parent) {
            const fitZoom = Math.min(
              (parent.clientWidth - 40) / store.canvasWidth,
              (parent.clientHeight - 40) / store.canvasHeight,
              1,
            );
            store.setZoom(Math.round(fitZoom * 100) / 100);
          }
        }
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && store.selectedIds.length > 0) {
        e.preventDefault();
        if (!e.repeat) store.snapshot();
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

  useEffect(() => {
    const interval = setInterval(() => {
      const store = useDesignerStore.getState();
      const data = {
        name: store.projectName,
        canvasWidth: store.canvasWidth,
        canvasHeight: store.canvasHeight,
        widgets: store.widgets,
        tkTheme: store.tkTheme,
        menuBar: store.menuBar,
        rootBg: store.rootBg,
        rootResizable: store.rootResizable,
      };
      localStorage.setItem("tk-designer-autosave", JSON.stringify(data));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("tk-designer-autosave");
    if (saved) {
      try {
        const project = JSON.parse(saved);
        if (project.widgets?.length > 0) {
          useDesignerStore.getState().loadProject(project);
        }
      } catch { /* ignore */ }
    }
  }, []);

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
      const store = useDesignerStore.getState();
      const zoom = store.zoom;
      const dropX = translated
        ? Math.max(0, Math.round((translated.left - rect.left) / zoom))
        : Math.round(rect.width / 2 / zoom - 60);
      const dropY = translated
        ? Math.max(0, Math.round((translated.top - rect.top) / zoom))
        : Math.round(rect.height / 2 / zoom - 20);

      const overId = String(over.id);
      if (overId.startsWith("frame-")) {
        const frameId = overId.replace("frame-", "");
        const frameWidget = store.widgets.find((w) => w.id === frameId);
        if (frameWidget) {
          const frameAbs = getAbsolutePosition(frameWidget, store.widgets);
          const relX = Math.max(0, dropX - frameAbs.x);
          const relY = Math.max(0, dropY - frameAbs.y);
          addWidget(data.widgetType, relX, relY, frameId);
          return;
        }
      }

      if (overId === "canvas") {
        addWidget(data.widgetType, dropX, dropY);
      }
    }
  };

  void outputRecords;

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={(e) => {
        const data = e.active.data.current;
        if (data?.fromToolbox) setDraggingType(data.widgetType);
      }}
    >
      <div className="h-screen flex flex-col bg-[#1e1e2e] text-[#d4d4e8]">
        <CommandBar
          addOutput={addOutput}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
          onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
        />
        <div className="flex flex-1 overflow-hidden">
          {leftPanelOpen && (
            <>
              <Toolbox />
              <ObjectTree />
            </>
          )}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Canvas />
            <CodePreview />
          </div>
          {rightPanelOpen && <PropertyPanel />}
        </div>
        <ComponentTray />
        <StatusBar />
      </div>
      <DragOverlay>
        {draggingType ? (
          <div className="bg-[#06b6d4] px-3 py-2 rounded text-sm opacity-80 text-white shadow-lg">
            {draggingType}
          </div>
        ) : null}
      </DragOverlay>
      <ToastContainer />
    </DndContext>
  );
}
