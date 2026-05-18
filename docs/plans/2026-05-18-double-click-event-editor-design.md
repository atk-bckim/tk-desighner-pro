# Double-Click Event Editor Design

## Overview

WinForms-like double-click code editing for Tkinter Designer. Double-clicking a widget opens a modal where users write Python event handler code directly. The code is included in the exported `.py` file via `widget.bind()`.

## Requirements

- Double-click widget on canvas → EventEditorModal opens
- Widget's default event auto-selected (Button→command, Entry→\<Return\>, etc.)
- Widgets with no events (Frame, Label) → no action on double-click
- Multi-event widgets show tabs to switch between events (Entry has \<Return\>, \<FocusOut\>)
- Users can add generic events (On Click, On Mouse Enter, etc.) via "+" button
- Saved code persists in widget.events dict and appears in generated Tkinter code
- Visual indicator on canvas for widgets with event handlers

## Architecture

### New Component: EventEditorModal

Location: `frontend/src/components/EventEditorModal.tsx`

Props:
- `widgetId: string` — target widget
- `onClose: () => void` — close modal

Features:
- Header shows `widget_name.event_name` (e.g., `button_1.command`)
- Monospace textarea with line numbers for Python code
- Tab bar for widgets with multiple events
- "+" button to add GENERIC_EVENTS
- Save (Ctrl+Enter) / Cancel (Escape) buttons
- Delete event button to remove an event handler

### Canvas Changes

In `Canvas.tsx` → `WidgetRenderer`:
- Add `onDoubleClick` handler to widget div
- On double-click: if widget has events in WIDGET_EVENTS, open EventEditorModal
- Visual indicator: small lightning icon (⚡) on widgets with events
- Modal state managed in Canvas component (useState)

### Store Changes

No new actions needed. Existing:
- `updateWidgetEvent(id, eventName, code)` — save event code
- `removeWidgetEvent(id, eventName)` — delete event code
- `widget.events: Record<string, string>` — already in WidgetInstance type

### Codegen Changes

In `backend/app/codegen/tkinter_gen.py`:
- After rendering each widget, check `w.events` dict
- Generate `widget.bind("event_name", lambda e: ...)` for each event
- For `command` event (not a bind), generate `widget.config(command=lambda: ...)`
- Indent properly within the `create_window()` function

### Event Categories

From `widgetDefaults.ts`:
- **Widget-specific events**: WIDGET_EVENTS (Button→command, Entry→\<Return\>, etc.)
- **Generic events**: GENERIC_EVENTS (\<Button-1\>, \<Enter\>, \<Leave\>, \<Configure\>)

## Data Flow

```
User double-clicks widget on Canvas
  → Canvas detects widget has WIDGET_EVENTS entries
  → Opens EventEditorModal with widgetId
  → Modal reads widget.events from store
  → Modal auto-selects default event
  → User writes Python code, clicks Save
  → store.updateWidgetEvent(id, eventName, code)
  → On export/preview, codegen reads events dict
  → Generates .bind() / .config(command=) in output .py
```

## Codegen Output Example

```python
# For a Button with command event:
button_1 = tk.Button(root, text="Click Me")
button_1.place(x=100, y=50, width=120, height=40)
button_1.config(command=lambda: print("clicked"))

# For an Entry with <Return> event:
entry_1 = tk.Entry(root)
entry_1.place(x=100, y=100, width=200, height=30)
entry_1.bind("<Return>", lambda e: print("enter pressed"))
```
