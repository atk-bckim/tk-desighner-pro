# Tkinter Designer - Design Document

**Date**: 2026-05-14
**Status**: Approved

## Overview

Visual drag-and-drop GUI builder for Python's Tkinter. Target users are experienced Tkinter developers who want to design layouts visually and export clean Python code. Similar to WinForms designer.

## Architecture

React SPA (frontend) + FastAPI (backend) for Python runner.

```
React SPA ←→ FastAPI
  │              │
  ├─ Canvas      ├─ POST /api/preview (codegen + subprocess run)
  ├─ Toolbox     └─ POST /api/export (.py file download)
  ├─ PropertyPanel
  ├─ Toolbar
  └─ CodePreview
```

### Key Decision: Python Runner over CSS Mimic

Instead of approximating Tkinter widgets with CSS (imprecise), the backend generates actual `.py` code and runs it via subprocess. A real Tkinter window pops up on the user's screen for 100% accurate preview.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Zustand, @dnd-kit/core, Tailwind CSS
- **Backend**: FastAPI, uvicorn
- **No external Tkinter dependencies** — generated code uses only stdlib

## Project Structure

```
tk-designer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── Toolbox.tsx
│   │   │   ├── PropertyPanel.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── CodePreview.tsx
│   │   ├── store/
│   │   │   └── designerStore.ts
│   │   ├── types/
│   │   │   └── widgets.ts
│   │   ├── utils/
│   │   │   └── widgetDefaults.ts
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── preview.py
│   │   │   └── export.py
│   │   └── codegen/
│   │       └── tkinter_gen.py
│   └── requirements.txt
├── dev.py
└── CLAUDE.md
```

## Data Model

```typescript
type WidgetType = 'Button' | 'Label' | 'Entry' | 'Text' | 'Checkbutton'
                 | 'Radiobutton' | 'Listbox' | 'Scale' | 'Frame';

interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, any>;  // keys match Tkinter kwargs: text, bg, fg, font...
}

interface Project {
  name: string;
  canvasWidth: number;   // default 800
  canvasHeight: number;  // default 600
  widgets: WidgetInstance[];
}
```

## MVP Scope

### Supported Widgets

| Widget | Key Properties |
|--------|---------------|
| Button | text, width, height, bg, fg, font, command |
| Label | text, bg, fg, font, anchor |
| Entry | width, show |
| Text | width, height |
| Checkbutton | text, variable |
| Radiobutton | text, variable, value |
| Listbox | height, selectmode |
| Scale | from_, to, orient, length |
| Frame | container region |

### Features

1. **Toolbox → Canvas**: Drag widgets from palette, drop onto canvas
2. **Canvas interaction**: Click to select, drag to move, handles to resize
3. **Property Panel**: Edit selected widget properties in real-time
4. **Code Preview**: View generated Tkinter code (place() layout)
5. **Python Runner**: Click "Preview" to run actual Tkinter window
6. **Save/Load**: Download/upload JSON project files

### Not in MVP

- pack/grid layout managers (MVP uses place() only)
- Widget nesting (Frame children)
- Undo/redo
- Multi-select
- Custom widget support

## UX Flow

1. Toolbox에서 위젯 선택 → Canvas에 드래그앤드롭 배치
2. Canvas에서 위젯 클릭 → 선택 + 리사이즈 핸들 표시
3. PropertyPanel에서 속성 편집 → Canvas에 즉시 반영
4. "코드 생성" → CodePreview에 Tkinter 코드 표시
5. "미리보기" → FastAPI가 코드 실행, 실제 Tkinter 윈도우 팝업
6. "저장" → JSON 다운로드 / "불러오기" → JSON 업로드

## Dev Commands

```bash
# Run both frontend + backend
python dev.py

# Frontend only
cd frontend && npm run dev

# Backend only
cd backend && uvicorn app.main:app --reload
```

## Conventions

- Widget proxy property names match Tkinter constructor kwargs
- All canvas coordinates are integers (pixel-based for place())
- Generated code is PEP 8 compliant with no runtime designer dependency
- Korean comments acceptable for design intent clarification
