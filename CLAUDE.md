# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tkinter Designer — a visual drag-and-drop GUI builder for Python's Tkinter, similar to WinForms designer. Target: experienced Tkinter developers who want to design layouts visually and export clean Python code.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Zustand, @dnd-kit/core, Tailwind CSS
- **Backend**: FastAPI, uvicorn (Python runner for live preview)
- Generated code uses only Python stdlib Tkinter

## Development Commands

```bash
# Run both frontend + backend
python dev.py

# Frontend only
cd frontend && npm run dev

# Backend only
cd backend && uvicorn app.main:app --reload

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd backend && pip install -r requirements.txt
```

## Architecture

```
React SPA ←→ FastAPI
  │              │
  ├─ Canvas      ├─ POST /api/preview (codegen + subprocess run)
  ├─ Toolbox     └─ POST /api/export (.py file download)
  ├─ PropertyPanel
  ├─ Toolbar
  └─ CodePreview
```

### Key Design Decision: Python Runner

No CSS widget mimic — the backend generates real Tkinter `.py` code and runs it via subprocess. Users see an actual Tkinter window pop up for 100% accurate preview.

### Frontend (`frontend/src/`)

- **`components/Canvas.tsx`** — Design surface, drag/drop/move/resize widgets (div-based, not CSS mimic of Tkinter)
- **`components/Toolbox.tsx`** — Widget palette (Button, Label, Entry, Text, Checkbutton, etc.)
- **`components/PropertyPanel.tsx`** — Edit selected widget properties (text, bg, fg, font, geometry)
- **`components/Toolbar.tsx`** — Save, load, export, preview buttons
- **`components/CodePreview.tsx`** — View generated Tkinter code
- **`store/designerStore.ts`** — Zustand store: widgets array, selected widget, canvas size
- **`types/widgets.ts`** — `WidgetInstance`, `WidgetType`, `Project` types
- **`utils/widgetDefaults.ts`** — Default props and specs per widget type

### Backend (`backend/app/`)

- **`api/preview.py`** — Receives widget layout, generates code, runs via subprocess
- **`api/export.py`** — Returns generated `.py` file as download
- **`codegen/tkinter_gen.py`** — Code generation engine (Jinja2 templates or string builder)

### Data Flow

```
Toolbox → (drag via @dnd-kit) → Canvas → Zustand store (widgets[])
                                              ↓
                                    PropertyPanel (edit props)
                                              ↓
                                    POST /api/preview → tkinter_gen.py → subprocess
                                              ↓
                                    POST /api/export → .py file download
```

## Conventions

- Widget property names match Tkinter constructor kwargs (`text`, `bg`, `fg`, `font`) for direct codegen mapping
- Canvas coordinates are integers (pixel-based for place() layout)
- MVP uses `place()` layout only — pack/grid deferred to later version
- Save/load via browser file download/upload (JSON format)
- Korean comments acceptable for design intent clarification
