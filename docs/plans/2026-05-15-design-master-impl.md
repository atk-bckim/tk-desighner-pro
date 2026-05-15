# Tkinter Designer — Full Polish & Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the MVP into a professional-grade Tkinter visual design tool with Frame nesting, undo/redo, snap-to-grid, more widgets, and polished UI.

**Architecture:** Incremental enhancement of existing React + Zustand + FastAPI stack. Core changes: add parentId for Frame nesting, undo/redo via Zustand middleware, snap-to-grid in Canvas, and new panels (ObjectTree, StatusBar). All layout uses place() only.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, @dnd-kit/core, Tailwind CSS v4, FastAPI

---

## Phase 1: Critical Bug Fixes

### Task 1: Fix click selection (event propagation bug)

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

**Problem:** `onMouseDown` calls `e.stopPropagation()` which stops mouseDown but NOT click. Click bubbles to canvas parent → `selectWidget(null)` fires → widget gets immediately deselected.

**Fix:** Add an `onClick` handler to the widget div that stops propagation:

In `Canvas.tsx`, add to the WidgetRenderer's outer div:

```tsx
onClick={(e) => e.stopPropagation()}
```

Add this after the existing `onMouseDown={handleMouseDown}` on line 104.

Also change the canvas container from `onClick` to `onMouseDown` for deselection, so deselection only triggers on mouse press on empty canvas area:

```tsx
// Change line 147 from:
onClick={() => selectWidget(null)}
// To:
onMouseDown={(e) => {
  if (e.target === e.currentTarget) selectWidget(null);
}}
```

**Verify:** Click a widget → it stays selected, PropertyPanel shows its properties.

**Commit:** `fix: fix click selection event propagation bug`

---

### Task 2: Fix directional resize handles

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

**Problem:** All 4 corner handles use the same resize logic (dx/dy → width/height). Only SE works correctly.

**Fix:** Create direction-aware resize functions. Replace `handleResizeStart` with a factory:

```tsx
const createResizeHandler = useCallback(
  (direction: "se" | "sw" | "ne" | "nw") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = widget.width;
    const startH = widget.height;
    const startWidgetX = widget.x;
    const startWidgetY = widget.y;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newW = startW, newH = startH, newX = startWidgetX, newY = startWidgetY;

      if (direction === "se") { newW = startW + dx; newH = startH + dy; }
      else if (direction === "sw") { newW = startW - dx; newH = startH + dy; newX = startWidgetX + dx; }
      else if (direction === "ne") { newW = startW + dx; newH = startH - dy; newY = startWidgetY + dy; }
      else if (direction === "nw") { newW = startW - dx; newH = startH - dy; newX = startWidgetX + dx; newY = startWidgetY + dy; }

      if (newW >= 20) { onResize(widget.id, newW, newH); if (direction !== "se") onMove(widget.id, newX, newY); }
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
```

Update handle references in the resize handles to use specific directions:

```tsx
{isSelected && (
  <>
    <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-se-resize" onMouseDown={createResizeHandler("se")} />
    <div className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-sm cursor-sw-resize" onMouseDown={createResizeHandler("sw")} />
    <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-ne-resize" onMouseDown={createResizeHandler("ne")} />
    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white rounded-sm cursor-nw-resize" onMouseDown={createResizeHandler("nw")} />
  </>
)}
```

**Commit:** `fix: implement directional resize handles for all 4 corners`

---

## Phase 2: Data Model & Store Enhancements

### Task 3: Add parentId to WidgetInstance for Frame nesting

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/utils/widgetDefaults.ts`
- Modify: `frontend/src/store/designerStore.ts`

**Step 1: Update types**

In `widgets.ts`, add `parentId` to `WidgetInstance`:

```typescript
export interface WidgetInstance {
  id: string;
  type: WidgetType;
  parentId: string | null;  // null = root, Frame id = child of that Frame
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
}
```

**Step 2: Update widgetDefaults**

In `createWidget()`, add parentId parameter:

```typescript
export function createWidget(
  type: WidgetType,
  x: number,
  y: number,
  parentId: string | null = null,
): WidgetInstance {
  const spec = SPECS[type];
  return {
    id: uuid(),
    type,
    parentId,
    x,
    y,
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    props: { ...spec.defaultProps },
  };
}
```

**Step 3: Update store**

- `addWidget` accepts optional `parentId`
- `removeWidget` also removes all children recursively
- Add `getChildren(parentId)` helper
- Add `moveWidgetToParent(id, newParentId)` for reparenting

```typescript
addWidget: (type, x, y, parentId = null) => {
  const widget = createWidget(type, x, y, parentId);
  set((s) => ({ widgets: [...s.widgets, widget], selectedId: widget.id }));
},

removeWidget: (id) => {
  // Collect IDs to remove: the widget + all descendants
  const toRemove = new Set<string>();
  const collect = (parentId: string) => {
    toRemove.add(parentId);
    get().widgets.filter(w => w.parentId === parentId).forEach(w => collect(w.id));
  };
  collect(id);
  set((s) => ({
    widgets: s.widgets.filter((w) => !toRemove.has(w.id)),
    selectedId: s.selectedId && toRemove.has(s.selectedId) ? null : s.selectedId,
  }));
},
```

**Verify:** TypeScript compiles, existing tests (if any) pass.

**Commit:** `feat: add parentId to WidgetInstance for Frame nesting`

---

### Task 4: Add undo/redo to store

**Files:**
- Modify: `frontend/src/store/designerStore.ts`

**Approach:** Use Zustand's `temporal` middleware pattern — store a history stack of widget states. On each mutation, push previous state to undo stack. Clear redo stack on new mutation.

Add to store interface:

```typescript
// New state
undoStack: WidgetInstance[][];
redoStack: WidgetInstance[][];

// New actions
undo: () => void;
redo: () => void;
```

Implementation pattern:

```typescript
undoStack: [],
redoStack: [],

// Helper to snapshot current widgets before mutation
_snapshot: () => {
  const current = get().widgets;
  set((s) => ({ undoStack: [...s.undoStack, current], redoStack: [] }));
},

undo: () => {
  const { undoStack, widgets } = get();
  if (undoStack.length === 0) return;
  const prev = undoStack[undoStack.length - 1];
  set({
    widgets: prev,
    undoStack: undoStack.slice(0, -1),
    redoStack: [...get().redoStack, widgets],
    selectedId: null,
  });
},

redo: () => {
  const { redoStack, widgets } = get();
  if (redoStack.length === 0) return;
  const next = redoStack[redoStack.length - 1];
  set({
    widgets: next,
    undoStack: [...get().undoStack, widgets],
    redoStack: redoStack.slice(0, -1),
    selectedId: null,
  });
},
```

Then call `_snapshot()` at the start of every mutation action (addWidget, removeWidget, moveWidget, resizeWidget, updateWidgetProp, loadProject). For moveWidget and resizeWidget, snapshot only on mouseup (not every pixel) — this requires calling snapshot from the component. Add a `snapshot()` public action that wraps `_snapshot`.

**Commit:** `feat: add undo/redo with history stack to Zustand store`

---

### Task 5: Add duplicate, z-order, and snap actions to store

**Files:**
- Modify: `frontend/src/store/designerStore.ts`

Add these new actions:

```typescript
// Duplicate selected widget (offset by 20px)
duplicateWidget: (id: string) => {
  const widget = get().widgets.find(w => w.id === id);
  if (!widget) return;
  const clone = { ...widget, id: uuid(), x: widget.x + 20, y: widget.y + 20, props: { ...widget.props } };
  set((s) => ({ widgets: [...s.widgets, clone], selectedId: clone.id }));
},

// Z-order: bring to front (move to end of array = rendered last = on top)
bringToFront: (id: string) => {
  set((s) => {
    const idx = s.widgets.findIndex(w => w.id === id);
    if (idx === -1) return s;
    const w = s.widgets[idx];
    const rest = s.widgets.filter((_, i) => i !== idx);
    return { widgets: [...rest, w] };
  });
},

// Z-order: send to back
sendToBack: (id: string) => {
  set((s) => {
    const idx = s.widgets.findIndex(w => w.id === id);
    if (idx === -1) return s;
    const w = s.widgets[idx];
    const rest = s.widgets.filter((_, i) => i !== idx);
    return { widgets: [w, ...rest] };
  });
},

// Set canvas size
setCanvasSize: (width: number, height: number) => {
  set({ canvasWidth: width, canvasHeight: height });
},

// Snap to grid
snapToGrid: (gridSize: number = 10) => {
  set((s) => ({
    widgets: s.widgets.map(w => ({
      ...w,
      x: Math.round(w.x / gridSize) * gridSize,
      y: Math.round(w.y / gridSize) * gridSize,
      width: Math.round(w.width / gridSize) * gridSize,
      height: Math.round(w.height / gridSize) * gridSize,
    })),
  }));
},
```

Add `gridSize` and `snapEnabled` to state:

```typescript
gridSize: 10,
snapEnabled: true,
setGridSize: (size: number) => set({ gridSize: size }),
toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
```

**Commit:** `feat: add duplicate, z-order, canvas size, and snap actions to store`

---

## Phase 3: Canvas Improvements

### Task 6: Grid lines on canvas + snap-to-grid

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`
- Modify: `frontend/src/App.tsx` (pass grid props)

Add grid rendering inside the canvas div using a CSS background pattern:

```tsx
// Inside Canvas component, compute grid style:
const { gridSize, snapEnabled } = useDesignerStore();

const gridStyle = snapEnabled ? {
  backgroundImage: `
    linear-gradient(to right, #f0f0f0 1px, transparent 1px),
    linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)
  `,
  backgroundSize: `${gridSize}px ${gridSize}px`,
} : {};
```

Apply `gridStyle` to the canvas div's `style` prop alongside width/height.

For snap behavior: in `handleMouseMove` of the WidgetRenderer, round coordinates to nearest grid multiple when snap is enabled:

```tsx
const snap = useDesignerStore.getState().snapEnabled;
const grid = useDesignerStore.getState().gridSize;
const snapVal = (v: number) => snap ? Math.round(v / grid) * grid : v;

// In move handler:
onMove(widget.id, snapVal(Math.max(0, ...)), snapVal(Math.max(0, ...)));

// In resize handler:
onResize(widget.id, snapVal(Math.max(20, ...)), snapVal(Math.max(20, ...)));
```

**Commit:** `feat: add grid lines and snap-to-grid on canvas`

---

### Task 7: Frame nesting — render children inside Frame widgets

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

Change the Canvas rendering to support parent-child hierarchy:

```tsx
export function Canvas() {
  const { widgets, selectedId, canvasWidth, canvasHeight, selectWidget, moveWidget, resizeWidget, addWidget, gridSize, snapEnabled } =
    useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  // Root-level widgets (parentId === null)
  const rootWidgets = widgets.filter(w => w.parentId === null);

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-4" onClick={() => {}}>
      <div
        ref={setNodeRef}
        data-canvas="true"
        className={`relative bg-white border-2 border-dashed ${isOver ? "border-blue-400" : "border-gray-600"}`}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          ...gridStyle,
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectWidget(null);
        }}
        onDragOver={/* ... handle drop into canvas root */}
      >
        {rootWidgets.map((w) => renderWidget(w))}
      </div>
    </div>
  );

  function renderWidget(w: WidgetInstance) {
    const children = widgets.filter(c => c.parentId === w.id);
    return (
      <WidgetRenderer
        key={w.id}
        widget={w}
        isSelected={w.id === selectedId}
        onSelect={() => selectWidget(w.id)}
        onMove={moveWidget}
        onResize={resizeWidget}
      >
        {/* If this widget is a Frame, render children inside it */}
        {w.type === "Frame" && children.map(child => renderWidget(child))}
      </WidgetRenderer>
    );
  }
}
```

Modify `WidgetRenderer` to accept `children`:

```tsx
function WidgetRenderer({ widget, isSelected, onSelect, onMove, onResize, children }: {
  widget: WidgetInstance;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  children?: React.ReactNode;
}) {
  // ... existing logic ...

  return (
    <div
      className={`absolute border-2 ${color} rounded flex items-center justify-center cursor-move select-none ${...}`}
      style={{ left: widget.x, top: widget.y, width: widget.width, height: widget.height }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Label for non-Frame widgets */}
      {widget.type !== "Frame" && (
        <span className="text-xs text-gray-300 truncate px-1">
          {spec.defaultProps.text !== undefined ? displayText : widget.type}
        </span>
      )}
      {/* Frame renders children */}
      {widget.type === "Frame" && (
        <div className="relative w-full h-full">
          {children}
        </div>
      )}
      {/* Resize handles */}
      {isSelected && (/* ... existing handles ... */)}
    </div>
  );
}
```

Also make Frame widgets droppable targets for @dnd-kit. Add `useDroppable` to Frame WidgetRenderers with a unique ID like `frame-{widget.id}`, and update `handleDragEnd` in App.tsx to detect if the drop target is a Frame.

**Commit:** `feat: render Frame children with parent-child nesting support`

---

### Task 8: Better widget visual rendering

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

Replace the uniform colored box rendering with type-specific visual cues:

```tsx
const WIDGET_STYLES: Record<string, string> = {
  Button: "bg-gray-100 border-gray-400 rounded shadow-sm hover:shadow-md",
  Label: "bg-transparent border-transparent",
  Entry: "bg-white border-gray-300 border-b-2",
  Text: "bg-white border-gray-300",
  Checkbutton: "bg-transparent border-transparent",
  Radiobutton: "bg-transparent border-transparent",
  Listbox: "bg-white border-gray-300",
  Scale: "bg-gray-50 border-gray-300",
  Frame: "bg-gray-50 border-gray-400 border-dashed",
};

// Inside WidgetRenderer, add type-specific inner content:
function renderWidgetContent(widget: WidgetInstance) {
  const text = String(widget.props.text ?? "");
  switch (widget.type) {
    case "Button":
      return <span className="text-xs text-gray-700 font-medium truncate">{text || "Button"}</span>;
    case "Label":
      return <span className="text-xs text-gray-800 truncate">{text || "Label"}</span>;
    case "Entry":
      return <div className="w-full h-full flex items-center px-1"><span className="text-xs text-gray-400">Entry</span></div>;
    case "Text":
      return <div className="w-full h-full text-xs text-gray-400 p-1">Text area</div>;
    case "Checkbutton":
      return <div className="flex items-center gap-1 px-1"><div className="w-3 h-3 border border-gray-400 rounded-sm" /><span className="text-xs text-gray-700">{text || "Check"}</span></div>;
    case "Radiobutton":
      return <div className="flex items-center gap-1 px-1"><div className="w-3 h-3 border border-gray-400 rounded-full" /><span className="text-xs text-gray-700">{text || "Radio"}</span></div>;
    case "Listbox":
      return <div className="w-full h-full text-xs text-gray-500 p-1"><div>Listbox</div></div>;
    case "Scale":
      return <div className="w-full flex items-center px-2"><div className="flex-1 h-1 bg-gray-300 rounded"><div className="w-3 h-3 bg-blue-500 rounded-full -mt-1" /></div></div>;
    case "Frame":
      return null; // Frame renders children
    default:
      return <span className="text-xs text-gray-500">{widget.type}</span>;
  }
}
```

Remove the old `WIDGET_COLORS` constant and `displayText` logic. Use `WIDGET_STYLES` for border/bg and `renderWidgetContent` for inner content.

**Commit:** `feat: add type-specific visual rendering for each widget`

---

## Phase 4: Keyboard Shortcuts

### Task 9: Global keyboard shortcuts

**Files:**
- Modify: `frontend/src/App.tsx`

Add a `useEffect` with keyboard event listener in App.tsx:

```tsx
import { useEffect } from "react";

// Inside App component:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const store = useDesignerStore.getState();

    // Don't capture when typing in input fields
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "SELECT") return;

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
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
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
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // Trigger save
      const project = store.exportProject();
      const json = JSON.stringify(project, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.tkdesigner.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

**Commit:** `feat: add keyboard shortcuts (Delete, Ctrl+Z/Y, Ctrl+D, Ctrl+S)`

---

## Phase 5: New Panels

### Task 10: Canvas size editor in PropertyPanel

**Files:**
- Modify: `frontend/src/components/PropertyPanel.tsx`

When no widget is selected, show canvas size editors instead of just "Select a widget to edit":

```tsx
if (!widget) {
  return (
    <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 shrink-0">
      <h2 className="text-sm font-semibold text-gray-400">Properties</h2>
      <div className="mt-3">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">Canvas Size</h3>
        <div className="grid grid-cols-2 gap-1">
          <label className="text-xs text-gray-400">
            Width
            <input type="number" className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
              value={canvasWidth} onChange={(e) => setCanvasSize(parseInt(e.target.value) || 800, canvasHeight)} />
          </label>
          <label className="text-xs text-gray-400">
            Height
            <input type="number" className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
              value={canvasHeight} onChange={(e) => setCanvasSize(canvasWidth, parseInt(e.target.value) || 600)} />
          </label>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">Select a widget to edit its properties</p>
    </div>
  );
}
```

Add `canvasWidth`, `canvasHeight`, `setCanvasSize` to the store destructuring at the top of PropertyPanel.

**Commit:** `feat: add canvas size editor to PropertyPanel`

---

### Task 11: Object tree panel

**Files:**
- Create: `frontend/src/components/ObjectTree.tsx`
- Modify: `frontend/src/App.tsx`

Create a collapsible tree view showing all widgets in hierarchy order:

```tsx
import { useDesignerStore } from "../store/designerStore";
import type { WidgetInstance } from "../types/widgets";
import { useState } from "react";

function TreeNode({ widget, depth = 0 }: { widget: WidgetInstance; depth?: number }) {
  const { widgets, selectedId, selectWidget } = useDesignerStore();
  const [expanded, setExpanded] = useState(true);
  const children = widgets.filter(w => w.parentId === widget.id);
  const isSelected = selectedId === widget.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer text-xs hover:bg-gray-700 ${isSelected ? "bg-blue-900/50 text-blue-300" : "text-gray-300"}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => selectWidget(widget.id)}
      >
        {children.length > 0 && (
          <button className="w-3 text-gray-500" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? "▾" : "▸"}
          </button>
        )}
        {children.length === 0 && <span className="w-3" />}
        <span className="truncate">{String(widget.props.text ?? widget.type)}</span>
        <span className="text-gray-600 ml-auto">{widget.type}</span>
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
```

In App.tsx, add ObjectTree between Toolbox and Canvas in the layout:

```tsx
<div className="flex flex-1 overflow-hidden">
  <Toolbox />
  <ObjectTree />
  <div className="flex flex-1 flex-col overflow-hidden">
    <Canvas />
    <CodePreview />
  </div>
  <PropertyPanel />
</div>
```

**Commit:** `feat: add ObjectTree panel showing widget hierarchy`

---

### Task 12: Status bar

**Files:**
- Create: `frontend/src/components/StatusBar.tsx`
- Modify: `frontend/src/App.tsx`

Create a status bar at the bottom:

```tsx
import { useDesignerStore } from "../store/designerStore";

export function StatusBar() {
  const { widgets, selectedId, canvasWidth, canvasHeight, gridSize, snapEnabled } = useDesignerStore();
  const selected = widgets.find(w => w.id === selectedId);

  return (
    <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-3 text-xs text-gray-500 gap-4 shrink-0">
      <span>Canvas: {canvasWidth}×{canvasHeight}</span>
      <span>Widgets: {widgets.length}</span>
      {selected && (
        <>
          <span>Selected: {selected.type}</span>
          <span>Pos: ({Math.round(selected.x)}, {Math.round(selected.y)})</span>
          <span>Size: {Math.round(selected.width)}×{Math.round(selected.height)}</span>
        </>
      )}
      <span className="ml-auto">Grid: {snapEnabled ? `${gridSize}px` : "off"}</span>
    </div>
  );
}
```

Add to App.tsx layout at the bottom of the outer flex-col div.

**Commit:** `feat: add StatusBar showing canvas info and selected widget details`

---

### Task 13: Toolbar redesign

**Files:**
- Modify: `frontend/src/components/Toolbar.tsx`

Add Undo, Redo, Delete, Duplicate, Grid toggle buttons:

```tsx
// Add to store destructuring:
const { undo, redo, snapshot } = useDesignerStore();

// Add undo/redo state tracking (subscribe to undoStack length for button disabled state):
const undoStackLen = useDesignerStore((s) => s.undoStack.length);
const redoStackLen = useDesignerStore((s) => s.redoStack.length);
const selectedId = useDesignerStore((s) => s.selectedId);
const snapEnabled = useDesignerStore((s) => s.snapEnabled);
const toggleSnap = useDesignerStore((s) => s.toggleSnap);

// Add buttons between Load and Preview:
<button onClick={() => { undo(); }} disabled={undoStackLen === 0} className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm disabled:opacity-30">↶</button>
<button onClick={() => { redo(); }} disabled={redoStackLen === 0} className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm disabled:opacity-30">↷</button>
<button onClick={() => { if (selectedId) { snapshot(); removeWidget(selectedId); } }} disabled={!selectedId} className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm disabled:opacity-30">🗑</button>
<button onClick={() => { if (selectedId) { snapshot(); duplicateWidget(selectedId); } }} disabled={!selectedId} className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm disabled:opacity-30">⧉</button>
<div className="h-6 w-px bg-gray-600" />
<button onClick={toggleSnap} className={`px-2 py-1 rounded text-sm ${snapEnabled ? "bg-blue-600" : "bg-gray-600 hover:bg-gray-700"}`}>Grid</button>
```

Note: Add `removeWidget`, `duplicateWidget`, `undo`, `redo`, `snapshot` to the store destructuring.

**Commit:** `feat: redesign Toolbar with Undo/Redo/Delete/Duplicate/Grid buttons`

---

## Phase 6: Additional Widgets & Properties

### Task 14: Add new widgets (LabelFrame, OptionMenu, Spinbox, Scrollbar, Separator)

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/utils/widgetDefaults.ts`
- Modify: `frontend/src/components/Canvas.tsx` (add widget styles)

Add to WidgetType union and WIDGET_TYPES array:

```typescript
| "LabelFrame"
| "OptionMenu"
| "Spinbox"
| "Scrollbar"
| "Separator"
```

Add specs in `widgetDefaults.ts`:

```typescript
LabelFrame: {
  defaultWidth: 250,
  defaultHeight: 200,
  defaultProps: { text: "LabelFrame" },
  editableProps: [
    { key: "text", label: "Title", type: "text" },
    { key: "bg", label: "Background", type: "color" },
    { key: "fg", label: "Foreground", type: "color" },
    { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
    { key: "bd", label: "Border width", type: "number" },
  ],
},
OptionMenu: {
  defaultWidth: 150,
  defaultHeight: 30,
  defaultProps: { values: "Option1,Option2,Option3" },
  editableProps: [
    { key: "values", label: "Options (comma-separated)", type: "text" },
    { key: "bg", label: "Background", type: "color" },
    { key: "fg", label: "Foreground", type: "color" },
  ],
},
Spinbox: {
  defaultWidth: 100,
  defaultHeight: 30,
  defaultProps: { from_: 0, to: 100, increment: 1 },
  editableProps: [
    { key: "from_", label: "From", type: "number" },
    { key: "to", label: "To", type: "number" },
    { key: "increment", label: "Increment", type: "number" },
    { key: "width", label: "Width (chars)", type: "number" },
  ],
},
Scrollbar: {
  defaultWidth: 20,
  defaultHeight: 200,
  defaultProps: { orient: "vertical" },
  editableProps: [
    { key: "orient", label: "Orientation", type: "select", options: ["vertical", "horizontal"] },
  ],
},
Separator: {
  defaultWidth: 200,
  defaultHeight: 4,
  defaultProps: { orient: "horizontal" },
  editableProps: [
    { key: "orient", label: "Orientation", type: "select", options: ["horizontal", "vertical"] },
  ],
},
```

LabelFrame acts like Frame (can contain children). Update the Frame nesting logic to treat LabelFrame the same as Frame.

Add visual styles in Canvas.tsx for each new widget type.

**Commit:** `feat: add LabelFrame, OptionMenu, Spinbox, Scrollbar, Separator widgets`

---

### Task 15: Expand editable properties for all widgets

**Files:**
- Modify: `frontend/src/utils/widgetDefaults.ts`

Add common properties that are missing from existing widgets. For each widget, add:

- **Button**: `relief` (select: flat/raised/sunken/groove/ridge), `state` (select: normal/disabled/active), `bd` (number), `justify` (select)
- **Label**: `state`, `wraplength` (number), `justify` (select: left/center/right)
- **Entry**: `bg`, `fg`, `state`, `justify`
- **Text**: `bg`, `fg`, `state`, `wrap` (select: char/word/none)
- **Checkbutton**: `state`, `justify`
- **Radiobutton**: `state`, `justify`
- **Listbox**: `bg`, `fg`
- **Scale**: `bg`, `fg`, `state`

**Commit:** `feat: expand editable properties for all widget types`

---

## Phase 7: Alignment & Advanced

### Task 16: Alignment tools

**Files:**
- Modify: `frontend/src/store/designerStore.ts`
- Modify: `frontend/src/components/Toolbar.tsx`

Add alignment actions to store:

```typescript
// Align selected widgets to a reference (first selected)
alignWidgets: (ids: string[], direction: "left" | "right" | "top" | "bottom" | "centerH" | "centerV") => {
  set((s) => {
    const targets = s.widgets.filter(w => ids.includes(w.id));
    if (targets.length < 2) return s;
    const ref = targets[0];
    const updated = s.widgets.map(w => {
      if (!ids.includes(w.id)) return w;
      switch (direction) {
        case "left": return { ...w, x: ref.x };
        case "right": return { ...w, x: ref.x + ref.width - w.width };
        case "top": return { ...w, y: ref.y };
        case "bottom": return { ...w, y: ref.y + ref.height - w.height };
        case "centerH": return { ...w, y: ref.y + (ref.height - w.height) / 2 };
        case "centerV": return { ...w, x: ref.x + (ref.width - w.width) / 2 };
        default: return w;
      }
    });
    return { widgets: updated };
  });
},
```

Add alignment dropdown buttons in Toolbar.

**Commit:** `feat: add alignment tools (left/right/top/bottom/center)`

---

### Task 17: Widget z-order controls

**Files:**
- Modify: `frontend/src/components/PropertyPanel.tsx`

Add "Bring to Front" / "Send to Back" buttons in PropertyPanel when a widget is selected:

```tsx
<div className="flex gap-1 mt-2">
  <button onClick={() => bringToFront(widget.id)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">ToFront</button>
  <button onClick={() => sendToBack(widget.id)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">ToBack</button>
</div>
```

**Commit:** `feat: add z-order controls to PropertyPanel`

---

## Phase 8: Backend Updates

### Task 18: Update backend for Frame nesting and new widgets

**Files:**
- Modify: `backend/app/models/project.py`
- Modify: `backend/app/codegen/tkinter_gen.py`

Add `parent_id` field to `WidgetInstance`:

```python
class WidgetInstance(BaseModel):
    id: str
    type: str  # Expand to allow new widget types
    parent_id: str | None = None
    x: float
    y: float
    width: float
    height: float
    props: dict[str, object] = {}
```

Update codegen to handle nesting:

```python
def generate_tkinter_code(project: Project) -> str:
    # ... header ...

    # Build parent-child map
    children_map: dict[str | None, list] = {}
    for w in project.widgets:
        children_map.setdefault(w.parent_id, []).append(w)

    def render_widget(w, parent_var: str, indent: str = "    "):
        var_name = f"{w.type.lower()}_{w.id[:8]}"
        # ... props generation ...
        lines.append(f"{indent}{var_name} = tk.{w.type}({parent_var}{props_str})")
        lines.append(f"{indent}{var_name}.place(x={round(w.x)}, y={round(w.y)}, width={round(w.width)}, height={round(w.height)})")
        lines.append("")
        # Render children
        for child in children_map.get(w.id, []):
            render_widget(child, var_name, indent + "    ")

    for w in children_map.get(None, []):
        render_widget(w, "root")

    # ... footer ...
```

Also update `WidgetType` literal to include new types, or just use `str` to be flexible.

**Commit:** `feat: update backend codegen for Frame nesting and new widget types`

---

## Phase 9: Final Integration

### Task 19: Update frontend-backend contract for parentId

**Files:**
- Modify: `frontend/src/components/Toolbar.tsx`

Update `handlePreview` and `handleExport` to include `parentId` in the widget JSON payload. The Pydantic model on the backend uses `parent_id` (snake_case):

```typescript
widgets: project.widgets.map(w => ({
  ...w,
  parent_id: w.parentId,
})),
```

**Commit:** `feat: include parentId in frontend-to-backend API payload`

---

### Task 20: End-to-end verification

**Step 1:** Start both servers with `python dev.py`

**Step 2:** Verify all features:

1. Drag Button from Toolbox → Canvas ✓
2. Click Button → stays selected, PropertyPanel shows ✓
3. Drag to move ✓
4. Resize from all 4 corners ✓
5. Ctrl+Z undo, Ctrl+Y redo ✓
6. Delete key removes widget ✓
7. Ctrl+D duplicates widget ✓
8. Grid lines visible, snap works ✓
9. Drop widget into Frame → appears inside Frame ✓
10. ObjectTree shows hierarchy ✓
11. StatusBar shows info ✓
12. Canvas size editable in PropertyPanel ✓
13. New widgets (LabelFrame etc.) work ✓
14. Preview launches real Tkinter window with nested layout ✓
15. Export generates correct nested Python code ✓
16. Save/Load preserves parentId ✓

**Step 3:** Fix any issues found

**Step 4:** Final commit

```bash
git add .
git commit -m "feat: complete design master overhaul — nesting, undo, snap, new widgets, UI"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Bug Fixes | 1-2 | Click selection, resize handles |
| 2. Data Model | 3-5 | parentId, undo/redo, duplicate, z-order, snap |
| 3. Canvas | 6-8 | Grid lines, snap, Frame nesting, widget visuals |
| 4. Keyboard | 9 | Global shortcuts |
| 5. Panels | 10-13 | Canvas size, ObjectTree, StatusBar, Toolbar |
| 6. Widgets | 14-15 | 5 new widgets, expanded properties |
| 7. Advanced | 16-17 | Alignment tools, z-order UI |
| 8. Backend | 18 | Nested codegen |
| 9. Integration | 19-20 | API contract, E2E verification |

Total: 20 tasks.
