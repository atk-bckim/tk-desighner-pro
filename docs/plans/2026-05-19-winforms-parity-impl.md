# WinForms Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring Tkinter Designer to WinForms designer parity with 10 features: size/spacing tools, smart naming, dialog templates, tab order editor, variable management, grid layout, component tray, image support, and code editor upgrade.

**Architecture:** Extend existing Zustand store with new state fields and actions. Add new components alongside existing ones. Backend codegen extended to handle grid() layout, variables, non-visual components, and images. All changes are incremental — each task produces a working, committable state.

**Tech Stack:** React 19, TypeScript, Zustand 5, Tailwind CSS 4, FastAPI, Pydantic 2, CodeMirror 6 (Phase 4 only)

---

## Phase 1: Quick Wins (No Model Changes)

### Task 1: Size Auto-Adjustment

**Files:**
- Modify: `frontend/src/store/designerStore.ts`
- Modify: `frontend/src/components/PropertyPanel.tsx`

**Step 1: Add makeSameSize to store**

In `designerStore.ts`, add to `DesignerState` interface:
```typescript
makeSameSize: (ids: string[], dimension: "width" | "height" | "both") => void;
```

Add implementation after `alignWidgets`:
```typescript
makeSameSize: (ids, dimension) => {
  set((s) => {
    const targets = s.widgets.filter(w => ids.includes(w.id));
    if (targets.length < 2) return s;
    const ref = targets[0];
    const updated = s.widgets.map(w => {
      if (!ids.includes(w.id)) return w;
      return {
        ...w,
        width: (dimension === "width" || dimension === "both") ? ref.width : w.width,
        height: (dimension === "height" || dimension === "both") ? ref.height : w.height,
      };
    });
    return { widgets: updated };
  });
},
```

**Step 2: Add Size section to PropertyPanel multi-select panel**

In `PropertyPanel.tsx`, after the Distribute section, add:
```tsx
<div className={sectionCls}>
  <div className={sectionTitleCls}>Size</div>
  <div className="grid grid-cols-2 gap-1">
    <button onClick={() => makeSameSize(selectedIds, "width")} disabled={selectedIds.length < 2} className={`${btnCls} disabled:opacity-20`}>Same W</button>
    <button onClick={() => makeSameSize(selectedIds, "height")} disabled={selectedIds.length < 2} className={`${btnCls} disabled:opacity-20`}>Same H</button>
    <button onClick={() => makeSameSize(selectedIds, "both")} disabled={selectedIds.length < 2} className={`${btnCls} disabled:opacity-20 col-span-2`}>Same Both</button>
  </div>
</div>
```

Destructure `makeSameSize` from the store in the multi-select panel section.

**Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/src/store/designerStore.ts frontend/src/components/PropertyPanel.tsx
git commit -m "feat: add make same size for multi-select widgets"
```

---

### Task 2: Smart Naming Prefixes

**Files:**
- Modify: `frontend/src/utils/widgetDefaults.ts`

**Step 1: Update naming prefixes and createWidget**

Replace the counter-based naming in `createWidget()`:

```typescript
const NAME_PREFIXES: Record<WidgetType, string> = {
  Button: "btn", Label: "lbl", Entry: "entry", Text: "txt",
  Checkbutton: "chk", Radiobutton: "rdo", Listbox: "lst", Scale: "scl",
  Frame: "frm", LabelFrame: "grp", OptionMenu: "opt", Spinbox: "spn",
  Scrollbar: "sb", Separator: "sep", Notebook: "nbk", Toplevel: "win",
  Progressbar: "pbar", Combobox: "cbo", Treeview: "tree", Sizegrip: "grip",
  Menubutton: "mbtn", Message: "msg",
};
```

Update `createWidget` to use prefix:
```typescript
export function createWidget(type: WidgetType, x: number, y: number, parentId: string | null = null): WidgetInstance {
  const spec = SPECS[type];
  const prefix = NAME_PREFIXES[type];
  if (!widgetCounters[type]) widgetCounters[type] = 0;
  widgetCounters[type]++;
  const name = `${prefix}_${widgetCounters[type]}`;
  // ... rest unchanged
}
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/src/utils/widgetDefaults.ts
git commit -m "feat: use smart naming prefixes (btn_1, lbl_1, entry_1, etc.)"
```

---

### Task 3: Dialog Templates

**Files:**
- Modify: `frontend/src/templates/index.ts`

**Step 1: Add dialog templates**

Add these entries to the `TEMPLATES` object:

```typescript
dialog_ok_cancel: {
  label: "Dialog OK/Cancel",
  icon: "\u2714",
  create: () => {
    const frame = w("LabelFrame", "dlg_frame", 50, 30, 400, 180, { text: "Confirm", bd: 2 });
    return [
      frame,
      w("Label", "dlg_message", 20, 20, 350, 60, { text: "Are you sure you want to proceed?", wraplength: 340 }, frame.id),
      w("Button", "dlg_ok", 100, 110, 80, 30, { text: "OK", bg: "#4CAF50", fg: "white" }, frame.id),
      w("Button", "dlg_cancel", 200, 110, 80, 30, { text: "Cancel" }, frame.id),
    ];
  },
},
dialog_yes_no: {
  label: "Dialog Yes/No",
  icon: "\u2753",
  create: () => {
    const frame = w("LabelFrame", "dlg_frame", 50, 30, 400, 180, { text: "Question", bd: 2 });
    return [
      frame,
      w("Label", "dlg_message", 20, 20, 350, 60, { text: "Do you want to save changes?", wraplength: 340 }, frame.id),
      w("Button", "dlg_yes", 100, 110, 80, 30, { text: "Yes", bg: "#2196F3", fg: "white" }, frame.id),
      w("Button", "dlg_no", 200, 110, 80, 30, { text: "No", bg: "#f44336", fg: "white" }, frame.id),
    ];
  },
},
dialog_input: {
  label: "Dialog Input",
  icon: "\u270F",
  create: () => {
    const frame = w("LabelFrame", "dlg_frame", 50, 30, 400, 200, { text: "Input", bd: 2 });
    return [
      frame,
      w("Label", "dlg_prompt", 20, 20, 350, 25, { text: "Enter value:" }, frame.id),
      w("Entry", "dlg_entry", 20, 50, 340, 25, {}, frame.id),
      w("Button", "dlg_ok", 100, 130, 80, 30, { text: "OK", bg: "#4CAF50", fg: "white" }, frame.id),
      w("Button", "dlg_cancel", 200, 130, 80, 30, { text: "Cancel" }, frame.id),
    ];
  },
},
dialog_about: {
  label: "About Dialog",
  icon: "\u2139",
  create: () => {
    const win = w("Toplevel", "about_win", 100, 60, 350, 200, { title: "About", bg: "#f0f0f0" });
    return [
      win,
      w("Label", "about_title", 20, 15, 300, 30, { text: "My Application", font: '("Helvetica", 14, "bold")' }, win.id),
      w("Label", "about_version", 20, 50, 300, 25, { text: "Version 1.0.0" }, win.id),
      w("Separator", "about_sep", 20, 85, 300, 4, { orient: "horizontal" }, win.id),
      w("Label", "about_info", 20, 95, 300, 40, { text: "Built with Tkinter Designer", wraplength: 280 }, win.id),
      w("Button", "about_ok", 130, 145, 80, 30, { text: "OK", bg: "#2196F3", fg: "white" }, win.id),
    ];
  },
},
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/src/templates/index.ts
git commit -m "feat: add dialog templates (OK/Cancel, Yes/No, Input, About)"
```

---

## Phase 2: Model Extensions

### Task 4: Tab Order Editor — Store & Types

**Files:**
- Modify: `frontend/src/store/designerStore.ts`
- Modify: `frontend/src/utils/widgetDefaults.ts`

**Step 1: Define interactive widget types**

In `widgetDefaults.ts`, add:
```typescript
export const INTERACTIVE_TYPES: Set<WidgetType> = new Set([
  "Button", "Entry", "Text", "Checkbutton", "Radiobutton",
  "Listbox", "Combobox", "Spinbox", "OptionMenu", "Scale",
  "Treeview", "Menubutton",
]);
```

**Step 2: Add tab order state to store**

Add to `DesignerState`:
```typescript
tabOrderMode: boolean;
toggleTabOrderMode: () => void;
setTabIndex: (widgetId: string, index: number) => void;
```

Add implementation:
```typescript
tabOrderMode: false,
toggleTabOrderMode: () => set((s) => ({ tabOrderMode: !s.tabOrderMode })),
setTabIndex: (widgetId, index) => {
  set((s) => ({
    widgets: s.widgets.map(w =>
      w.id === widgetId ? { ...w, props: { ...w.props, tabIndex: index } } : w
    ),
  }));
},
```

**Step 3: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/store/designerStore.ts frontend/src/utils/widgetDefaults.ts
git commit -m "feat: add tab order mode state and interactive widget types"
```

---

### Task 5: Tab Order Editor — Canvas & Toolbar

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`
- Modify: `frontend/src/components/Toolbar.tsx`

**Step 1: Add Tab Order button to Toolbar**

In `Toolbar.tsx`, add after the Templates button:
```tsx
<button
  onClick={toggleTabOrderMode}
  className={`${btnGhost} ${tabOrderMode ? "!text-[#f59e0b] !bg-[#f59e0b]/10" : ""}`}
  title="Tab Order"
>
  Tab Order
</button>
```

Destructure `tabOrderMode` and `toggleTabOrderMode` from store.

**Step 2: Render tab index badges in Canvas**

In `Canvas.tsx`, import `INTERACTIVE_TYPES`. Add after the event indicator in `WidgetRenderer`:
```tsx
{tabOrderMode && INTERACTIVE_TYPES.has(widget.type as WidgetType) && (
  <div
    className="absolute -top-3 -left-3 w-5 h-5 bg-[#f59e0b] text-white text-[9px] font-bold rounded-full flex items-center justify-center z-50 cursor-pointer shadow"
    onClick={(e) => {
      e.stopPropagation();
      const idx = useDesignerStore.getState().widgets
        .filter(w => INTERACTIVE_TYPES.has(w.type as WidgetType))
        .sort((a, b) => (a.props.tabIndex as number ?? 999) - (b.props.tabIndex as number ?? 999))
        .findIndex(w => w.id === widget.id);
      setTabIndex(widget.id, idx >= 0 ? idx + 1 : 1);
    }}
  >
    {String(widget.props.tabIndex ?? "")}
  </div>
)}
```

Pass `tabOrderMode` and `setTabIndex` through props.

When tab order mode is active, clicking a widget assigns it the next index in sequence. Escape key exits the mode.

**Step 3: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/Canvas.tsx frontend/src/components/Toolbar.tsx
git commit -m "feat: add tab order editor with numbered badges on canvas"
```

---

### Task 6: Tab Order — Codegen

**Files:**
- Modify: `backend/app/codegen/tkinter_gen.py`

**Step 1: Generate focus order in codegen**

After widget rendering loop, before event bindings, add:
```python
    # Generate tab order (focus chain)
    interactive = [w for w in project.widgets if w.type in {
        "Button", "Entry", "Text", "Checkbutton", "Radiobutton",
        "Listbox", "Combobox", "Spinbox", "OptionMenu", "Scale",
        "Treeview", "Menubutton",
    }]
    if interactive:
        sorted_widgets = sorted(
            interactive,
            key=lambda w: int(w.props.get("tabIndex", 999)) if isinstance(w.props.get("tabIndex"), (int, float)) else 999,
        )
        focus_order = [name_map.get(w.id, f"{w.type.lower()}_{w.id[:8]}") for w in sorted_widgets]
        if len(focus_order) > 0:
            focus_list = " ".join(focus_order)
            lines.append(f"    root.focus_followsmouse()")
            for i, var in enumerate(focus_order):
                lines.append(f"    {var}.config(takefocus=True)")
            lines.append("")
```

**Step 2: Verify**

Test with a project containing buttons with tabIndex props.

**Step 3: Commit**

```bash
git add backend/app/codegen/tkinter_gen.py
git commit -m "feat: generate tab focus order from tabIndex widget props"
```

---

### Task 7: Tkinter Variable Management — Types & Store

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/store/designerStore.ts`

**Step 1: Add TkVariable type**

In `types/widgets.ts`:
```typescript
export type TkVarType = "StringVar" | "IntVar" | "DoubleVar" | "BooleanVar";

export interface TkVariable {
  id: string;
  name: string;
  varType: TkVarType;
  defaultValue: string;
}
```

Add `variables: TkVariable[]` to `Project` interface.

**Step 2: Add variable state to store**

Add to `DesignerState`:
```typescript
variables: TkVariable[];
addVariable: (varType: TkVarType) => void;
removeVariable: (id: string) => void;
renameVariable: (id: string, name: string) => void;
updateVariable: (id: string, updates: Partial<TkVariable>) => void;
```

Implementation:
```typescript
variables: [],
addVariable: (varType) => {
  const id = uuid();
  const name = `${varType.replace("Var", "").toLowerCase()}_var_${useDesignerStore.getState().variables.length + 1}`;
  set((s) => ({ variables: [...s.variables, { id, name, varType, defaultValue: "" }] }));
},
removeVariable: (id) => set((s) => ({ variables: s.variables.filter(v => v.id !== id) })),
renameVariable: (id, name) => set((s) => ({ variables: s.variables.map(v => v.id === id ? { ...v, name } : v) })),
updateVariable: (id, updates) => set((s) => ({ variables: s.variables.map(v => v.id === id ? { ...v, ...updates } : v) })),
```

**Step 3: Update loadProject/exportProject to include variables**

In `loadProject`, add `variables: project.variables ?? []`.
In `exportProject`, add `variables: s.variables`.

**Step 4: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/types/widgets.ts frontend/src/store/designerStore.ts
git commit -m "feat: add TkVariable type and variable management store"
```

---

### Task 8: Variable Management Panel

**Files:**
- Create: `frontend/src/components/VariablePanel.tsx`
- Modify: `frontend/src/components/Toolbar.tsx`

**Step 1: Create VariablePanel**

A modal/panel showing:
- Table of variables: Name (editable), Type (dropdown), Default Value (input)
- Add button with type selector dropdown
- Delete button per row
- Close button

Dark theme matching app style. Width ~400px.

**Step 2: Add Variables button to Toolbar**

Add button that opens VariablePanel as a modal overlay.

**Step 3: Update PropertyPanel**

For props with key `variable` or `textvariable`, change from text input to dropdown:
```tsx
{prop.key === "variable" || prop.key === "textvariable" ? (
  <select className={inputCls} value={String(widget.props[prop.key] ?? "")} onChange={...}>
    <option value="">— none —</option>
    {variables.map(v => <option key={v.id} value={v.name}>{v.name} ({v.varType})</option>)}
  </select>
) : /* existing rendering */}
```

**Step 4: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/VariablePanel.tsx frontend/src/components/Toolbar.tsx frontend/src/components/PropertyPanel.tsx
git commit -m "feat: add variable management panel and variable dropdown in PropertyPanel"
```

---

### Task 9: Variable Codegen

**Files:**
- Modify: `backend/app/models/project.py`
- Modify: `backend/app/codegen/tkinter_gen.py`

**Step 1: Add TkVariable model**

In `models/project.py`:
```python
class TkVariable(BaseModel):
    id: str
    name: str
    var_type: str = "StringVar"
    default_value: str = ""
```

Add `variables: list[TkVariable] = []` to `Project`.

**Step 2: Generate variable declarations**

In `tkinter_gen.py`, after widget rendering, before event bindings:
```python
    # Generate Tkinter variable declarations
    if project.variables:
        for var in project.variables:
            default_part = f', value="{_escape(var.default_value)}"' if var.default_value else ""
            lines.append(f"    {var.name} = tk.{var.var_type}({default_part})")
        lines.append("")
```

**Step 3: Update Toolbar/CodePreview API payloads**

Add `variables: project.widgets ? ...` — actually variables is at project level. Add `variables` to JSON payloads in Toolbar.tsx and CodePreview.tsx alongside `widgets`.

**Step 4: Verify & Commit**

```bash
git add backend/app/models/project.py backend/app/codegen/tkinter_gen.py frontend/src/components/Toolbar.tsx frontend/src/components/CodePreview.tsx
git commit -m "feat: generate Tkinter variable declarations in codegen"
```

---

## Phase 3: Grid Layout

### Task 10: Grid Layout — Types & Store

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/store/designerStore.ts`

**Step 1: Extend WidgetInstance**

Add fields:
```typescript
layoutManager?: "place" | "grid";  // default "place"
gridRow?: number;
gridCol?: number;
gridRowSpan?: number;
gridColSpan?: number;
gridSticky?: string;
gridPadX?: number;
gridPadY?: number;
```

**Step 2: Add store actions**

```typescript
setLayoutManager: (id: string, manager: "place" | "grid") => void;
updateGridLayout: (id: string, grid: { row?: number; col?: number; rowSpan?: number; colSpan?: number; sticky?: string; padX?: number; padY?: number }) => void;
```

Implementation: update the widget's layoutManager and grid fields.

**Step 3: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/types/widgets.ts frontend/src/store/designerStore.ts
git commit -m "feat: add grid layout fields to WidgetInstance type"
```

---

### Task 11: Grid Layout — Canvas Rendering

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

**Step 1: Render grid-managed children inside containers**

When a container widget has children using grid layout, render them using CSS Grid:
```tsx
// In renderContainerContent, detect if children use grid
const gridChildren = allWidgets.filter(w => w.parentId === widget.id && w.layoutManager === "grid");
const placeChildren = allWidgets.filter(w => w.parentId === widget.id && (!w.layoutManager || w.layoutManager === "place"));

// If grid children exist, compute grid template
if (gridChildren.length > 0) {
  const maxRow = Math.max(...gridChildren.map(w => (w.gridRow ?? 0) + (w.gridRowSpan ?? 1)));
  const maxCol = Math.max(...gridChildren.map(w => (w.gridCol ?? 0) + (w.gridColSpan ?? 1)));
  const gridStyle = {
    display: "grid",
    gridTemplateRows: `repeat(${maxRow}, minmax(0, 1fr))`,
    gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
    gap: "4px",
    padding: "4px",
  };
  // Render grid children with gridRow/gridColumn styles
}
```

**Step 2: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/Canvas.tsx
git commit -m "feat: render grid layout children with CSS Grid on canvas"
```

---

### Task 12: Grid Layout — PropertyPanel

**Files:**
- Modify: `frontend/src/components/PropertyPanel.tsx`

**Step 1: Add Layout section**

When a widget is selected, show "Layout" section:
- Layout Manager: toggle between "place" and "grid"
- If grid: Row, Column, Row Span, Col Span, Sticky (select: nsew combinations), Pad X, Pad Y
- If place: existing X, Y fields

**Step 2: Constraint — children must match parent's layout**

When changing a child's layout manager, show a warning if siblings use a different manager.

**Step 3: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/PropertyPanel.tsx
git commit -m "feat: add layout manager selector and grid properties to PropertyPanel"
```

---

### Task 13: Grid Layout — Codegen

**Files:**
- Modify: `backend/app/models/project.py`
- Modify: `backend/app/codegen/tkinter_gen.py`

**Step 1: Add grid fields to backend model**

Add to `WidgetInstance`:
```python
layout_manager: str = "place"  # "place" | "grid"
grid_row: int | None = None
grid_col: int | None = None
grid_row_span: int | None = None
grid_col_span: int | None = None
grid_sticky: str | None = None
grid_pad_x: int | None = None
grid_pad_y: int | None = None
```

**Step 2: Generate grid() calls in codegen**

In `render_widget`, check `w.layout_manager`:
```python
if w.layout_manager == "grid":
    grid_args = [f"row={w.grid_row}", f"column={w.grid_col}"]
    if w.grid_row_span and w.grid_row_span > 1:
        grid_args.append(f"rowspan={w.grid_row_span}")
    if w.grid_col_span and w.grid_col_span > 1:
        grid_args.append(f"columnspan={w.grid_col_span}")
    if w.grid_sticky:
        grid_args.append(f'sticky="{_escape(w.grid_sticky)}"')
    if w.grid_pad_x:
        grid_args.append(f"padx={w.grid_pad_x}")
    if w.grid_pad_y:
        grid_args.append(f"pady={w.grid_pad_y}")
    lines.append(f"{indent}{var_name}.grid({', '.join(grid_args)})")
else:
    lines.append(f"{indent}{var_name}.place(x={round(w.x)}, y={round(w.y)}, width={round(w.width)}, height={round(w.height)})")
```

**Step 3: Update API payloads**

Add grid fields to widget mapping in Toolbar.tsx and CodePreview.tsx.

**Step 4: Verify & Commit**

```bash
git add backend/app/models/project.py backend/app/codegen/tkinter_gen.py frontend/src/components/Toolbar.tsx frontend/src/components/CodePreview.tsx
git commit -m "feat: generate grid() layout calls in codegen"
```

---

## Phase 4: New Panels & Dependencies

### Task 14: Non-Visual Component Tray

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/store/designerStore.ts`
- Create: `frontend/src/components/ComponentTray.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `backend/app/models/project.py`
- Modify: `backend/app/codegen/tkinter_gen.py`

**Step 1: Define NonVisualComponent type**

In `types/widgets.ts`:
```typescript
export type NonVisualType = "Timer" | "FileDialog" | "ColorChooser" | "MessageBox";

export interface NonVisualComponent {
  id: string;
  type: NonVisualType;
  name: string;
  props: Record<string, unknown>;
}
```

Add `nonVisuals: NonVisualComponent[]` to `Project`.

**Step 2: Add store state**

`nonVisuals: NonVisualComponent[]`, CRUD actions (addNonVisual, removeNonVisual, updateNonVisual).

**Step 3: Create ComponentTray**

A horizontal bar below Canvas (above StatusBar). Shows small chips for each non-visual component with name and type icon. Click to edit props in a small modal.

Timer props: interval (ms), oneshot
FileDialog props: mode (open/save/directory), title, filetypes
ColorChooser props: title, initialcolor
MessageBox props: title, message, type (info/warning/error/yesno)

**Step 4: Add to App.tsx**

Render ComponentTray between Canvas/CodePreview area and StatusBar.

**Step 5: Add Toolbar dropdown**

"Components" button with dropdown to add Timer, FileDialog, etc.

**Step 6: Codegen**

Generate appropriate imports and code:
- Timer → `root.after(interval, callback)`
- FileDialog → `from tkinter import filedialog; filedialog.askopenfilename(...)`
- ColorChooser → `from tkinter import colorchooser; colorchooser.askcolor(...)`
- MessageBox → `from tkinter import messagebox; messagebox.showinfo(...)`

**Step 7: Verify & Commit**

```bash
git add -A
git commit -m "feat: add non-visual component tray (Timer, FileDialog, ColorChooser, MessageBox)"
```

---

### Task 15: Image/Icon Support

**Files:**
- Modify: `frontend/src/types/widgets.ts`
- Modify: `frontend/src/store/designerStore.ts`
- Create: `frontend/src/components/ResourcePanel.tsx`
- Modify: `frontend/src/components/PropertyPanel.tsx`
- Modify: `frontend/src/components/Canvas.tsx`
- Modify: `frontend/src/utils/widgetDefaults.ts`
- Modify: `backend/app/models/project.py`
- Modify: `backend/app/codegen/tkinter_gen.py`

**Step 1: Define ProjectResource type**

```typescript
export interface ProjectResource {
  id: string;
  name: string;
  type: "image";
  dataUrl: string;  // base64
}
```

Add `resources: ProjectResource[]` to `Project`.

**Step 2: Store state + ResourcePanel**

Add `resources` to store with addResource (file input → dataURL), removeResource.

Create ResourcePanel: grid of thumbnail images, upload button, delete button.

**Step 3: Add image prop to widgets**

In `widgetDefaults.ts`, add `{ key: "image", label: "Image", type: "image" }` to editableProps for Button, Label, Checkbutton, Radiobutton.

Add new PropSpec type: `"image"` — renders as dropdown of project resources.

**Step 4: Canvas rendering**

When widget has `image` prop set to a resource ID, render the image:
```tsx
const imageResource = resources.find(r => r.id === widget.props.image);
if (imageResource) {
  return <img src={imageResource.dataUrl} className="max-w-full max-h-full object-contain" alt="" />;
}
```

**Step 5: Codegen**

At top of generated file, declare PhotoImage objects:
```python
    # Resources
    image_1 = tk.PhotoImage(data="base64...")
    button_1 = tk.Button(root, text="Click", image=image_1)
```

**Step 6: Verify & Commit**

```bash
git add -A
git commit -m "feat: add image/icon support with resource management"
```

---

### Task 16: CodeMirror Event Editor

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/components/EventEditorModal.tsx`

**Step 1: Install CodeMirror dependencies**

```bash
cd frontend && npm install @codemirror/view @codemirror/state @codemirror/lang-python @codemirror/theme-one-dark
```

**Step 2: Replace textarea with CodeMirror**

In `EventEditorModal.tsx`, replace the textarea + line numbers section with a CodeMirror editor:

```typescript
import { EditorView, basicSetup } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useRef, useEffect } from "react";

// In the component:
const editorRef = useRef<HTMLDivElement>(null);
const viewRef = useRef<EditorView | null>(null);

useEffect(() => {
  if (!editorRef.current || !activeEvent) return;
  const state = EditorState.create({
    doc: currentCode,
    extensions: [
      basicSetup,
      python(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          handleCodeChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": { fontSize: "12px", height: "100%" },
        ".cm-scroller": { overflow: "auto" },
      }),
    ],
  });
  viewRef.current = new EditorView({ state, parent: editorRef.current });
  return () => viewRef.current?.destroy();
}, [activeEvent]); // Re-create on event tab change
```

Replace the line-numbers + textarea JSX with:
```tsx
<div ref={editorRef} className="flex-1 min-h-[240px]" />
```

**Step 3: Verify & Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/package.json frontend/package-lock.json frontend/src/components/EventEditorModal.tsx
git commit -m "feat: replace textarea with CodeMirror editor for syntax highlighting"
```

---

### Task 17: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Document new features**

Add to Frontend section:
- Grid layout: widgets can use place() or grid(), PropertyPanel Layout section
- Variable panel: TkVariable management, dropdown binding in PropertyPanel
- Component tray: non-visual components (Timer, FileDialog, etc.)
- Resource panel: image management with base64 storage
- Tab order mode: toggle from Toolbar, click to assign indices
- Smart naming: prefix-based (btn_1, lbl_1)
- Size tools: makeSameWidth/Height in multi-select panel

Add to Backend codegen section:
- grid() layout generation
- Tkinter variable declarations
- Non-visual component code generation
- PhotoImage declarations for resources

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with WinForms parity features"
```
