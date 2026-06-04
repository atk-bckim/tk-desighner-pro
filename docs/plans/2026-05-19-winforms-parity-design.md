# WinForms Parity Feature Design

## Overview

10 features to bring Tkinter Designer closer to WinForms designer quality. Ordered by implementation priority (highest impact first).

---

## 1. Size/Spacing Auto-Adjustment

**Goal:** Multi-select widgets → make same width/height, distribute evenly.

**Changes:**
- `designerStore.ts`: Add `makeSameSize(ids, dimension: "width" | "height" | "both")` — sets all to the first widget's size
- `PropertyPanel.tsx`: Add "Size" section in multi-select panel with Same Width / Same Height / Same Both buttons (next to existing Align section)
- Existing `distributeWidgets` already handles horizontal/vertical distribution

**Data flow:** Select multiple → PropertyPanel shows Size buttons → `makeSameSize()` updates all widgets to match first selected.

---

## 2. Tab Order Editor

**Goal:** Toggle mode where each widget shows its TabIndex; click to set order.

**Changes:**
- `designerStore.ts`: Add `tabOrderMode: boolean`, `toggleTabOrderMode()`, `widgetTabIndex: Record<string, number>`, `setTabIndex(widgetId, index)`
- `Canvas.tsx`: When `tabOrderMode` is true, render a numbered badge on each interactive widget (Button, Entry, Checkbutton, etc.). Clicking a widget assigns the next sequential index.
- `Toolbar.tsx`: Add "Tab Order" toggle button
- `widgetDefaults.ts`: Add `INTERACTIVE_TYPES` set — widgets that participate in tab order
- `codegen/tkinter_gen.py`: Generate `widget.focus_set()` for first widget, skip non-interactive types

**UI:** Toolbar button toggles mode. Canvas shows yellow numbered badges. Click assigns order. Press Escape or toggle button to exit.

---

## 3. Smart Naming

**Goal:** Auto-suggest meaningful names based on widget type and context.

**Changes:**
- `utils/widgetDefaults.ts`: Add `NAME_PREFIXES` map per widget type:
  ```
  Button → btn, Label → lbl, Entry → entry, Checkbutton → chk
  Radiobutton → rdo, Listbox → lst, Combobox → cbo, Scale → scl
  Frame → frm, LabelFrame → grp, Text → txt, Spinbox → spn
  ```
- `utils/widgetDefaults.ts`: `createWidget()` generates name like `btn_1`, `lbl_title`, `entry_username`
- `PropertyPanel.tsx`: When name field is focused and equals default, show a context-aware suggestion chip based on sibling widgets and parent container

**Minimal approach:** Just improve the prefix in `createWidget()` from `button_1` to `btn_1`. Suggestions as future enhancement.

---

## 4. Tkinter Variable Management Panel

**Goal:** Visual panel to create/manage StringVar, IntVar, DoubleVar, BooleanVar and bind them to widgets.

**Changes:**
- `types/widgets.ts`: New `TkVariable` type: `{ id: string; name: string; varType: "StringVar" | "IntVar" | "DoubleVar" | "BooleanVar"; defaultValue: string }`
- `types/widgets.ts`: Add `variables: TkVariable[]` to `Project`
- `designerStore.ts`: Add `variables: TkVariable[]`, CRUD actions
- New component `VariablePanel.tsx`: Shows list of variables, add/delete, bind to widget via dropdown
- `PropertyPanel.tsx`: For props that accept `variable`/`textvariable`, show dropdown of project variables instead of text input
- `codegen/tkinter_gen.py`: Generate variable declarations at top of `create_window()`, wire to widgets

**UI:** New panel accessible from Toolbar. Lists all variables. Each has name, type, default value. Widget property "variable" becomes a dropdown.

---

## 5. grid() Layout Manager (Per-Widget Choice)

**Goal:** Each widget can use either `place()` or `grid()`. Container widgets declare their layout manager.

**Changes:**
- `types/widgets.ts`: Add to WidgetInstance:
  ```
  layoutManager: "place" | "grid"  // default: "place"
  gridRow?: number    // for grid()
  gridCol?: number    // for grid()
  gridRowSpan?: number
  gridColSpan?: number
  gridSticky?: string  // "nsew" etc.
  gridPadX?: number
  gridPadY?: number
  ```
- `PropertyPanel.tsx`: Add "Layout" section. When layoutManager="grid", show row/col/span/sticky/padding fields. When "place", show x/y as now.
- `Canvas.tsx`: Grid-managed widgets rendered with CSS grid on container divs
- `widgetDefaults.ts`: Add `CONTAINER_TYPES` set
- `codegen/tkinter_gen.py`: When widget has layoutManager="grid", generate `.grid(row=, column=, ...)` instead of `.place(x=, y=, ...)`

**Key constraint:** All children of a container must use the same layout manager. If parent uses grid, children switch to grid coords. Mixing place/grid within same parent is forbidden.

---

## 6. Non-Visual Component Tray

**Goal:** Tray at bottom of designer for Timer, FileDialog, ColorChooser, MessageBox configurations.

**Changes:**
- `types/widgets.ts`: New `NonVisualComponent` type: `{ id: string; type: "Timer" | "FileDialog" | "ColorChooser" | "MessageBox"; name: string; props: Record<string, unknown> }`
- `types/widgets.ts`: Add `nonVisuals: NonVisualComponent[]` to `Project`
- `designerStore.ts`: Add `nonVisuals` state + CRUD
- New component `ComponentTray.tsx`: Horizontal bar below Canvas. Shows icons for timers, dialogs. Click to edit props.
- `Toolbar.tsx`: Add dropdown to add non-visual components
- `codegen/tkinter_gen.py`: Generate appropriate code (root.after() for Timer, filedialog.askopenfilename() for FileDialog, etc.)

**UI:** Thin bar below Canvas showing component icons with names. Click opens property editor modal.

---

## 7. Image/Icon Support

**Goal:** Import images into project and assign to widgets (Button image, Label image, Canvas background).

**Changes:**
- `types/widgets.ts`: New `ProjectResource` type: `{ id: string; name: string; type: "image"; dataUrl: string }`
- `types/widgets.ts`: Add `resources: ProjectResource[]` to `Project`
- `designerStore.ts`: Add `resources` state + `addResource`, `removeResource`
- New component `ResourcePanel.tsx`: Grid of imported images with upload button
- `PropertyPanel.tsx`: New "Image" property type in PropSpec — shows dropdown of project resources
- `widgetDefaults.ts`: Add `image` to editableProps for Button, Label, Radiobutton, Checkbutton
- `Canvas.tsx`: If widget has image prop, render the image
- `codegen/tkinter_gen.py`: Generate PhotoImage declarations and assign to widgets

**Storage:** Images stored as base64 data URLs in project JSON. For codegen, emit as separate files in output directory or embed.

---

## 8. Event Editor Syntax Highlighting

**Goal:** CodeMirror-like experience in EventEditorModal.

**Approach:** Replace `<textarea>` with a lightweight code editor.

**Changes:**
- `EventEditorModal.tsx`: Replace textarea with CodeMirror 6 editor (via `@codemirror/lang-python` and `@codemirror/theme-one-dark`)
- Add dependency: `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-python`, `@codemirror/theme-one-dark`
- Configure: Python syntax, dark theme matching app colors, line numbers, auto-indent
- Size: ~50KB gzipped, acceptable for a dev tool

---

## 9. Dialog Templates

**Goal:** Pre-configured dialog patterns: OK/Cancel, Yes/No, Input, About.

**Changes:**
- `templates/index.ts`: Add dialog templates:
  - `dialog_ok_cancel`: Frame with Label + OK/Cancel buttons
  - `dialog_yes_no`: Frame with message + Yes/No buttons
  - `dialog_input`: LabelFrame with Label + Entry + OK/Cancel
  - `dialog_about`: Toplevel with title + version label + OK button
- Each template creates a Toplevel or Frame with appropriate widgets
- Accessible from Toolbar → Templates dropdown (already exists)

**Minimal approach:** Pure template additions, no new infrastructure needed.

---

## 10. Resource Editor

**Goal:** Project-level resource management (images, icons, strings) for localization.

**This overlaps significantly with Feature 7 (Image/Icon Support). Merge them.**

**Merged scope:** Resource panel handles images. String table for localization deferred to future version (YAGNI — Tkinter doesn't have built-in localization like .resx).

---

## Implementation Priority (Recommended Order)

| Phase | Features | Rationale |
|-------|----------|-----------|
| **Phase 1** | Size/Spacing, Smart Naming, Dialog Templates | Low risk, high UX impact, no model changes |
| **Phase 2** | Tab Order, Variable Panel | Medium model changes, core WinForms parity |
| **Phase 3** | grid() Layout | Largest change, affects canvas + codegen + types |
| **Phase 4** | Component Tray, Image Support, CodeMirror | New panels, new dependencies |

## Type Model Changes Summary

```typescript
// New types
interface TkVariable { id: string; name: string; varType: "StringVar"|"IntVar"|"DoubleVar"|"BooleanVar"; defaultValue: string }
interface NonVisualComponent { id: string; type: "Timer"|"FileDialog"|"ColorChooser"|"MessageBox"; name: string; props: Record<string, unknown> }
interface ProjectResource { id: string; name: string; type: "image"; dataUrl: string }

// WidgetInstance additions
layoutManager: "place" | "grid"  // default "place"
gridRow?: number; gridCol?: number; gridRowSpan?: number; gridColSpan?: number
gridSticky?: string; gridPadX?: number; gridPadY?: number

// Project additions
variables: TkVariable[]
nonVisuals: NonVisualComponent[]
resources: ProjectResource[]
```
