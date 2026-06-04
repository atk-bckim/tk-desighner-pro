# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Tkinter Designer — a visual drag-and-drop GUI builder for Python's Tkinter, similar to WinForms designer. Target: experienced Tkinter developers who want to design layouts visually and export clean Python code.

## Tech Stack

- **Frontend**: React 19, TypeScript (~6.0), Vite 8, Zustand 5, @dnd-kit/core, Tailwind CSS 4 (via `@tailwindcss/vite` plugin — no `tailwind.config.*`)
- **Backend**: FastAPI, uvicorn, Pydantic 2
- Generated code uses only Python stdlib (`tkinter`, `tkinter.ttk`)

## Development Commands

```bash
# Run both frontend + backend (frontend :5173, backend :8000)
python dev.py

# Frontend only
cd frontend && npm run dev

# Backend only
cd backend && uvicorn app.main:app --reload --port 8000

# Build frontend
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint

# Install
cd frontend && npm install
cd backend && pip install -r requirements.txt
```

No test framework is currently configured.

## Architecture

```
React SPA (:5173) ←→ FastAPI (:8000)
  │                      │
  ├─ Canvas              ├─ POST /api/preview   (codegen + subprocess run)
  ├─ Toolbox             ├─ POST /api/export    (.py file download)
  ├─ PropertyPanel       └─ POST /api/validate  (name collision, syntax check)
  ├─ ObjectTree
  ├─ Toolbar
  ├─ CodePreview
  └─ StatusBar
```

### Key Design Decision: Python Runner

No CSS widget mimic — the backend generates real Tkinter `.py` code and runs it via subprocess (10s timeout). Users see an actual Tkinter window pop up for 100% accurate preview. If tkinter is unavailable, preview returns `code_only` status with the generated code.

### Frontend (`frontend/src/`)

All state lives in a single Zustand store (`store/designerStore.ts`). Key state shape:
- `widgets: WidgetInstance[]` — flat array with `parentId` for hierarchy, NOT a nested tree
- `selectedIds: string[]` — multi-select support
- `undoStack` / `redoStack` — manual snapshot-based undo (call `snapshot()` before mutations)
- `menuBar` — optional menu bar data
- `zoom`, `gridSize`, `snapEnabled`, `tkTheme`, `rootBg`, `rootResizable`

**Parent-child widget hierarchy**: Frame, LabelFrame, Notebook, and Toplevel can contain children. Children store coordinates *relative* to their parent. Use `utils/position.ts` → `getAbsolutePosition()` to compute canvas-absolute coords by walking the parent chain.

**Widget specs**: `utils/widgetDefaults.ts` defines per-widget-type specs (default size, editable props, events). Widget auto-naming uses counters (`button_1`, `label_2`).

**Templates**: `templates/index.ts` provides pre-built layouts (login, settings, data entry, tabbed UI, etc.) loaded via `loadTemplate()`.

**Autosave**: App.tsx persists the full project to `localStorage` every 30 seconds and restores on load.

**Keyboard shortcuts** (handled in App.tsx): Delete/Backspace, Ctrl+Z/Y (undo/redo), Ctrl+C/V (copy/paste), Ctrl+D (duplicate), Ctrl+L (lock), Ctrl+A (select all), Tab/Shift+Tab (cycle selection), arrow keys (nudge), Ctrl+scroll (zoom), Ctrl+0 (reset zoom), Ctrl+1 (fit zoom).

**Event editor**: Double-clicking a widget with events (Button, Entry, etc.) opens `EventEditorModal` for writing Python event handler code. Events defined in `WIDGET_EVENTS` (widget-specific, e.g., Button→command) and `GENERIC_EVENTS` (generic, e.g., \<Button-1\>). Stored in `widget.events: Record<string, string>`. Canvas shows ⚡ indicator on widgets with event code. Codegen generates `.config(command=)` for command events and `.bind(event, handler)` for others.

### Backend (`backend/app/`)

- **`models/project.py`** — Pydantic models: `Project`, `WidgetInstance`, `WidgetBindings`, `MenuBarData`. Fields use snake_case; frontend sends camelCase (FastAPI/Vite proxy handles mapping).
- **`codegen/tkinter_gen.py`** — String-builder codegen. Handles: ttk vs tk module selection (`_TTK_TYPES`), Notebook tabs (rendered as ttk.Frame children), Toplevel windows, OptionMenu (auto-creates StringVar), Scrollbar ↔ Text/Listbox bindings, menu bar, widget event bindings (`command` → `.config(command=)`, others → `.bind()`). Props categorized as `_RAW_PROPS` (font, command, variable), `_TUPLE_PROPS` (values), `_UI_ONLY_PROPS` (activeTab — filtered out during codegen).
- **`api/preview.py`** — Generates code, writes to temp file, runs via subprocess, cleans up after 5s.
- **`api/export.py`** — Validate endpoint checks: name collisions, orphan parent references, binding references, generated code syntax via `py_compile`. Export endpoint returns `.py` file.

### Data Flow

```
Toolbox → (drag via @dnd-kit) → Canvas → Zustand store (flat widgets[])
                                               ↓
                                    PropertyPanel (edit props)
                                               ↓
                              POST /api/preview → tkinter_gen.py → subprocess
                              POST /api/export → .py file download
                              POST /api/validate → error checking
```

Frontend → Backend communication sends the full `Project` object on each request (no partial updates).

## Conventions

- Widget property names match Tkinter constructor kwargs (`text`, `bg`, `fg`, `font`) for direct codegen mapping
- Canvas coordinates are integers (pixel-based for `place()` layout)
- `place()` layout only — pack/grid deferred to later version
- Save/load via browser file download/upload (JSON format)
- Korean comments acceptable for design intent clarification
- ttk widgets (Notebook, Progressbar, Combobox, Treeview, Sizegrip, Separator) render with `ttk.` prefix in generated code
- The `Separator` widget is in `_TTK_TYPES` for codegen but NOT in `TTK_WIDGETS` in widgetDefaults (it has no editable props, so the distinction doesn't matter for the UI)
