# Tkinter Designer — Professional Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the designer into a professional-grade Tkinter visual design tool with parent-child sync, live property rendering, font picker, Notebook tabs, multi-select, alignment guides, zoom, and more.

**Architecture:** Incremental enhancement of existing React + Zustand + FastAPI stack. Core changes: relative coordinates for Frame children, dynamic style computation from widget props, modal components (font picker, context menu), multi-select state, and canvas zoom/pan.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, @dnd-kit/core, Tailwind CSS v4, FastAPI

---

## Phase 1: Core Data Model

### Task 1: Add `name` field to WidgetInstance

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/utils/widgetDefaults.ts`
- Modify: `frontend/src/store/designerStore.ts`
- Modify: `frontend/src/components/PropertyPanel.tsx`
- Modify: `frontend/src/components/ObjectTree.tsx`

**Changes:**

In `widgets.ts`, add `name` to WidgetInstance:
```typescript
export interface WidgetInstance {
  id: string;
  type: WidgetType;
  name: string;          // user-defined variable name
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
}
```

In `widgetDefaults.ts`, update `createWidget` to generate a default name:
```typescript
let widgetCounter: Record<string, number> = {};

export function createWidget(
  type: WidgetType,
  x: number,
  y: number,
  parentId: string | null = null,
): WidgetInstance {
  const spec = SPECS[type];
  if (!widgetCounter[type]) widgetCounter[type] = 0;
  widgetCounter[type]++;
  const name = `${type.toLowerCase()}_${widgetCounter[type]}`;
  return {
    id: uuid(),
    type,
    name,
    parentId,
    x, y,
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    props: { ...spec.defaultProps },
  };
}
```

In `designerStore.ts`, add `renameWidget` action:
```typescript
renameWidget: (id: string, name: string) => {
  set((s) => ({
    widgets: s.widgets.map((w) => (w.id === id ? { ...w, name } : w)),
  }));
},
```

In `PropertyPanel.tsx`, add name editor at the top (after "Type: {widget.type}"):
```tsx
<div className="mb-3">
  <label className="text-xs text-gray-400">Name
    <input type="text" className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5 font-mono"
      value={widget.name}
      onChange={(e) => renameWidget(widget.id, e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
    />
  </label>
</div>
```
Add `renameWidget` to store destructuring.

In `ObjectTree.tsx`, show name instead of text when available:
Change the display text from `String(widget.props.text ?? widget.type)` to `widget.name || String(widget.props.text ?? widget.type)`.

Update `loadProject` in the store to reset `widgetCounter` based on loaded widgets (parse names like `button_3` to restore counter).

Update backend `project.py` model to include `name: str` field.

Update `Toolbar.tsx` API payload to include `name` field.

Verify: `cd frontend && npx tsc --noEmit`

**Commit:** `feat: add user-defined widget naming`

---

### Task 2: Frame parent-child coordinate sync

**Files:**
- Modify: `frontend/src/store/designerStore.ts`
- Modify: `frontend/src/components/Canvas.tsx`
- Modify: `frontend/src/App.tsx`

**Problem:** Currently child widgets have coordinates relative to the canvas, not to their parent Frame. Moving a Frame doesn't move its children.

**Solution:** Children store coordinates relative to parent. When rendering, compute absolute position by walking up the parent chain. When moving a Frame, also move all children by the same delta.

In `designerStore.ts`, update `moveWidget`:

```typescript
moveWidget: (id, x, y) => {
  set((s) => {
    const widget = s.widgets.find(w => w.id === id);
    if (!widget) return s;
    const dx = x - widget.x;
    const dy = y - widget.y;

    // Collect this widget + all descendants
    const collect = (parentId: string): string[] => {
      const ids = [parentId];
      s.widgets.filter(w => w.parentId === parentId).forEach(w => {
        ids.push(...collect(w.id));
      });
      return ids;
    };
    const affectedIds = widget.parentId ? [id] : collect(id);

    return {
      widgets: s.widgets.map(w => {
        if (w.id === id) return { ...w, x, y };
        // If moving a root widget, also move its children by same delta
        if (affectedIds.includes(w.id)) return { ...w, x: w.x + dx, y: w.y + dy };
        return w;
      }),
    };
  });
},
```

In `Canvas.tsx`, compute absolute positions for rendering. Children's x/y are relative to parent, so add parent's absolute position:

```typescript
function getAbsolutePosition(widget: WidgetInstance, allWidgets: WidgetInstance[]): { x: number; y: number } {
  if (!widget.parentId) return { x: widget.x, y: widget.y };
  const parent = allWidgets.find(w => w.id === widget.parentId);
  if (!parent) return { x: widget.x, y: widget.y };
  const parentAbs = getAbsolutePosition(parent, allWidgets);
  return { x: parentAbs.x + widget.x, y: parentAbs.y + widget.y };
}
```

Use `getAbsolutePosition` in WidgetRenderer's style for `left` and `top`.

For `@dnd-kit` drop handling in `App.tsx`, when dropping on a Frame, convert the drop coordinates to Frame-relative:

```typescript
// In handleDragEnd, when dropping onto a Frame:
if (overId && overId !== "canvas") {
  const frameWidget = widgets.find(w => w.id === overId.replace("frame-", ""));
  if (frameWidget) {
    const frameAbs = getAbsolutePosition(frameWidget, widgets);
    const relX = dropX - frameAbs.x;
    const relY = dropY - frameAbs.y;
    addWidget(data.widgetType, relX, relY, frameWidget.id);
    return;
  }
}
```

Make Frame widgets droppable by adding `useDroppable({ id: \`frame-${widget.id}\` })` inside WidgetRenderer for Frame/LabelFrame/Notebook types.

Verify: Create a Frame, drop a Button inside it, move the Frame → Button should follow.

**Commit:** `feat: sync Frame children positions with parent movement`

---

## Phase 2: Visual Property Application

### Task 3: Apply widget properties to canvas rendering

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

**Goal:** When user changes bg, fg, relief, bd, font, state in PropertyPanel, the canvas widget should visually reflect those changes.

Replace the static `WIDGET_STYLES` with a dynamic style computation function:

```typescript
function getWidgetStyle(widget: WidgetInstance): React.CSSProperties {
  const props = widget.props;
  const style: React.CSSProperties = {};

  // Background
  if (props.bg && typeof props.bg === "string") {
    style.backgroundColor = props.bg;
  }

  // Foreground (text color)
  if (props.fg && typeof props.fg === "string") {
    style.color = props.fg;
  }

  // Border width
  const bd = typeof props.bd === "number" ? props.bd : (widget.type === "Frame" || widget.type === "LabelFrame" ? 2 : 1);
  style.borderWidth = `${bd}px`;

  // Relief → CSS interpretation
  const relief = typeof props.relief === "string" ? props.relief : "flat";
  switch (relief) {
    case "raised":
      style.boxShadow = `1px 1px 0px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)`;
      break;
    case "sunken":
      style.boxShadow = `inset 1px 1px 0px rgba(0,0,0,0.3), 1px 1px 0px rgba(255,255,255,0.5)`;
      break;
    case "groove":
      style.boxShadow = `inset 1px 1px 0px rgba(0,0,0,0.2), inset -1px -1px 0px rgba(0,0,0,0.2), 1px 1px 0px rgba(255,255,255,0.3), -1px -1px 0px rgba(255,255,255,0.3)`;
      break;
    case "ridge":
      style.boxShadow = `inset 1px 1px 0px rgba(255,255,255,0.3), inset -1px -1px 0px rgba(0,0,0,0.2), 1px 1px 0px rgba(0,0,0,0.2)`;
      break;
    case "flat":
    default:
      style.boxShadow = "none";
      break;
  }

  // Font
  if (props.font) {
    const fontStr = String(props.font);
    // Parse Tkinter font tuple: ("Family", size, "style")
    const match = fontStr.match(/\(?["']?(\w+)["']?\s*,?\s*(\d+)?/);
    if (match) {
      style.fontFamily = match[1];
      if (match[2]) style.fontSize = `${match[2]}px`;
    }
  }

  // State
  if (props.state === "disabled") {
    style.opacity = 0.5;
  }

  return style;
}
```

Merge `getWidgetStyle(widget)` into the WidgetRenderer's outer div `style` prop alongside `left`, `top`, `width`, `height`.

Also apply `style.color` to text spans inside `renderWidgetContent`.

Remove the static `WIDGET_STYLES` constant. Use a minimal fallback: `border-gray-300 rounded` as default class, but override background/border via inline styles from `getWidgetStyle`.

**Commit:** `feat: apply widget properties (bg, fg, relief, bd, font, state) to canvas rendering`

---

## Phase 3: Font Picker

### Task 4: Font picker modal

**Files:**
- Create: `frontend/src/components/FontPicker.tsx`
- Modify: `frontend/src/utils/widgetDefaults.ts`
- Modify: `frontend/src/components/PropertyPanel.tsx`

Create a modal component for selecting Tkinter fonts:

```tsx
import { useState, useMemo } from "react";

const TKINTER_FONTS = [
  "Helvetica", "Times", "Courier", "Arial", "Verdana", "TkDefaultFont",
  "TkTextFont", "TkFixedFont", "TkMenuFont", "TkHeadingFont",
  "TkCaptionFont", "TkSmallCaptionFont", "TkIconFont", "TkTooltipFont",
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

interface FontPickerProps {
  value: string;  // Tkinter font tuple string e.g. '("Helvetica", 12, "bold")'
  onChange: (value: string) => void;
  onClose: () => void;
}

function parseTkFont(s: string): { family: string; size: number; bold: boolean; italic: boolean } {
  const defaults = { family: "Helvetica", size: 12, bold: false, italic: false };
  try {
    const cleaned = s.replace(/[()"]/g, "");
    const parts = cleaned.split(",").map(p => p.trim());
    return {
      family: parts[0] || defaults.family,
      size: parseInt(parts[1]) || defaults.size,
      bold: parts.some(p => p.toLowerCase() === "bold"),
      italic: parts.some(p => p.toLowerCase() === "italic"),
    };
  } catch {
    return defaults;
  }
}

function toTkFont(f: { family: string; size: number; bold: boolean; italic: boolean }): string {
  const styles: string[] = [];
  if (f.bold) styles.push("bold");
  if (f.italic) styles.push("italic");
  const styleStr = styles.length > 0 ? `, "${styles.join(" ")}"` : "";
  return `("${f.family}", ${f.size}${styleStr})`;
}

export function FontPicker({ value, onChange, onClose }: FontPickerProps) {
  const parsed = useMemo(() => parseTkFont(value), [value]);
  const [family, setFamily] = useState(parsed.family);
  const [size, setSize] = useState(parsed.size);
  const [bold, setBold] = useState(parsed.bold);
  const [italic, setItalic] = useState(parsed.italic);

  const result = toTkFont({ family, size, bold, italic });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-4 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-3">Font Picker</h3>

        <div className="flex flex-col gap-3">
          {/* Family */}
          <label className="text-xs text-gray-400">
            Font Family
            <select className="block w-full bg-gray-700 rounded px-2 py-1 text-white mt-0.5"
              value={family} onChange={(e) => setFamily(e.target.value)}>
              {TKINTER_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>

          {/* Size */}
          <label className="text-xs text-gray-400">
            Size
            <select className="block w-full bg-gray-700 rounded px-2 py-1 text-white mt-0.5"
              value={size} onChange={(e) => setSize(parseInt(e.target.value))}>
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </label>

          {/* Style toggles */}
          <div className="flex gap-2">
            <button onClick={() => setBold(!bold)} className={`px-3 py-1 rounded text-sm font-bold ${bold ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400"}`}>B</button>
            <button onClick={() => setItalic(!italic)} className={`px-3 py-1 rounded text-sm italic ${italic ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400"}`}>I</button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded p-2 mt-1">
            <span className="text-gray-800" style={{ fontFamily: family, fontSize: `${size}px`, fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal" }}>
              AaBbCc 123
            </span>
          </div>

          {/* Result */}
          <code className="text-xs text-green-400 bg-gray-900 rounded p-1.5">{result}</code>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-300">Cancel</button>
          <button onClick={() => { onChange(result); onClose(); }} className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white">Apply</button>
        </div>
      </div>
    </div>
  );
}
```

In `PropertyPanel.tsx`, for any property with `key === "font"`, render a button that opens the FontPicker modal instead of a text input:

```tsx
// In the property editor rendering, add a special case:
if (prop.key === "font") {
  return (
    <label key={prop.key} className="text-xs text-gray-400">
      {prop.label}
      <div className="flex gap-1 mt-0.5">
        <input
          type="text"
          className="block flex-1 bg-gray-700 rounded px-1 py-0.5 text-white font-mono text-xs"
          value={String(widget.props[prop.key] ?? "")}
          onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)}
        />
        <button
          onClick={() => setFontPickerOpen(true)}
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded text-xs"
        >Pick</button>
      </div>
    </label>
  );
}
```

Add state: `const [fontPickerOpen, setFontPickerOpen] = useState(false)` and render `<FontPicker>` conditionally at the bottom of the PropertyPanel return.

**Commit:** `feat: add font picker modal with family, size, bold/italic selection`

---

## Phase 4: Notebook Widget

### Task 5: Notebook (tabs) widget

**Files:**
- Modify: `frontend/src/types/widgets.ts` — add `"Notebook"`
- Modify: `frontend/src/utils/widgetDefaults.ts` — add Notebook spec with tab management
- Modify: `frontend/src/components/Canvas.tsx` — render Notebook with tabs, tab switching
- Modify: `frontend/src/components/PropertyPanel.tsx` — tab add/remove/rename UI
- Modify: `frontend/src/store/designerStore.ts` — tab management actions

**Data model approach:** Notebook uses its children as tab pages. Each child (Frame) represents one tab. The tab title comes from the child Frame's `props.text` or `name`.

Add to WidgetType: `"Notebook"`

Add Notebook spec:
```typescript
Notebook: {
  defaultWidth: 400,
  defaultHeight: 300,
  defaultProps: { activeTab: 0 },
  editableProps: [],
},
```

Add store actions:
```typescript
addTab: (notebookId: string) => {
  const tab = createWidget("Frame", 0, 0, notebookId);
  tab.props.text = `Tab ${(get().widgets.filter(w => w.parentId === notebookId).length + 1)}`;
  tab.width = 0; tab.height = 0; // fills parent
  set((s) => ({ widgets: [...s.widgets, tab] }));
},
removeTab: (notebookId: string, tabId: string) => {
  get().removeWidget(tabId);
},
setActiveTab: (notebookId: string, index: number) => {
  set((s) => ({
    widgets: s.widgets.map(w => w.id === notebookId ? { ...w, props: { ...w.props, activeTab: index } } : w),
  }));
},
```

In Canvas rendering, Notebook shows tab headers at top + renders only the active tab's children. Tab headers are clickable to switch active tab.

For codegen, generate `ttk.Notebook` with `ttk.Frame` tabs:

```python
notebook_abc12345 = ttk.Notebook(root)
notebook_abc12345.place(...)

tab_1 = ttk.Frame(notebook_abc12345)
notebook_abc12345.add(tab_1, text="Tab 1")
# render tab_1 children...
```

**Commit:** `feat: add Notebook (tabs) widget with tab management`

---

## Phase 5: Keyboard & Interaction

### Task 6: Arrow key movement

**Files:**
- Modify: `frontend/src/App.tsx`

Add arrow key handling to the existing keydown listener:

```typescript
if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && store.selectedId) {
  e.preventDefault();
  const step = e.shiftKey ? store.gridSize : 1;
  const widget = store.widgets.find(w => w.id === store.selectedId);
  if (!widget) return;
  let { x, y } = widget;
  if (e.key === "ArrowUp") y -= step;
  if (e.key === "ArrowDown") y += step;
  if (e.key === "ArrowLeft") x -= step;
  if (e.key === "ArrowRight") x += step;
  store.snapshot();
  store.moveWidget(store.selectedId, x, y);
}
```

**Commit:** `feat: add arrow key movement for selected widget`

---

### Task 7: Right-click context menu

**Files:**
- Create: `frontend/src/components/ContextMenu.tsx`
- Modify: `frontend/src/components/Canvas.tsx`

Create a context menu component:

```tsx
import { useDesignerStore } from "../store/designerStore";

interface ContextMenuProps {
  x: number;
  y: number;
  widgetId: string | null;
  onClose: () => void;
}

export function ContextMenu({ x, y, widgetId, onClose }: ContextMenuProps) {
  const { snapshot, removeWidget, duplicateWidget, bringToFront, sendToBack, selectWidget } = useDesignerStore();

  if (!widgetId) return null;

  const items = [
    { label: "Duplicate", action: () => { snapshot(); duplicateWidget(widgetId); }, shortcut: "Ctrl+D" },
    { label: "Delete", action: () => { snapshot(); removeWidget(widgetId); }, shortcut: "Del" },
    { label: "───", action: () => {} },
    { label: "Bring to Front", action: () => bringToFront(widgetId) },
    { label: "Send to Back", action: () => sendToBack(widgetId) },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed bg-gray-800 border border-gray-600 rounded shadow-xl py-1 z-50 min-w-40"
        style={{ left: x, top: y }}
      >
        {items.map((item, i) =>
          item.label === "───" ? (
            <div key={i} className="border-t border-gray-600 my-1" />
          ) : (
            <button
              key={i}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 flex justify-between"
              onClick={() => { item.action(); onClose(); }}
            >
              <span>{item.label}</span>
              {item.shortcut && <span className="text-gray-500 ml-4">{item.shortcut}</span>}
            </button>
          )
        )}
      </div>
    </>
  );
}
```

In `Canvas.tsx`, add `onContextMenu` handler on the canvas div and on each WidgetRenderer. Store context menu position and target widget ID in state. Render `<ContextMenu>` when active.

**Commit:** `feat: add right-click context menu for widgets`

---

### Task 8: Widget locking

**Files:**
- Modify: `frontend/src/types/widgets.ts` — add `locked: boolean`
- Modify: `frontend/src/utils/widgetDefaults.ts` — add `locked: false` to createWidget
- Modify: `frontend/src/store/designerStore.ts` — add `toggleLock(id)` action
- Modify: `frontend/src/components/Canvas.tsx` — prevent move/resize of locked widgets, show lock icon
- Modify: `frontend/src/components/PropertyPanel.tsx` — lock/unlock toggle button
- Modify: `frontend/src/components/ObjectTree.tsx` — show lock icon on locked widgets

In Canvas, if `widget.locked`, skip `onMouseDown` drag handler and don't show resize handles. Show a small lock icon overlay.

In PropertyPanel, add a lock toggle button next to the Delete button:
```tsx
<button onClick={() => toggleLock(widget.id)} className={`text-xs px-2 py-0.5 rounded ${widget.locked ? "bg-amber-700 text-amber-200" : "bg-gray-700 text-gray-400"}`}>
  {widget.locked ? "🔒 Locked" : "🔓 Lock"}
</button>
```

**Commit:** `feat: add widget locking to prevent accidental edits`

---

## Phase 6: Multi-Select

### Task 9: Multi-select with Ctrl+click

**Files:**
- Modify: `frontend/src/types/widgets.ts` — no change needed
- Modify: `frontend/src/store/designerStore.ts` — change `selectedId` to `selectedIds: string[]`
- Modify: `frontend/src/components/Canvas.tsx` — render selection ring on all selected widgets
- Modify: `frontend/src/components/PropertyPanel.tsx` — show common properties when multi-selected

**Store changes:**
```typescript
// Replace selectedId: string | null with:
selectedIds: string[],

selectWidget: (id: string | null, multi = false) => {
  if (id === null) { set({ selectedIds: [] }); return; }
  set((s) => {
    if (multi) {
      const has = s.selectedIds.includes(id);
      return { selectedIds: has ? s.selectedIds.filter(i => i !== id) : [...s.selectedIds, id] };
    }
    return { selectedIds: [id] };
  });
},

// update all actions that reference selectedId to use selectedIds[0] or selectedIds
```

In Canvas, pass `multi: e.ctrlKey || e.metaKey` to `onSelect()`.

In PropertyPanel, when `selectedIds.length > 1`, show "N widgets selected" and only show properties that are shared across all selected widgets. Changes apply to all.

**Commit:** `feat: add multi-select with Ctrl+click and batch property editing`

---

### Task 10: Marquee selection (drag to select)

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

Add rubber-band selection: click empty canvas → drag → draws a selection rectangle → all widgets within the rectangle are selected.

Add state for selection rectangle:
```tsx
const [selRect, setSelRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
```

On canvas `onMouseDown` (when clicking empty area), start selection rectangle. On `mousemove`, update rectangle. On `mouseup`, compute which widgets are within the rectangle and `selectWidget` them.

Render the selection rectangle as an absolutely positioned div with dashed border.

**Commit:** `feat: add marquee selection by dragging on empty canvas`

---

## Phase 7: Canvas Features

### Task 11: Smart alignment guides

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

When dragging a widget, check alignment with other widgets and show guide lines.

```typescript
const ALIGN_THRESHOLD = 4;

function computeGuides(
  dragging: WidgetInstance,
  allWidgets: WidgetInstance[],
  absPos: { x: number; y: number },
): { vertical: number[]; horizontal: number[] } {
  const vertical: number[] = [];
  const horizontal: number[] = [];

  for (const w of allWidgets) {
    if (w.id === dragging.id) continue;
    const wAbs = getAbsolutePosition(w, allWidgets); // or use stored abs positions

    // Check vertical alignment (x, x+w, x+w/2)
    for (const refX of [wAbs.x, wAbs.x + w.width, wAbs.x + w.width / 2]) {
      for (const dragX of [absPos.x, absPos.x + dragging.width, absPos.x + dragging.width / 2]) {
        if (Math.abs(refX - dragX) < ALIGN_THRESHOLD) {
          vertical.push(refX);
        }
      }
    }

    // Check horizontal alignment (y, y+h, y+h/2)
    for (const refY of [wAbs.y, wAbs.y + w.height, wAbs.y + w.height / 2]) {
      for (const dragY of [absPos.y, absPos.y + dragging.height, absPos.y + dragging.height / 2]) {
        if (Math.abs(refY - dragY) < ALIGN_THRESHOLD) {
          horizontal.push(refY);
        }
      }
    }
  }

  return { vertical: [...new Set(vertical)], horizontal: [...new Set(horizontal)] };
}
```

Render guide lines as thin colored divs (1px, red/blue) positioned absolutely on the canvas.

Also snap to the guide position when a guide is active.

**Commit:** `feat: add smart alignment guides during widget drag`

---

### Task 12: Canvas zoom

**Files:**
- Modify: `frontend/src/store/designerStore.ts` — add `zoom: number`, `setZoom(n)`
- Modify: `frontend/src/components/Canvas.tsx` — apply CSS transform scale
- Modify: `frontend/src/App.tsx` — Ctrl+scroll handler for zoom

Store:
```typescript
zoom: 1,
setZoom: (z: number) => set({ zoom: Math.max(0.25, Math.min(3, z)) }),
```

App.tsx — add wheel handler:
```typescript
// In the useEffect keydown listener or a separate useEffect:
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
```

Canvas.tsx — wrap canvas content in a zoom container:
```tsx
<div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: canvasWidth, height: canvasHeight }}>
  {/* grid + widgets */}
</div>
```

Show zoom level in StatusBar: `Zoom: {(zoom * 100).toFixed(0)}%`

**Commit:** `feat: add canvas zoom with Ctrl+scroll`

---

### Task 13: Canvas rulers

**Files:**
- Create: `frontend/src/components/Ruler.tsx`
- Modify: `frontend/src/components/Canvas.tsx`

Create ruler components for horizontal (top) and vertical (left) edges:

```tsx
interface RulerProps {
  length: number;
  direction: "horizontal" | "vertical";
  zoom: number;
  offset: number;
}

export function Ruler({ length, direction, zoom, offset }: RulerProps) {
  const isH = direction === "horizontal";
  const tickInterval = 50;
  const ticks = [];
  for (let i = 0; i <= length; i += tickInterval) {
    ticks.push(i);
  }

  return (
    <div
      className="bg-gray-750 shrink-0 relative overflow-hidden"
      style={{
        [isH ? "width" : "height"]: `${length * zoom}px`,
        [isH ? "height" : "width"]: "20px",
      }}
    >
      {ticks.map(t => (
        <div
          key={t}
          className="absolute text-gray-500"
          style={{
            [isH ? "left" : "top"]: `${t * zoom}px`,
            [isH ? "top" : "left"]: 0,
            [isH ? "width" : "height"]: "1px",
            [isH ? "height" : "width"]: t % 100 === 0 ? "12px" : "6px",
            backgroundColor: "currentColor",
          }}
        >
          {t % 100 === 0 && (
            <span className="text-[8px] absolute" style={{ [isH ? "top" : "left"]: "12px", [isH ? "left" : "top"]: 0 }}>
              {t}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

Integrate rulers around the canvas in the Canvas component layout.

**Commit:** `feat: add canvas rulers with tick marks`

---

## Phase 8: Extras

### Task 14: Tkinter theme selection for preview

**Files:**
- Modify: `frontend/src/store/designerStore.ts` — add `tkTheme: string`, `setTkTheme(s)`
- Modify: `frontend/src/components/Toolbar.tsx` — theme dropdown
- Modify: `frontend/src/components/PropertyPanel.tsx` — show theme selector when no widget selected
- Modify: `backend/app/models/project.py` — add `tk_theme` field
- Modify: `backend/app/codegen/tkinter_gen.py` — add theme setup code
- Modify: `frontend/src/components/CodePreview.tsx` — include theme in generated code

Store:
```typescript
tkTheme: "default",
setTkTheme: (theme) => set({ tkTheme: theme }),
```

Theme options: `"default"`, `"clam"`, `"alt"`, `"classic"`

In codegen, add after `root = tk.Tk()`:
```python
style = ttk.Style()
style.theme_use("clam")
```

In Toolbar or PropertyPanel (when nothing selected), add a theme dropdown.

**Commit:** `feat: add Tkinter theme selection for preview and export`

---

### Task 15: Template library

**Files:**
- Create: `frontend/src/templates/index.ts` — template definitions
- Modify: `frontend/src/components/Toolbar.tsx` — template dropdown
- Modify: `frontend/src/store/designerStore.ts` — `loadTemplate(name)` action

Define templates as functions returning WidgetInstance arrays:

```typescript
import type { WidgetInstance } from "../types/widgets";
import { v4 as uuid } from "uuid";

function makeWidget(type: string, name: string, x: number, y: number, w: number, h: number, props: Record<string, unknown>, parentId: string | null = null): WidgetInstance {
  return { id: uuid(), type: type as any, name, parentId, x, y, width: w, height: h, props };
}

export const TEMPLATES: Record<string, { label: string; create: () => WidgetInstance[] }> = {
  login_form: {
    label: "Login Form",
    create: () => {
      const frame = makeWidget("Frame", "login_frame", 100, 50, 300, 250, { bg: "#f0f0f0", relief: "groove", bd: 2 });
      return [
        frame,
        makeWidget("Label", "title", 80, 20, 140, 30, { text: "Sign In", font: '("Helvetica", 16, "bold")' }, frame.id),
        makeWidget("Label", "user_label", 20, 60, 80, 25, { text: "Username:" }, frame.id),
        makeWidget("Entry", "user_entry", 110, 60, 160, 25, {}, frame.id),
        makeWidget("Label", "pass_label", 20, 100, 80, 25, { text: "Password:" }, frame.id),
        makeWidget("Entry", "pass_entry", 110, 100, 160, 25, { show: "*" }, frame.id),
        makeWidget("Button", "login_btn", 80, 150, 140, 35, { text: "Login", bg: "#4CAF50", fg: "white" }, frame.id),
      ];
    },
  },
  settings_panel: {
    label: "Settings Panel",
    create: () => {
      const frame = makeWidget("LabelFrame", "settings", 50, 30, 500, 400, { text: "Settings", bd: 2 });
      return [
        frame,
        makeWidget("Label", "theme_label", 20, 20, 100, 25, { text: "Theme:" }, frame.id),
        makeWidget("OptionMenu", "theme_select", 130, 20, 200, 25, { values: "Light,Dark,System" }, frame.id),
        makeWidget("Checkbutton", "notif_check", 20, 60, 200, 25, { text: "Enable notifications" }, frame.id),
        makeWidget("Checkbutton", "auto_check", 20, 90, 200, 25, { text: "Auto-save" }, frame.id),
        makeWidget("Label", "font_label", 20, 130, 100, 25, { text: "Font size:" }, frame.id),
        makeWidget("Spinbox", "font_spin", 130, 130, 80, 25, { from_: 8, to: 36, increment: 1 }, frame.id),
        makeWidget("Scale", "volume", 20, 180, 300, 30, { from_: 0, to: 100, orient: "horizontal" }, frame.id),
        makeWidget("Button", "save_btn", 150, 300, 100, 30, { text: "Save", bg: "#2196F3", fg: "white" }, frame.id),
        makeWidget("Button", "cancel_btn", 260, 300, 100, 30, { text: "Cancel" }, frame.id),
      ];
    },
  },
  simple_list: {
    label: "List + Detail",
    create: () => {
      return [
        makeWidget("Label", "header", 20, 10, 300, 30, { text: "Items", font: '("Helvetica", 14, "bold")' }),
        makeWidget("Listbox", "item_list", 20, 50, 200, 300, {}),
        makeWidget("LabelFrame", "detail", 240, 50, 300, 300, { text: "Details", bd: 1 }),
      ];
    },
  },
};
```

Store action:
```typescript
loadTemplate: (templateKey: string) => {
  const template = TEMPLATES[templateKey];
  if (!template) return;
  const widgets = template.create();
  set({ widgets, selectedIds: [] });
},
```

In Toolbar, add a "Templates" dropdown button that lists available templates.

**Commit:** `feat: add template library with login form, settings panel, list+detail`

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Model | 1-2 | Widget naming, Frame parent-child sync |
| 2. Visuals | 3 | Live property application on canvas |
| 3. Font | 4 | Font picker modal |
| 4. Notebook | 5 | Tab widget |
| 5. Keyboard | 6-8 | Arrow keys, context menu, locking |
| 6. Selection | 9-10 | Multi-select, marquee selection |
| 7. Canvas | 11-13 | Alignment guides, zoom, rulers |
| 8. Extras | 14-15 | Theme selection, templates |

Total: 15 tasks.
