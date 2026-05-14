# Tkinter Designer MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a visual drag-and-drop GUI builder that lets experienced Tkinter developers design layouts in the browser and export clean Python/Tkinter code.

**Architecture:** React SPA frontend with Zustand state management. FastAPI backend for code generation and live preview via Python subprocess. Canvas uses simple div-based widget representations — visual fidelity comes from the real Tkinter preview, not CSS mimicry.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, @dnd-kit/core, Tailwind CSS v4, FastAPI, uvicorn

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Frontend Project

**Files:**
- Create: `frontend/` (via Vite scaffold)

**Step 1: Create Vite project**

```bash
cd /Users/byeong-cheolkim/dev/tk-designer_02
npm create vite@latest frontend -- --template react-ts
```

**Step 2: Install dependencies**

```bash
cd frontend
npm install zustand @dnd-kit/core @dnd-kit/sortable tailwindcss @tailwindcss/vite uuid
npm install -D @types/uuid
```

**Step 3: Configure Tailwind CSS v4**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";
```

**Step 4: Verify dev server runs**

```bash
cd frontend && npm run dev
```

Expected: Vite dev server starts at http://localhost:5173

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite + React + TypeScript + Tailwind"
```

---

### Task 2: Initialize Backend Project

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`

**Step 1: Create directory structure**

```bash
mkdir -p backend/app/api backend/app/codegen backend/app/models
touch backend/app/__init__.py backend/app/api/__init__.py backend/app/codegen/__init__.py backend/app/models/__init__.py
```

**Step 2: Write `backend/requirements.txt`**

```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
pydantic>=2.0.0
```

**Step 3: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import preview, export

app = FastAPI(title="Tkinter Designer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preview.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

**Step 4: Write placeholder API files**

`backend/app/api/preview.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.post("/preview")
def preview():
    return {"message": "not implemented yet"}
```

`backend/app/api/export.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.post("/export")
def export():
    return {"message": "not implemented yet"}
```

**Step 5: Install dependencies and verify**

```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload
```

In another terminal:
```bash
curl http://localhost:8000/api/health
```
Expected: `{"status":"ok"}`

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: scaffold FastAPI backend with health endpoint"
```

---

### Task 3: Create dev.py Runner Script

**Files:**
- Create: `dev.py`

**Step 1: Write `dev.py`**

```python
import subprocess
import sys
import os

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    frontend = os.path.join(root, "frontend")
    backend = os.path.join(root, "backend")

    procs = []
    try:
        print("Starting backend...")
        procs.append(subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
            cwd=backend,
        ))

        print("Starting frontend...")
        procs.append(subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend,
        ))

        print("Tkinter Designer running. Press Ctrl+C to stop.")
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
        for p in procs:
            p.terminate()
```

**Step 2: Commit**

```bash
git add dev.py
git commit -m "feat: add dev.py to run frontend + backend concurrently"
```

---

## Phase 2: Frontend Core Data Layer

### Task 4: TypeScript Types

**Files:**
- Create: `frontend/src/types/widgets.ts`

**Step 1: Write type definitions**

```typescript
export type WidgetType =
  | "Button"
  | "Label"
  | "Entry"
  | "Text"
  | "Checkbutton"
  | "Radiobutton"
  | "Listbox"
  | "Scale"
  | "Frame";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
}

export interface Project {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  widgets: WidgetInstance[];
}

export const WIDGET_TYPES: WidgetType[] = [
  "Button",
  "Label",
  "Entry",
  "Text",
  "Checkbutton",
  "Radiobutton",
  "Listbox",
  "Scale",
  "Frame",
];
```

**Step 2: Commit**

```bash
git add frontend/src/types/
git commit -m "feat: add TypeScript type definitions for widgets and project"
```

---

### Task 5: Widget Defaults & Specs

**Files:**
- Create: `frontend/src/utils/widgetDefaults.ts`

**Step 1: Write widget defaults**

Define default size, properties, and editable property specs for each widget type. Properties are split by input type for the PropertyPanel to render correct editors.

```typescript
import type { WidgetType, WidgetInstance } from "../types/widgets";
import { v4 as uuid } from "uuid";

interface PropSpec {
  key: string;
  label: string;
  type: "text" | "number" | "color" | "select";
  options?: string[]; // for select type
}

interface WidgetSpec {
  defaultWidth: number;
  defaultHeight: number;
  defaultProps: Record<string, unknown>;
  editableProps: PropSpec[];
}

const SPECS: Record<WidgetType, WidgetSpec> = {
  Button: {
    defaultWidth: 120,
    defaultHeight: 40,
    defaultProps: { text: "Button" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "font", label: "Font", type: "text" },
    ],
  },
  Label: {
    defaultWidth: 100,
    defaultHeight: 30,
    defaultProps: { text: "Label" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "font", label: "Font", type: "text" },
      { key: "anchor", label: "Anchor", type: "select", options: ["nw", "n", "ne", "w", "center", "e", "sw", "s", "se"] },
    ],
  },
  Entry: {
    defaultWidth: 200,
    defaultHeight: 30,
    defaultProps: {},
    editableProps: [
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "show", label: "Show char", type: "text" },
    ],
  },
  Text: {
    defaultWidth: 250,
    defaultHeight: 120,
    defaultProps: {},
    editableProps: [
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "height", label: "Height (lines)", type: "number" },
    ],
  },
  Checkbutton: {
    defaultWidth: 120,
    defaultHeight: 30,
    defaultProps: { text: "Checkbutton" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
    ],
  },
  Radiobutton: {
    defaultWidth: 120,
    defaultHeight: 30,
    defaultProps: { text: "Radiobutton", value: "1" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "value", label: "Value", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
    ],
  },
  Listbox: {
    defaultWidth: 200,
    defaultHeight: 120,
    defaultProps: {},
    editableProps: [
      { key: "height", label: "Height (items)", type: "number" },
      { key: "selectmode", label: "Select mode", type: "select", options: ["browse", "single", "multiple", "extended"] },
    ],
  },
  Scale: {
    defaultWidth: 200,
    defaultHeight: 40,
    defaultProps: { from_: 0, to: 100, orient: "horizontal" },
    editableProps: [
      { key: "from_", label: "From", type: "number" },
      { key: "to", label: "To", type: "number" },
      { key: "orient", label: "Orientation", type: "select", options: ["horizontal", "vertical"] },
      { key: "length", label: "Length (px)", type: "number" },
    ],
  },
  Frame: {
    defaultWidth: 250,
    defaultHeight: 200,
    defaultProps: {},
    editableProps: [
      { key: "bg", label: "Background", type: "color" },
      { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
      { key: "bd", label: "Border width", type: "number" },
    ],
  },
};

export function getSpec(type: WidgetType): WidgetSpec {
  return SPECS[type];
}

export function getEditableProps(type: WidgetType): PropSpec[] {
  return SPECS[type].editableProps;
}

export function createWidget(
  type: WidgetType,
  x: number,
  y: number,
): WidgetInstance {
  const spec = SPECS[type];
  return {
    id: uuid(),
    type,
    x,
    y,
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    props: { ...spec.defaultProps },
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/utils/
git commit -m "feat: add widget specs, defaults, and factory function"
```

---

### Task 6: Zustand Store

**Files:**
- Create: `frontend/src/store/designerStore.ts`

**Step 1: Write the store**

```typescript
import { create } from "zustand";
import type { WidgetInstance, WidgetType, Project } from "../types/widgets";
import { createWidget } from "../utils/widgetDefaults";

interface DesignerState {
  // Project
  projectName: string;
  canvasWidth: number;
  canvasHeight: number;

  // Widgets
  widgets: WidgetInstance[];
  selectedId: string | null;

  // Actions
  addWidget: (type: WidgetType, x: number, y: number) => void;
  removeWidget: (id: string) => void;
  selectWidget: (id: string | null) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetProp: (id: string, key: string, value: unknown) => void;

  // Project
  loadProject: (project: Project) => void;
  exportProject: () => Project;
  setProjectName: (name: string) => void;
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  projectName: "Untitled",
  canvasWidth: 800,
  canvasHeight: 600,
  widgets: [],
  selectedId: null,

  addWidget: (type, x, y) => {
    const widget = createWidget(type, x, y);
    set((s) => ({ widgets: [...s.widgets, widget], selectedId: widget.id }));
  },

  removeWidget: (id) => {
    set((s) => ({
      widgets: s.widgets.filter((w) => w.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  selectWidget: (id) => set({ selectedId: id }),

  moveWidget: (id, x, y) => {
    set((s) => ({
      widgets: s.widgets.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  },

  resizeWidget: (id, width, height) => {
    set((s) => ({
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, width: Math.max(20, width), height: Math.max(20, height) } : w,
      ),
    }));
  },

  updateWidgetProp: (id, key, value) => {
    set((s) => ({
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, props: { ...w.props, [key]: value } } : w,
      ),
    }));
  },

  loadProject: (project) => {
    set({
      projectName: project.name,
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
      widgets: project.widgets,
      selectedId: null,
    });
  },

  exportProject: () => {
    const s = get();
    return {
      name: s.projectName,
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      widgets: s.widgets,
    };
  },

  setProjectName: (name) => set({ projectName: name }),
}));
```

**Step 2: Commit**

```bash
git add frontend/src/store/
git commit -m "feat: add Zustand store with all widget and project actions"
```

---

## Phase 3: Frontend UI

### Task 7: App Layout + Toolbar

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/Toolbar.tsx`

**Step 1: Write Toolbar component**

`frontend/src/components/Toolbar.tsx`:
```tsx
import { useDesignerStore } from "../store/designerStore";

export function Toolbar() {
  const { exportProject, loadProject, projectName, setProjectName } =
    useDesignerStore();

  const handleSave = () => {
    const project = exportProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.tkdesigner.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.tkdesigner.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const project = JSON.parse(ev.target?.result as string);
          loadProject(project);
        } catch {
          alert("Invalid project file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-12 bg-gray-800 text-white flex items-center px-4 gap-4 shrink-0">
      <h1 className="font-bold text-lg">Tkinter Designer</h1>
      <div className="h-6 w-px bg-gray-600" />
      <input
        className="bg-gray-700 px-2 py-1 rounded text-sm w-40"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <button
        onClick={handleSave}
        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
      >
        Save
      </button>
      <button
        onClick={handleLoad}
        className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
      >
        Load
      </button>
    </div>
  );
}
```

**Step 2: Rewrite App.tsx with layout**

`frontend/src/App.tsx`:
```tsx
import { Toolbar } from "./components/Toolbar";
import { Toolbox } from "./components/Toolbox";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbox />
        <Canvas />
        <PropertyPanel />
      </div>
    </div>
  );
}
```

**Step 3: Verify**

```bash
cd frontend && npm run dev
```

Expected: App compiles (Toolbox/Canvas/PropertyPanel placeholders needed — create them next).

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add Toolbar with save/load and App layout skeleton"
```

---

### Task 8: Toolbox Component

**Files:**
- Create: `frontend/src/components/Toolbox.tsx`

**Step 1: Write Toolbox**

Each widget type is a draggable item. User drags from Toolbox onto Canvas. Uses @dnd-kit's `useDraggable`.

```tsx
import { useDraggable } from "@dnd-kit/core";
import { WIDGET_TYPES } from "../types/widgets";
import type { WidgetType } from "../types/widgets";

function WidgetItem({ type }: { type: WidgetType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { fromToolbox: true, widgetType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-gray-700 hover:bg-gray-600 p-2 rounded cursor-grab text-sm select-none ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {type}
    </div>
  );
}

export function Toolbox() {
  return (
    <div className="w-48 bg-gray-800 border-r border-gray-700 p-3 overflow-y-auto shrink-0">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Widgets</h2>
      <div className="flex flex-col gap-2">
        {WIDGET_TYPES.map((type) => (
          <WidgetItem key={type} type={type} />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/Toolbox.tsx
git commit -m "feat: add Toolbox with draggable widget palette"
```

---

### Task 9: Canvas Component — Drag & Drop + Move + Resize

**Files:**
- Create: `frontend/src/components/Canvas.tsx`

This is the largest frontend component. It handles:
1. Dropping new widgets from Toolbox
2. Selecting widgets by click
3. Moving widgets by drag
4. Resizing via corner handles

**Step 1: Write Canvas component**

```tsx
import { useDroppable } from "@dnd-kit/core";
import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import { getSpec } from "../utils/widgetDefaults";
import { useRef, useState, useCallback } from "react";

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
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

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
        onMove(widget.id, moveRef.current.widgetX + dx, moveRef.current.widgetY + dy);
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

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: widget.width,
        startH: widget.height,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        onResize(widget.id, resizeRef.current.startW + dx, resizeRef.current.startH + dy);
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [widget.id, widget.width, widget.height, onResize],
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
    >
      <span className="text-xs text-gray-300 truncate px-1">
        {spec.defaultProps.text !== undefined ? displayText : widget.type}
      </span>
      {isSelected && (
        <>
          {/* Resize handle - bottom right */}
          <div
            className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-se-resize"
            onMouseDown={handleResizeStart}
          />
          {/* Resize handle - bottom left */}
          <div
            className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-sw-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              /* TODO: implement bottom-left resize if needed */
            }}
          />
          {/* Resize handle - top right */}
          <div
            className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-ne-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              /* TODO: implement top-right resize if needed */
            }}
          />
        </>
      )}
    </div>
  );
}

export function Canvas() {
  const { widgets, selectedId, canvasWidth, canvasHeight, addWidget, selectWidget, moveWidget, resizeWidget } =
    useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-4">
      <div
        ref={setNodeRef}
        className={`relative bg-white border-2 border-dashed ${
          isOver ? "border-blue-400" : "border-gray-600"
        }`}
        style={{ width: canvasWidth, height: canvasHeight }}
        onClick={() => selectWidget(null)}
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

// Exported for App.tsx DndContext integration
export { Canvas as default };
```

**Step 2: Commit**

```bash
git add frontend/src/components/Canvas.tsx
git commit -m "feat: add Canvas with widget rendering, selection, move, and resize"
```

---

### Task 10: Wire Up DnD in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add DndContext to App.tsx**

Replace App.tsx to connect Toolbox drag → Canvas drop:

```tsx
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { Toolbox } from "./components/Toolbox";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { CodePreview } from "./components/CodePreview";
import { useDesignerStore } from "./store/designerStore";
import type { WidgetType } from "./types/widgets";

export default function App() {
  const addWidget = useDesignerStore((s) => s.addWidget);
  const [draggingType, setDraggingType] = useState<WidgetType | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingType(null);
    const { active, over } = event;
    if (!over || over.id !== "canvas") return;

    const data = active.data.current;
    if (data?.fromToolbox && data.widgetType) {
      // Get canvas-relative position from the delta
      const canvasEl = document.querySelector('[data-canvas="true"]');
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const x = Math.max(0, Math.round(event.delta.x + rect.left + (active.rect.current.translated?.left ?? rect.left) - rect.left));
      const y = Math.max(0, Math.round(event.delta.y + rect.top + (active.rect.current.translated?.top ?? rect.top) - rect.top));
      // Simplified: drop at center of canvas if delta is 0
      const dropX = event.delta.x !== 0 ? Math.round((active.rect.current.translated?.left ?? 0) - rect.left) : Math.round(rect.width / 2 - 60);
      const dropY = event.delta.y !== 0 ? Math.round((active.rect.current.translated?.top ?? 0) - rect.top) : Math.round(rect.height / 2 - 20);
      addWidget(data.widgetType, Math.max(0, dropX), Math.max(0, dropY));
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => {
      const data = e.active.data.current;
      if (data?.fromToolbox) setDraggingType(data.widgetType);
    }}>
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Toolbox />
          <div className="flex-1 flex flex-col">
            <Canvas />
            <CodePreview />
          </div>
          <PropertyPanel />
        </div>
      </div>
      <DragOverlay>
        {draggingType ? (
          <div className="bg-gray-600 px-3 py-2 rounded text-sm opacity-80">
            {draggingType}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

Also add `data-canvas="true"` to the canvas div in Canvas.tsx:

In `frontend/src/components/Canvas.tsx`, update the canvas div:
```tsx
<div
  ref={setNodeRef}
  data-canvas="true"
  className={`relative bg-white ...`}
```

**Step 2: Commit**

```bash
git add frontend/src/
git commit -m "feat: wire up DnD context for toolbox-to-canvas drag and drop"
```

---

### Task 11: Property Panel

**Files:**
- Create: `frontend/src/components/PropertyPanel.tsx`

**Step 1: Write PropertyPanel**

Renders editors for the selected widget based on widget spec. Includes geometry (x, y, width, height) and widget-specific props.

```tsx
import { useDesignerStore } from "../store/designerStore";
import { getEditableProps, getSpec } from "../utils/widgetDefaults";

export function PropertyPanel() {
  const { widgets, selectedId, moveWidget, resizeWidget, updateWidgetProp, removeWidget } =
    useDesignerStore();

  const widget = widgets.find((w) => w.id === selectedId);

  if (!widget) {
    return (
      <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 shrink-0">
        <h2 className="text-sm font-semibold text-gray-400">Properties</h2>
        <p className="text-xs text-gray-500 mt-2">Select a widget to edit</p>
      </div>
    );
  }

  const spec = getSpec(widget.type);
  const editableProps = getEditableProps(widget.type);

  return (
    <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400">Properties</h2>
        <button
          onClick={() => removeWidget(widget.id)}
          className="text-red-400 hover:text-red-300 text-xs"
        >
          Delete
        </button>
      </div>

      {/* Widget type badge */}
      <div className="text-xs text-gray-500 mb-3">Type: {widget.type}</div>

      {/* Geometry */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">Geometry</h3>
        <div className="grid grid-cols-2 gap-1">
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key} className="text-xs text-gray-400">
              {key}
              <input
                type="number"
                className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                value={widget[key]}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) return;
                  if (key === "x" || key === "y") {
                    moveWidget(widget.id, key === "x" ? val : widget.x, key === "y" ? val : widget.y);
                  } else {
                    resizeWidget(widget.id, key === "width" ? val : widget.width, key === "height" ? val : widget.height);
                  }
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Widget-specific props */}
      {editableProps.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-1">Widget Properties</h3>
          <div className="flex flex-col gap-2">
            {editableProps.map((prop) => (
              <label key={prop.key} className="text-xs text-gray-400">
                {prop.label}
                {prop.type === "select" ? (
                  <select
                    className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                    value={String(widget.props[prop.key] ?? "")}
                    onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : prop.type === "color" ? (
                  <input
                    type="color"
                    className="block w-full h-7 bg-gray-700 rounded mt-0.5 cursor-pointer"
                    value={String(widget.props[prop.key] ?? "#000000")}
                    onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={prop.type === "number" ? "number" : "text"}
                    className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                    value={String(widget.props[prop.key] ?? "")}
                    onChange={(e) =>
                      updateWidgetProp(
                        widget.id,
                        prop.key,
                        prop.type === "number" ? Number(e.target.value) : e.target.value,
                      )
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/PropertyPanel.tsx
git commit -m "feat: add PropertyPanel with geometry and widget-specific editors"
```

---

### Task 12: Code Preview Component

**Files:**
- Create: `frontend/src/components/CodePreview.tsx`

**Step 1: Write CodePreview**

Shows generated Tkinter code in a collapsible panel at the bottom. Code generation happens client-side for instant feedback.

```tsx
import { useDesignerStore } from "../store/designerStore";
import { useState } from "react";

function generateCode(widgets: ReturnType<typeof useDesignerStore.getState>["widgets"], canvasWidth: number, canvasHeight: number): string {
  const lines: string[] = [
    "import tkinter as tk",
    "",
    "root = tk.Tk()",
    `root.geometry("${canvasWidth}x${canvasHeight}")`,
    `root.title("Tkinter Designer")`,
    "",
  ];

  for (const w of widgets) {
    const varName = `${w.type.toLowerCase()}_${w.id.slice(0, 6)}`;
    const propsStr = Object.entries(w.props)
      .filter(([, v]) => v !== "" && v !== undefined)
      .map(([k, v]) => {
        if (typeof v === "string") return `${k}="${v}"`;
        return `${k}=${v}`;
      })
      .join(", ");
    const propsPart = propsStr ? `, ${propsStr}` : "";
    lines.push(`${varName} = tk.${w.type}(root${propsPart})`);
    lines.push(`${varName}.place(x=${Math.round(w.x)}, y=${Math.round(w.y)}, width=${Math.round(w.width)}, height=${Math.round(w.height)})`);
    lines.push("");
  }

  lines.push("root.mainloop()");
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
```

**Step 2: Commit**

```bash
git add frontend/src/components/CodePreview.tsx
git commit -m "feat: add CodePreview with client-side Tkinter code generation"
```

---

## Phase 4: Backend — Code Generation & Python Runner

### Task 13: Backend Data Models

**Files:**
- Create: `backend/app/models/project.py`

**Step 1: Write Pydantic models**

```python
from pydantic import BaseModel
from typing import Literal

WidgetType = Literal[
    "Button", "Label", "Entry", "Text",
    "Checkbutton", "Radiobutton", "Listbox", "Scale", "Frame",
]


class WidgetInstance(BaseModel):
    id: str
    type: WidgetType
    x: float
    y: float
    width: float
    height: float
    props: dict[str, object] = {}


class Project(BaseModel):
    name: str = "Untitled"
    canvas_width: int = 800
    canvas_height: int = 600
    widgets: list[WidgetInstance]
```

**Step 2: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add Pydantic models for project and widget data"
```

---

### Task 14: Code Generation Engine

**Files:**
- Create: `backend/app/codegen/tkinter_gen.py`

**Step 1: Write code generator**

```python
from app.models.project import Project


def generate_tkinter_code(project: Project) -> str:
    lines = [
        "import tkinter as tk",
        "",
        "",
        "def create_window():",
        f"    root = tk.Tk()",
        f'    root.geometry("{project.canvas_width}x{project.canvas_height}")',
        f'    root.title("{project.name}")',
        "",
    ]

    for w in project.widgets:
        var_name = f"{w.type.lower()}_{w.id[:6]}"
        props_parts: list[str] = []
        for k, v in w.props.items():
            if v == "" or v is None:
                continue
            if isinstance(v, str):
                props_parts.append(f'{k}="{v}"')
            else:
                props_parts.append(f"{k}={v}")

        props_str = ", " + ", ".join(props_parts) if props_parts else ""
        lines.append(f"    {var_name} = tk.{w.type}(root{props_str})")
        lines.append(
            f"    {var_name}.place("
            f"x={round(w.x)}, y={round(w.y)}, "
            f"width={round(w.width)}, height={round(w.height)})"
        )
        lines.append("")

    lines.append("    return root")
    lines.append("")
    lines.append("")
    lines.append('if __name__ == "__main__":')
    lines.append("    app = create_window()")
    lines.append("    app.mainloop()")
    lines.append("")

    return "\n".join(lines)
```

**Step 2: Verify manually**

```bash
cd backend && python -c "
from app.models.project import Project, WidgetInstance
from app.codegen.tkinter_gen import generate_tkinter_code

p = Project(
    name='Test',
    widgets=[
        WidgetInstance(id='abc123', type='Button', x=10, y=20, width=100, height=30, props={'text': 'Click me', 'bg': '#336699'}),
    ],
)
print(generate_tkinter_code(p))
"
```

Expected: Valid Python Tkinter code using place().

**Step 3: Commit**

```bash
git add backend/app/codegen/tkinter_gen.py
git commit -m "feat: add Tkinter code generation engine"
```

---

### Task 15: Preview API (Python Runner)

**Files:**
- Modify: `backend/app/api/preview.py`

**Step 1: Implement preview endpoint**

```python
import tempfile
import subprocess
import os

from fastapi import APIRouter, HTTPException
from app.models.project import Project
from app.codegen.tkinter_gen import generate_tkinter_code

router = APIRouter()


@router.post("/preview")
def preview(project: Project):
    code = generate_tkinter_code(project)

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, prefix="tkdesigner_"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        subprocess.Popen(
            ["python", tmp_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "launched", "code": code}
```

**Step 2: Test with curl**

```bash
curl -X POST http://localhost:8000/api/preview \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "canvas_width": 400,
    "canvas_height": 300,
    "widgets": [
      {"id": "w1", "type": "Button", "x": 50, "y": 50, "width": 100, "height": 30, "props": {"text": "Hello"}}
    ]
  }'
```

Expected: Tkinter window pops up with a Button. API returns `{"status":"launched","code":"..."}`.

**Step 3: Commit**

```bash
git add backend/app/api/preview.py
git commit -m "feat: add preview API that runs generated Tkinter code"
```

---

### Task 16: Export API

**Files:**
- Modify: `backend/app/api/export.py`

**Step 1: Implement export endpoint**

```python
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from app.models.project import Project
from app.codegen.tkinter_gen import generate_tkinter_code

router = APIRouter()


@router.post("/export")
def export(project: Project):
    code = generate_tkinter_code(project)
    filename = project.name.replace(" ", "_") + ".py"
    return PlainTextResponse(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

**Step 2: Commit**

```bash
git add backend/app/api/export.py
git commit -m "feat: add export API that returns .py file download"
```

---

## Phase 5: Frontend ↔ Backend Integration

### Task 17: Connect Preview & Export Buttons

**Files:**
- Modify: `frontend/src/components/Toolbar.tsx`

**Step 1: Add Preview and Export buttons to Toolbar**

Add these buttons and handlers after the existing Load button:

```tsx
// Add inside Toolbar component, after existing buttons:
const handlePreview = async () => {
  const project = exportProject();
  await fetch("/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: project.name,
      canvas_width: project.canvasWidth,
      canvas_height: project.canvasHeight,
      widgets: project.widgets,
    }),
  });
};

const handleExport = async () => {
  const project = exportProject();
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: project.name,
      canvas_width: project.canvasWidth,
      canvas_height: project.canvasHeight,
      widgets: project.widgets,
    }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/ /g, "_")}.py`;
  a.click();
  URL.revokeObjectURL(url);
};

// JSX — add after Load button:
<button
  onClick={handlePreview}
  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
>
  Preview
</button>
<button
  onClick={handleExport}
  className="bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded text-sm"
>
  Export .py
</button>
```

**Step 2: Commit**

```bash
git add frontend/src/components/Toolbar.tsx
git commit -m "feat: add Preview and Export buttons connected to backend API"
```

---

### Task 18: Clean Up & Verify End-to-End

**Step 1: Remove unused boilerplate**

Delete `frontend/src/App.css` and `frontend/src/assets/` if they exist.

**Step 2: Start both servers**

```bash
python dev.py
```

**Step 3: Manual verification checklist**

1. Open http://localhost:5173
2. Drag "Button" from Toolbox → Canvas — widget appears
3. Click widget — selection ring + resize handles appear
4. Drag widget on canvas — it moves
5. Drag resize handle — widget resizes
6. Edit properties in PropertyPanel — changes reflect on canvas
7. Click "Preview" — Tkinter window pops up with matching layout
8. Click "Export .py" — .py file downloads
9. Click "Save" — JSON project file downloads
10. Click "Load" — upload saved JSON, widgets restore

**Step 4: Fix any issues found during verification**

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete MVP — drag-and-drop Tkinter designer with live preview"
```

---

## Summary

| Phase | Tasks | Key Deliverable |
|-------|-------|----------------|
| 1. Scaffolding | 1-3 | Frontend + Backend running |
| 2. Data Layer | 4-6 | Types, widget specs, Zustand store |
| 3. Frontend UI | 7-12 | Full UI with drag/drop, property editing, code preview |
| 4. Backend | 13-16 | Code generation + Python runner |
| 5. Integration | 17-18 | End-to-end working application |

Total: 18 tasks, ~18 commits.
