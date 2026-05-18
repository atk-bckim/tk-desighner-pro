# Double-Click Event Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add WinForms-like double-click code editing — double-clicking a widget opens a modal for writing Python event handler code that appears in the exported `.py` file.

**Architecture:** New `EventEditorModal` component manages code editing. Canvas detects double-clicks and opens the modal. Existing store actions (`updateWidgetEvent`/`removeWidgetEvent`) persist code. Backend codegen reads `events` dict and generates `.bind()`/`.config(command=)` calls.

**Tech Stack:** React 19, TypeScript, Zustand 5, Tailwind CSS 4 (no config), FastAPI/Pydantic backend

---

### Task 1: EventEditorModal Component

**Files:**
- Create: `frontend/src/components/EventEditorModal.tsx`

**Step 1: Create the modal component**

```tsx
import { useState, useRef, useEffect } from "react";
import { useDesignerStore } from "../store/designerStore";
import { WIDGET_EVENTS, GENERIC_EVENTS } from "../utils/widgetDefaults";

interface EventEditorModalProps {
  widgetId: string;
  onClose: () => void;
}

export function EventEditorModal({ widgetId, onClose }: EventEditorModalProps) {
  const widgets = useDesignerStore((s) => s.widgets);
  const { updateWidgetEvent, removeWidgetEvent, snapshot } = useDesignerStore();
  const widget = widgets.find((w) => w.id === widgetId);
  const widgetEvents = widget ? WIDGET_EVENTS[widget.type] ?? [] : [];

  // All events: widget-specific + already-added generic events
  const allEvents = [
    ...widgetEvents,
    ...GENERIC_EVENTS.filter((ge) =>
      widget?.events?.[ge.event] !== undefined && !widgetEvents.some((we) => we.event === ge.event)
    ),
  ];

  // Find default event (first widget-specific event that has code, or first event)
  const defaultEvent = allEvents[0]?.event;
  const [activeEvent, setActiveEvent] = useState(defaultEvent);
  const [code, setCode] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load code when active event changes
  useEffect(() => {
    setCode(widget?.events?.[activeEvent] ?? "");
    textareaRef.current?.focus();
  }, [activeEvent, widget?.events]);

  if (!widget || allEvents.length === 0) return null;

  const handleSave = () => {
    snapshot();
    if (code.trim()) {
      updateWidgetEvent(widgetId, activeEvent, code);
    } else {
      removeWidgetEvent(widgetId, activeEvent);
    }
    onClose();
  };

  const handleDelete = () => {
    snapshot();
    removeWidgetEvent(widgetId, activeEvent);
    setCode("");
  };

  const handleAddGenericEvent = (event: string) => {
    // Add to events with empty code so it appears as a tab
    updateWidgetEvent(widgetId, event, "");
    setActiveEvent(event);
  };

  const eventLabel = (eventName: string): string => {
    const specific = widgetEvents.find((e) => e.event === eventName);
    if (specific) return specific.label;
    const generic = GENERIC_EVENTS.find((e) => e.event === eventName);
    return generic?.label ?? eventName;
  };

  const hasCode = (eventName: string): boolean => {
    const c = widget?.events?.[eventName];
    return !!c && c.trim().length > 0;
  };

  // Available generic events to add (not already in tabs)
  const availableGeneric = GENERIC_EVENTS.filter(
    (ge) => !allEvents.some((ae) => ae.event === ge.event)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1e1e2e] border border-[#3c3c52] rounded-lg shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c52]">
          <div>
            <span className="text-sm font-mono text-[#06b6d4]">{widget.name}</span>
            <span className="text-xs text-[#5a5a72] ml-2">{widget.type}</span>
          </div>
          <button onClick={onClose} className="text-[#5a5a72] hover:text-[#8888a8] text-lg">&times;</button>
        </div>

        {/* Event tabs */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#3c3c52] bg-[#252536] overflow-x-auto">
          {allEvents.map((ev) => (
            <button
              key={ev.event}
              onClick={() => setActiveEvent(ev.event)}
              className={`px-2 py-1 text-[10px] rounded whitespace-nowrap transition-colors ${
                activeEvent === ev.event
                  ? "bg-[#06b6d4] text-white"
                  : hasCode(ev.event)
                    ? "bg-[#06b6d4]/20 text-[#06b6d4] hover:bg-[#06b6d4]/30"
                    : "text-[#8888a8] hover:bg-[#3c3c52]"
              }`}
            >
              {eventLabel(ev.event)}
              {hasCode(ev.event) && " *"}
            </button>
          ))}
          {availableGeneric.length > 0 && (
            <div className="relative group">
              <button className="px-1.5 py-1 text-[10px] text-[#5a5a72] hover:text-[#8888a8]">+</button>
              <div className="absolute left-0 top-full bg-[#252536] border border-[#3c3c52] rounded shadow-lg py-1 hidden group-hover:block z-10 min-w-36">
                {availableGeneric.map((ge) => (
                  <button
                    key={ge.event}
                    onClick={() => handleAddGenericEvent(ge.event)}
                    className="block w-full text-left px-3 py-1 text-[10px] text-[#8888a8] hover:bg-[#3c3c52] hover:text-white"
                  >
                    {ge.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event name display */}
        <div className="px-4 py-1 text-[10px] text-[#5a5a72] font-mono border-b border-[#3c3c52]">
          {activeEvent}
        </div>

        {/* Code editor */}
        <div className="flex-1 relative min-h-[200px]">
          <div className="absolute inset-0 flex">
            <div className="w-8 bg-[#252536] text-right pr-1 pt-2 text-[10px] text-[#3c3c52] leading-[20px] select-none overflow-hidden font-mono">
              {code.split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                // Tab inserts 4 spaces
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  setCode(code.substring(0, start) + "    " + code.substring(end));
                  // Restore cursor position after state update
                  requestAnimationFrame(() => {
                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                  });
                }
                // Ctrl+Enter saves
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSave();
                }
                // Escape cancels
                if (e.key === "Escape") {
                  onClose();
                }
              }}
              className="flex-1 bg-[#1e1e2e] text-[#d4d4e8] p-2 text-xs font-mono leading-[20px] resize-none focus:outline-none"
              placeholder="def handler(event):&#10;    pass"
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#3c3c52]">
          <button
            onClick={handleDelete}
            className="text-[10px] text-[#ef4444] hover:text-[#f87171] transition-colors"
          >
            Delete Handler
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[10px] text-[#8888a8] hover:text-[#d4d4e8] px-3 py-1 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-[10px] bg-[#06b6d4] hover:bg-[#22d3ee] text-white px-3 py-1 rounded transition-colors"
            >
              Save (Ctrl+Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors related to EventEditorModal

**Step 3: Commit**

```bash
git add frontend/src/components/EventEditorModal.tsx
git commit -m "feat: add EventEditorModal component for double-click code editing"
```

---

### Task 2: Double-Click Handler & Event Indicator in Canvas

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`

**Step 1: Add double-click state and handler to Canvas component**

In `Canvas` function component, add state for the event editor modal:

```tsx
// Add import at top of file
import { EventEditorModal } from "./EventEditorModal";
import { WIDGET_EVENTS } from "../utils/widgetDefaults";

// Inside Canvas component, after existing useState hooks:
const [eventEditor, setEventEditor] = useState<string | null>(null);
```

**Step 2: Add onDoubleClick prop to WidgetRenderer**

In `WidgetRenderer` props interface, add:

```tsx
onDoubleClick: (widgetId: string) => void;
```

In the widget div (the outermost `div` with `onMouseDown`), add:

```tsx
onDoubleClick={(e) => {
  e.stopPropagation();
  onDoubleClick(widget.id);
}}
```

**Step 3: Wire up onDoubleClick in Canvas render**

In `renderWidget` function, add `onDoubleClick` prop:

```tsx
onDoubleClick={(widgetId) => {
  const w = useDesignerStore.getState().widgets.find((w) => w.id === widgetId);
  if (w) {
    const events = WIDGET_EVENTS[w.type] ?? [];
    if (events.length > 0) {
      setEventEditor(widgetId);
    }
  }
}}
```

**Step 4: Add event indicator on widgets**

In `WidgetRenderer`, after the locked icon div, add event indicator:

```tsx
{widget.events && Object.keys(widget.events).length > 0 && (
  <div className="absolute top-0.5 left-0.5 text-[8px] text-amber-400">&#9889;</div>
)}
```

**Step 5: Render EventEditorModal in Canvas**

After the canvas div (after `ContextMenu`), add:

```tsx
{eventEditor && (
  <EventEditorModal widgetId={eventEditor} onClose={() => setEventEditor(null)} />
)}
```

**Step 6: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/components/Canvas.tsx
git commit -m "feat: add double-click handler and event indicator on canvas widgets"
```

---

### Task 3: Codegen — Generate .bind() / .config(command=) for Events

**Files:**
- Modify: `backend/app/codegen/tkinter_gen.py`

**Step 1: Add event code generation after widget rendering**

In `generate_tkinter_code`, after the Scrollbar binding section (around line 174) and before `return root`, add:

```python
    # Generate event bindings
    for w in project.widgets:
        if not w.events:
            continue
        var_name = name_map.get(w.id, f"{w.type.lower()}_{w.id[:8]}")
        for event_name, code in w.events.items():
            if not code or not code.strip():
                continue
            if event_name == "command":
                # command is set via .config(), not .bind()
                # Indent each line of user code
                indented = "\n".join("        " + line for line in code.strip().split("\n"))
                lines.append(f"    def _{var_name}_command():")
                lines.append(indented)
                lines.append(f"    {var_name}.config(command=_{var_name}_command)")
            else:
                # .bind() events receive an event parameter
                indented = "\n".join("        " + line for line in code.strip().split("\n"))
                lines.append(f"    def _{var_name}_{event_name.replace('<', '').replace('>', '').replace(' ', '_')}(event):")
                lines.append(indented)
                lines.append(f'    {var_name}.bind("{_escape(event_name)}", _{var_name}_{event_name.replace("<", "").replace(">", "").replace(" ", "_")})')
            lines.append("")
```

**Step 2: Verify generated code**

Run the backend and test via the preview endpoint with a widget that has events:

```bash
cd backend && python -c "
from app.codegen.tkinter_gen import generate_tkinter_code
from app.models.project import Project, WidgetInstance

p = Project(
    name='Test',
    widgets=[
        WidgetInstance(
            id='btn1', type='Button', name='button_1',
            x=10, y=10, width=120, height=40,
            props={'text': 'Click Me'},
            events={'command': 'print(\"clicked\")'}
        )
    ]
)
print(generate_tkinter_code(p))
"
```

Expected output includes:
```python
    def _button_1_command():
        print("clicked")
    button_1.config(command=_button_1_command)
```

**Step 3: Commit**

```bash
git add backend/app/codegen/tkinter_gen.py
git commit -m "feat: generate .bind() and .config(command=) for widget events"
```

---

### Task 4: Backend Model — Ensure Events Field Serializes Correctly

**Files:**
- Modify: `backend/app/models/project.py`

**Step 1: Verify events field**

The `WidgetInstance` model already has `events: dict[str, str] = {}`. Verify the frontend sends it correctly — the camelCase `events` key should map to snake_case automatically since FastAPI's Pydantic handles this.

No changes needed if the field already exists. Verify by reading the model.

**Step 2: Commit if changes were made, otherwise skip**

---

### Task 5: End-to-End Manual Test

**Step 1: Start the dev server**

```bash
python dev.py
```

**Step 2: Test double-click flow**

1. Open http://localhost:5173
2. Drag a Button onto the canvas
3. Double-click the Button
4. Event editor modal should appear with "On Click" tab active
5. Type `print("hello")` in the code area
6. Click Save (or Ctrl+Enter)
7. Verify ⚡ indicator appears on the button
8. Click Preview — verify the generated Python code includes the event binding
9. Click Export — verify the `.py` file includes the handler

**Step 3: Test edge cases**

1. Double-click a Frame — nothing should happen (no events)
2. Double-click an Entry — modal should open with `<Return>` tab
3. Add a generic event via "+" button
4. Delete an event handler via Delete button
5. Test Tab key inserts spaces in code editor

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete double-click event editor with codegen integration"
```

---

### Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add event editor info to architecture section**

Add after the Keyboard shortcuts section in Frontend:
```
**Event editor**: Double-clicking a widget with events (Button, Entry, etc.) opens `EventEditorModal` for writing Python event handler code. Widget events defined in `utils/widgetDefaults.ts` (`WIDGET_EVENTS`, `GENERIC_EVENTS`). Events stored in `widget.events: Record<string, string>` and rendered as `.bind()` / `.config(command=)` in codegen.
```

Add to Backend codegen section:
```
Handles widget events: `command` events → `.config(command=lambda)`, other events → `.bind(event, handler)`.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with event editor architecture"
```
