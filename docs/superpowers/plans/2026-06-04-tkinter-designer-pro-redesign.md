# Tkinter Designer Pro Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Tkinter Designer workspace into a commercial-grade professional tool UI using the approved `Precision Studio` direction.

**Architecture:** Keep the existing Zustand state, widget model, backend API, and Tkinter code generation intact. Add a small frontend design system, centralize project command payloads, then replace the current loose shell with a professional command bar, studio rail, canvas workspace, inspector, and output dock.

**Tech Stack:** React 19, TypeScript, Vite 8, Zustand, dnd-kit, Tailwind CSS 4 via `@tailwindcss/vite`, FastAPI backend unchanged.

---

## Approved Spec

Use [2026-06-04-tkinter-designer-pro-redesign-design.md](/Users/byeong-cheolkim/dev/tk-designer_02/docs/superpowers/specs/2026-06-04-tkinter-designer-pro-redesign-design.md) as the source of truth.

## File Structure And Responsibilities

- `frontend/src/index.css`: global `Precision Studio` tokens, base typography, scrollbars, focus rings, reusable utility classes.
- `frontend/src/components/icons.tsx`: small custom SVG icon set for the app chrome; avoids emoji/text glyphs in new UI.
- `frontend/src/components/ui.tsx`: shared UI primitives for buttons, tabs, panel headers, sections, fields, status chips, and empty states.
- `frontend/src/utils/projectPayload.ts`: maps current store/project state into backend snake_case payloads for preview, validate, and export.
- `frontend/src/types/output.ts`: durable output dock record types for validation, preview, export, and log messages.
- `frontend/src/hooks/useProjectCommands.ts`: save/load/preview/validate/export commands with toast and output record hooks.
- `frontend/src/components/CommandBar.tsx`: replaces `Toolbar` as the global top command surface.
- `frontend/src/components/StudioRail.tsx`: replaces simultaneous `Toolbox` + `ObjectTree` with a docked rail and active surface for Widgets, Layers, Assets, Variables, Components.
- `frontend/src/components/Canvas.tsx`: receives visual polish, empty state, better workspace surface, refined selection handles, and improved canvas HUD styling.
- `frontend/src/components/InspectorPanel.tsx`: replaces `PropertyPanel` with root, single-select, and multi-select inspector states grouped by intent.
- `frontend/src/components/OutputDock.tsx`: replaces the current `CodePreview` chrome with Code, Validation, Logs, and Export Preview tabs while preserving generated code display.
- `frontend/src/components/Toast.tsx`: keeps toast behavior but splits exported imperative helper to satisfy React Fast Refresh lint.
- `frontend/src/components/toastBus.ts`: stores `showToast` imperative helper outside a component file.
- `frontend/src/components/EventEditorModal.tsx`: fixes current hook/lint ordering before the redesign depends on clean verification.
- `frontend/src/App.tsx`: composes the new shell and routes shared output records between command bar and output dock.
- `frontend/src/components/Toolbar.tsx`, `frontend/src/components/Toolbox.tsx`, `frontend/src/components/ObjectTree.tsx`, `frontend/src/components/PropertyPanel.tsx`, `frontend/src/components/CodePreview.tsx`: keep during migration; remove or leave unused only after replacement is complete.

## Task 1: Clean Verification Baseline

**Files:**
- Create: `frontend/src/components/toastBus.ts`
- Modify: `frontend/src/components/Toast.tsx`
- Modify: `frontend/src/components/Toolbar.tsx`
- Modify: `frontend/src/components/EventEditorModal.tsx`
- Modify: `frontend/src/components/Canvas.tsx`

- [ ] **Step 1: Move the toast imperative export out of `Toast.tsx`**

Create `frontend/src/components/toastBus.ts`:

```ts
export type ToastType = "success" | "error" | "warning";

let toastId = 0;
let addToastFn: ((id: number, message: string, type: ToastType) => void) | null = null;

export function registerToastHandler(
  handler: ((id: number, message: string, type: ToastType) => void) | null,
) {
  addToastFn = handler;
}

export function showToast(message: string, type: ToastType = "success") {
  addToastFn?.(++toastId, message, type);
}
```

- [ ] **Step 2: Update `Toast.tsx` to export only the component**

Replace the current top-level imperative state with this structure:

```tsx
import { useEffect, useState } from "react";
import { registerToastHandler, type ToastType } from "./toastBus";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    registerToastHandler((id, message, type) => {
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
    });
    return () => registerToastHandler(null);
  }, []);

  const colors: Record<ToastType, string> = {
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  };

  return (
    <div className="fixed bottom-10 right-4 z-[9999] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${colors[toast.type]} rounded-md border px-3 py-2 text-xs font-medium shadow-xl backdrop-blur-sm`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update toast imports**

In `frontend/src/components/Toolbar.tsx`, change:

```ts
import { showToast } from "./Toast";
```

to:

```ts
import { showToast } from "./toastBus";
```

- [ ] **Step 4: Fix EventEditor hook ordering**

In `frontend/src/components/EventEditorModal.tsx`, move `currentCode` and `handleCodeChange` above the CodeMirror `useEffect`. The order inside the component should be:

```tsx
  const currentCode = activeEvent ? codeMap[activeEvent] ?? existingEvents[activeEvent] ?? "" : "";

  const handleCodeChange = useCallback(
    (value: string) => {
      if (!activeEvent) return;
      setCodeMap((prev) => ({ ...prev, [activeEvent]: value }));
    },
    [activeEvent],
  );

  useEffect(() => {
    if (!editorContainerRef.current || !activeEvent) return;
    editorViewRef.current?.destroy();
    // existing EditorState.create block remains here
  }, [activeEvent, currentCode, handleCodeChange]);
```

Inside the effect body, keep the current `EditorState.create` extensions, but remove the `eslint-disable-line react-hooks/exhaustive-deps` comment.

- [ ] **Step 5: Fix Canvas hook dependencies without changing behavior**

In `frontend/src/components/Canvas.tsx`, include `onSnapshot` and `widget` in the `handleMouseDown` and resize callback dependency arrays. If including the whole `widget` causes noisy rerenders during testing, replace the callback body references with destructured constants defined before the callback:

```tsx
const { id, x, y, width, height, locked } = widget;
```

Then use those constants in dependency arrays. The callback behavior must remain the same.

- [ ] **Step 6: Verify baseline**

Run:

```bash
cd frontend && npm run lint
```

Expected: no lint errors. Warnings are acceptable only if they are unrelated to files touched in this task and are recorded before commit.

Run:

```bash
cd frontend && npm run build
```

Expected: TypeScript build and Vite build complete. A Vite chunk-size warning is acceptable.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/toastBus.ts frontend/src/components/Toast.tsx frontend/src/components/Toolbar.tsx frontend/src/components/EventEditorModal.tsx frontend/src/components/Canvas.tsx
git commit -m "fix: clean frontend verification baseline"
```

## Task 2: Add Precision Studio Design System

**Files:**
- Create: `frontend/src/components/icons.tsx`
- Create: `frontend/src/components/ui.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add global tokens**

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  --td-bg: #0d1117;
  --td-bg-elevated: #111827;
  --td-panel: #151b23;
  --td-panel-raised: #1b2430;
  --td-panel-soft: #202938;
  --td-canvas-surround: #090d13;
  --td-border: #2b3442;
  --td-border-strong: #3c4656;
  --td-text: #e5edf7;
  --td-text-muted: #93a4b7;
  --td-text-subtle: #607084;
  --td-accent: #18c6e6;
  --td-accent-soft: rgba(24, 198, 230, 0.14);
  --td-accent-border: rgba(24, 198, 230, 0.44);
  --td-success: #20c997;
  --td-warning: #f6b73c;
  --td-danger: #f05252;
  --td-shadow-panel: 0 16px 40px rgba(0, 0, 0, 0.28);
  --td-radius-sm: 4px;
  --td-radius-md: 6px;
  --td-radius-lg: 8px;
  --td-font-ui: "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --td-font-mono: "SFMono-Regular", "Cascadia Code", "Roboto Mono", Consolas, monospace;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--td-bg);
  color: var(--td-text);
  font-family: var(--td-font-ui);
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
}

button,
input,
select,
textarea {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

:focus-visible {
  outline: 2px solid var(--td-accent);
  outline-offset: 2px;
}

::selection {
  background: rgba(24, 198, 230, 0.28);
}

::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #2c3747;
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: #3a4658;
  border: 2px solid transparent;
  background-clip: padding-box;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 2: Add shared icons**

Create `frontend/src/components/icons.tsx`:

```tsx
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SaveIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 4.5h10.5L16 6v10H4z" /><path {...strokeProps} d="M7 4.5v4h7" /><path {...strokeProps} d="M7 16v-5h6v5" /></IconBase>;
}

export function UploadIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 15V5" /><path {...strokeProps} d="M6.5 8.5 10 5l3.5 3.5" /><path {...strokeProps} d="M4 15.5h12" /></IconBase>;
}

export function UndoIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M8 6H4v4" /><path {...strokeProps} d="M4 6l5.2 5.2A4.2 4.2 0 0 0 16 8.2" /></IconBase>;
}

export function RedoIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M12 6h4v4" /><path {...strokeProps} d="m16 6-5.2 5.2A4.2 4.2 0 0 1 4 8.2" /></IconBase>;
}

export function PlayIcon(props: IconProps) {
  return <IconBase {...props}><path fill="currentColor" d="M6.5 4.9v10.2c0 .7.8 1.1 1.4.7l7.4-5.1c.5-.4.5-1.1 0-1.4L7.9 4.2c-.6-.4-1.4 0-1.4.7Z" /></IconBase>;
}

export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="m4.5 10.4 3.2 3.2 7.8-8" /></IconBase>;
}

export function ExportIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 3.8v8.5" /><path {...strokeProps} d="M6.5 8.8 10 12.3l3.5-3.5" /><path {...strokeProps} d="M4.5 15.5h11" /></IconBase>;
}

export function PanelIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M3.5 4h13v12h-13z" /><path {...strokeProps} d="M7.2 4v12" /></IconBase>;
}

export function WidgetIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 4h6v6H4z" /><path {...strokeProps} d="M10 10h6v6h-6z" /><path {...strokeProps} d="M12.5 4H16v3.5" /><path {...strokeProps} d="M4 12.5V16h3.5" /></IconBase>;
}

export function LayersIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="m10 3.5 7 4-7 4-7-4z" /><path {...strokeProps} d="m3 11 7 4 7-4" /></IconBase>;
}

export function AssetIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 5h12v10H4z" /><path {...strokeProps} d="m6 13 3-3 2 2 2.5-3 2.5 4" /></IconBase>;
}

export function VariableIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 14c2.5-4.7 3.9-7.4 4.1-8 .2-.6.1-1.1-.3-1.4-.7-.6-2 .1-2.7 1" /><path {...strokeProps} d="M8 10c1.2 2.5 2.5 4 3.8 4 1 0 1.9-.7 2.8-2" /><path {...strokeProps} d="m13 7 3 3" /><path {...strokeProps} d="m16 7-3 3" /></IconBase>;
}

export function ComponentIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M7 4.5h6l3 5.5-3 5.5H7L4 10z" /><path {...strokeProps} d="M10 7v6" /><path {...strokeProps} d="M7 10h6" /></IconBase>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M9 14.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" /><path {...strokeProps} d="m13 13 3 3" /></IconBase>;
}
```

- [ ] **Step 3: Add shared UI primitives**

Create `frontend/src/components/ui.tsx`:

```tsx
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--td-text-muted)] transition-colors hover:border-[var(--td-border-strong)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)] disabled:opacity-35 ${className}`}
      {...props}
    >
      <span className="h-4 w-4">{children}</span>
    </button>
  );
}

export function TextButton({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "primary" | "success" | "warning" | "danger" }) {
  const variants = {
    ghost: "border-[var(--td-border)] bg-[var(--td-panel)] text-[var(--td-text-muted)] hover:border-[var(--td-border-strong)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]",
    primary: "border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100 hover:bg-cyan-400/20",
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    danger: "border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25",
  };
  return <button className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors disabled:opacity-35 ${variants[variant]} ${className}`} {...props} />;
}

export function PanelHeader({ title, detail, actions }: { title: string; detail?: string; actions?: ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-[var(--td-border)] px-3">
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase text-[var(--td-text)]">{title}</div>
        {detail && <div className="truncate text-[10px] text-[var(--td-text-subtle)]">{detail}</div>}
      </div>
      {actions && <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--td-border)] px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase text-[var(--td-text-subtle)]">{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-[var(--td-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-7 w-full rounded-md border border-[var(--td-border)] bg-[var(--td-bg)] px-2 text-[11px] text-[var(--td-text)] placeholder:text-[var(--td-text-subtle)] focus:border-[var(--td-accent)] focus:outline-none" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-7 w-full rounded-md border border-[var(--td-border)] bg-[var(--td-bg)] px-2 text-[11px] text-[var(--td-text)] focus:border-[var(--td-accent)] focus:outline-none" {...props} />;
}

export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "border-[var(--td-border)] bg-[var(--td-panel)] text-[var(--td-text-muted)]",
    accent: "border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100",
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    danger: "border-red-400/40 bg-red-500/15 text-red-100",
  };
  return <span className={`inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--td-border)] bg-[var(--td-panel)] px-4 py-5 text-center">
      <div className="text-[12px] font-semibold text-[var(--td-text)]">{title}</div>
      <p className="mt-1 max-w-56 text-[11px] leading-5 text-[var(--td-text-muted)]">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Verify design-system files compile**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/components/icons.tsx frontend/src/components/ui.tsx
git commit -m "feat: add precision studio design system"
```

## Task 3: Centralize Project Commands And Output Records

**Files:**
- Create: `frontend/src/types/output.ts`
- Create: `frontend/src/utils/projectPayload.ts`
- Create: `frontend/src/hooks/useProjectCommands.ts`
- Modify: `frontend/src/components/Toolbar.tsx`

- [ ] **Step 1: Add output record types**

Create `frontend/src/types/output.ts`:

```ts
export type OutputKind = "validation" | "preview" | "export" | "log";
export type OutputTone = "info" | "success" | "warning" | "error";

export interface OutputRecord {
  id: string;
  kind: OutputKind;
  tone: OutputTone;
  title: string;
  message: string;
  createdAt: number;
  details?: string[];
}
```

- [ ] **Step 2: Centralize backend payload mapping**

Create `frontend/src/utils/projectPayload.ts`:

```ts
import type { Project, WidgetInstance } from "../types/widgets";

function mapWidgetForApi(widget: WidgetInstance) {
  return {
    id: widget.id,
    type: widget.type,
    name: widget.name,
    parent_id: widget.parentId,
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
    props: widget.props,
    bindings: widget.bindings || {},
    events: widget.events || {},
    layout_manager: widget.layoutManager ?? "place",
    grid_row: widget.gridRow ?? null,
    grid_col: widget.gridCol ?? null,
    grid_row_span: widget.gridRowSpan ?? null,
    grid_col_span: widget.gridColSpan ?? null,
    grid_sticky: widget.gridSticky ?? null,
    grid_pad_x: widget.gridPadX ?? null,
    grid_pad_y: widget.gridPadY ?? null,
  };
}

export function projectToApiPayload(project: Project, tkTheme: string) {
  return {
    name: project.name,
    canvas_width: project.canvasWidth,
    canvas_height: project.canvasHeight,
    tk_theme: tkTheme,
    widgets: project.widgets.map(mapWidgetForApi),
    menu_bar: project.menuBar,
    root_bg: project.rootBg ?? "",
    root_resizable: project.rootResizable ?? true,
    variables: project.variables ?? [],
    non_visuals: project.nonVisuals ?? [],
    resources: (project.resources ?? []).map((resource) => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      data_url: resource.dataUrl,
    })),
  };
}
```

- [ ] **Step 3: Add project command hook**

Create `frontend/src/hooks/useProjectCommands.ts`:

```ts
import { useCallback } from "react";
import { showToast } from "../components/toastBus";
import type { OutputRecord } from "../types/output";
import { projectToApiPayload } from "../utils/projectPayload";
import { useDesignerStore } from "../store/designerStore";

type AddOutput = (record: Omit<OutputRecord, "id" | "createdAt">) => void;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useProjectCommands(addOutput: AddOutput) {
  const addRecord = useCallback((record: Omit<OutputRecord, "id" | "createdAt">) => {
    addOutput(record);
  }, [addOutput]);

  const saveProject = useCallback(() => {
    const project = useDesignerStore.getState().exportProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name}.tkdesigner.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Project saved");
    addRecord({ kind: "log", tone: "success", title: "Project saved", message: `${project.name}.tkdesigner.json downloaded.` });
  }, [addRecord]);

  const loadProject = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.tkdesigner.json";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        try {
          const project = JSON.parse(readerEvent.target?.result as string);
          useDesignerStore.getState().loadProject(project);
          showToast("Project loaded");
          addRecord({ kind: "log", tone: "success", title: "Project loaded", message: file.name });
        } catch {
          showToast("Invalid project file", "error");
          addRecord({ kind: "log", tone: "error", title: "Load failed", message: `${file.name} is not a valid project file.` });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addRecord]);

  const validateProject = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      const data = await response.json();
      const errors = Array.isArray(data.errors) ? data.errors : [];
      addRecord({
        kind: "validation",
        tone: errors.length > 0 ? "warning" : "success",
        title: errors.length > 0 ? `${errors.length} validation issues` : "Validation passed",
        message: errors.length > 0 ? "Review generated-code issues before export." : "No validation errors were reported.",
        details: errors,
      });
      showToast(errors.length > 0 ? `${errors.length} validation issues` : "Validation passed", errors.length > 0 ? "warning" : "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation request failed";
      addRecord({ kind: "validation", tone: "error", title: "Validation failed", message });
      showToast(`Validation failed: ${message}`, "error");
    }
  }, [addRecord]);

  const previewProject = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(errorBody.detail || `HTTP ${response.status}`);
      }
      const data = await response.json().catch(() => null);
      const message = data?.warning ?? "Tkinter preview launched.";
      addRecord({ kind: "preview", tone: data?.warning ? "warning" : "success", title: data?.warning ? "Preview code only" : "Preview launched", message });
      showToast(data?.warning ? data.warning : "Preview launched", data?.warning ? "warning" : "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preview failed";
      addRecord({ kind: "preview", tone: "error", title: "Preview failed", message });
      showToast(`Preview failed: ${message}`, "error");
    }
  }, [addRecord]);

  const exportPython = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/ /g, "_")}.py`;
      anchor.click();
      URL.revokeObjectURL(url);
      addRecord({ kind: "export", tone: "success", title: "Python exported", message: `${project.name.replace(/ /g, "_")}.py downloaded.` });
      showToast("Exported successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      addRecord({ kind: "export", tone: "error", title: "Export failed", message });
      showToast(`Export failed: ${message}`, "error");
    }
  }, [addRecord]);

  return {
    saveProject,
    loadProject,
    validateProject,
    previewProject,
    exportPython,
    createId,
  };
}
```

- [ ] **Step 4: Keep old Toolbar compiling until CommandBar replaces it**

In `frontend/src/components/Toolbar.tsx`, replace direct duplicated API payload creation by importing `projectToApiPayload`. Update `handlePreview` and `handleExport` to use:

```ts
const store = useDesignerStore.getState();
body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
```

This preserves old UI behavior while reducing duplication before shell replacement.

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/output.ts frontend/src/utils/projectPayload.ts frontend/src/hooks/useProjectCommands.ts frontend/src/components/Toolbar.tsx
git commit -m "feat: centralize project commands"
```

## Task 4: Build The Professional Command Bar

**Files:**
- Create: `frontend/src/components/CommandBar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `CommandBar.tsx`**

Create a compact command bar using the new UI primitives and project command hook. The component receives output recording through props:

```tsx
import { useDesignerStore } from "../store/designerStore";
import type { OutputRecord } from "../types/output";
import { useProjectCommands } from "../hooks/useProjectCommands";
import { CheckIcon, ExportIcon, PanelIcon, PlayIcon, RedoIcon, SaveIcon, UndoIcon, UploadIcon } from "./icons";
import { IconButton, StatusChip, TextButton } from "./ui";

interface CommandBarProps {
  addOutput: (record: Omit<OutputRecord, "id" | "createdAt">) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

export function CommandBar({
  addOutput,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
}: CommandBarProps) {
  const projectName = useDesignerStore((state) => state.projectName);
  const setProjectName = useDesignerStore((state) => state.setProjectName);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const undoStackLen = useDesignerStore((state) => state.undoStack.length);
  const redoStackLen = useDesignerStore((state) => state.redoStack.length);
  const widgets = useDesignerStore((state) => state.widgets);
  const zoom = useDesignerStore((state) => state.zoom);
  const snapEnabled = useDesignerStore((state) => state.snapEnabled);
  const toggleSnap = useDesignerStore((state) => state.toggleSnap);
  const { saveProject, loadProject, validateProject, previewProject, exportPython } = useProjectCommands(addOutput);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--td-border)] bg-[var(--td-panel)] px-3 shadow-[var(--td-shadow-panel)]">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-[11px] font-bold text-cyan-100">TD</div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase text-[var(--td-text-subtle)]">Tkinter Designer Pro</div>
          <input
            className="h-5 w-44 rounded border border-transparent bg-transparent text-[12px] font-semibold text-[var(--td-text)] outline-none transition-colors focus:border-[var(--td-accent-border)] focus:bg-[var(--td-bg)] focus:px-1"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="Project name"
          />
        </div>
      </div>

      <div className="h-6 w-px bg-[var(--td-border)]" />

      <IconButton label="Save project" onClick={saveProject}><SaveIcon className="h-4 w-4" /></IconButton>
      <IconButton label="Load project" onClick={loadProject}><UploadIcon className="h-4 w-4" /></IconButton>
      <IconButton label="Undo" onClick={undo} disabled={undoStackLen === 0}><UndoIcon className="h-4 w-4" /></IconButton>
      <IconButton label="Redo" onClick={redo} disabled={redoStackLen === 0}><RedoIcon className="h-4 w-4" /></IconButton>

      <div className="h-6 w-px bg-[var(--td-border)]" />

      <TextButton variant={snapEnabled ? "primary" : "ghost"} onClick={toggleSnap}>Snap</TextButton>
      <StatusChip tone="neutral">{Math.round(zoom * 100)}%</StatusChip>
      <StatusChip tone={widgets.length > 0 ? "accent" : "neutral"}>{widgets.length} widgets</StatusChip>

      <div className="flex-1" />

      <IconButton label={leftPanelOpen ? "Hide studio rail" : "Show studio rail"} onClick={onToggleLeftPanel}><PanelIcon className="h-4 w-4" /></IconButton>
      <IconButton label={rightPanelOpen ? "Hide inspector" : "Show inspector"} onClick={onToggleRightPanel}><PanelIcon className="h-4 w-4 rotate-180" /></IconButton>
      <TextButton variant="primary" onClick={previewProject}><PlayIcon className="h-4 w-4" />Preview</TextButton>
      <TextButton variant="warning" onClick={validateProject}><CheckIcon className="h-4 w-4" />Validate</TextButton>
      <TextButton variant="success" onClick={exportPython}><ExportIcon className="h-4 w-4" />Export</TextButton>
    </header>
  );
}
```

- [ ] **Step 2: Wire command bar into `App.tsx`**

In `App.tsx`, import:

```ts
import { useCallback, useState, useEffect } from "react";
import { CommandBar } from "./components/CommandBar";
import type { OutputRecord } from "./types/output";
```

Replace `Toolbar` import usage with `CommandBar`, and add:

```tsx
const [outputRecords, setOutputRecords] = useState<OutputRecord[]>([]);
const addOutput = useCallback((record: Omit<OutputRecord, "id" | "createdAt">) => {
  setOutputRecords((prev) => [
    {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
    },
    ...prev,
  ].slice(0, 80));
}, []);
```

Then render:

```tsx
<CommandBar
  addOutput={addOutput}
  leftPanelOpen={leftPanelOpen}
  rightPanelOpen={rightPanelOpen}
  onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
  onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
/>
```

Keep `outputRecords` unused until Task 8. TypeScript allows it only if it is later used in the same task; if not, add a temporary `void outputRecords;` line directly before the return and remove it in Task 8.

- [ ] **Step 3: Remove old collapse strip buttons from `App.tsx`**

Remove the two narrow collapse buttons around the left and right panels. Panel visibility is now controlled from `CommandBar`.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds and the old toolbar no longer renders.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CommandBar.tsx frontend/src/App.tsx
git commit -m "feat: add pro command bar"
```

## Task 5: Replace Dual Left Panels With Studio Rail

**Files:**
- Create: `frontend/src/components/StudioRail.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `StudioRail.tsx`**

Create a rail with five tabs. Reuse `Toolbox`, `ObjectTree`, `ResourcePanel` logic where possible, but keep the first implementation focused on professional layout and scan speed. The first pass can show Assets, Variables, and Components as embedded management summaries, with existing modals still accessible through command actions.

Use this component shell:

```tsx
import { useMemo, useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import { AssetIcon, ComponentIcon, LayersIcon, SearchIcon, VariableIcon, WidgetIcon } from "./icons";
import { EmptyState, PanelHeader, TextButton, TextInput } from "./ui";
import type { WidgetType } from "../types/widgets";
import { useDraggable } from "@dnd-kit/core";

const STUDIO_TABS = [
  { id: "widgets", label: "Widgets", icon: WidgetIcon },
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "assets", label: "Assets", icon: AssetIcon },
  { id: "variables", label: "Variables", icon: VariableIcon },
  { id: "components", label: "Components", icon: ComponentIcon },
] as const;

type StudioTab = typeof STUDIO_TABS[number]["id"];
```

Add widget groups based on the existing `Toolbox` group data, but include a search filter:

```tsx
const WIDGET_GROUPS: { label: string; types: WidgetType[] }[] = [
  { label: "Container", types: ["Frame", "LabelFrame", "Notebook", "Toplevel"] },
  { label: "Display", types: ["Label", "Button", "Checkbutton", "Radiobutton", "Progressbar"] },
  { label: "Input", types: ["Entry", "Text", "Spinbox", "OptionMenu", "Combobox"] },
  { label: "Advanced", types: ["Listbox", "Scale", "Scrollbar", "Separator", "Treeview", "Menubutton", "Message", "Sizegrip"] },
];
```

Implement `StudioRail` with:

- 48px vertical rail.
- 260px active panel.
- Widgets tab with search and draggable rows.
- Layers tab with project root and widget tree.
- Assets tab with image count and thumbnails.
- Variables tab with variable count and rows.
- Components tab with non-visual components and add buttons.

- [ ] **Step 2: Use dnd-kit for widget rows**

Each widget row must preserve current drag behavior:

```tsx
function WidgetPaletteItem({ type }: { type: WidgetType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { fromToolbox: true, widgetType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Drag to add ${type} widget`}
      className={`flex cursor-grab items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-[11px] transition-colors ${
        isDragging ? "opacity-40" : "text-[var(--td-text-muted)] hover:border-[var(--td-border)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
      }`}
    >
      <span>{type}</span>
      <span className="font-mono text-[10px] text-[var(--td-text-subtle)]">{type.slice(0, 3)}</span>
    </div>
  );
}
```

- [ ] **Step 3: Wire StudioRail into `App.tsx`**

Replace:

```tsx
{leftPanelOpen && (
  <>
    <Toolbox />
    <ObjectTree />
  </>
)}
```

with:

```tsx
{leftPanelOpen && <StudioRail />}
```

Remove unused `Toolbox` and `ObjectTree` imports from `App.tsx`.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds, dragging a widget from the Widgets tab still uses `fromToolbox` and `widgetType`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StudioRail.tsx frontend/src/App.tsx
git commit -m "feat: add studio rail workspace"
```

## Task 6: Upgrade Canvas Workspace Visual UX

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`
- Modify: `frontend/src/components/Ruler.tsx`

- [ ] **Step 1: Change canvas surround**

In `Canvas.tsx`, replace the outer workspace class:

```tsx
className="flex-1 overflow-auto bg-[#141422] p-4"
```

with:

```tsx
className="flex-1 overflow-auto bg-[radial-gradient(circle_at_50%_0%,rgba(24,198,230,0.08),transparent_32%),var(--td-canvas-surround)] p-5"
```

Keep the same panning handlers.

- [ ] **Step 2: Add empty canvas state**

Inside the scaled canvas content, before `{rootWidgets.map(w => renderWidget(w))}`, render an empty state when no widgets exist:

```tsx
{rootWidgets.length === 0 && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-[320px] rounded-lg border border-[var(--td-border)] bg-white/90 px-5 py-4 text-center shadow-xl">
      <div className="text-[13px] font-semibold text-slate-800">Start designing your Tkinter window</div>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">Drag widgets from the Studio Rail or load a template from the command bar.</p>
    </div>
  </div>
)}
```

- [ ] **Step 3: Refine selection and handles**

In `WidgetRenderer`, replace selected widget ring/handles with cyan-focused styles:

```tsx
${isSelected ? "ring-2 ring-[var(--td-accent)] ring-offset-2 ring-offset-[var(--td-canvas-surround)]" : ""}
```

Replace resize handle classes with:

```tsx
className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-cyan-200 bg-[var(--td-accent)] shadow"
```

Apply equivalent positions for the other three handles.

- [ ] **Step 4: Refine drag HUD and guide colors**

Change drag info badge to:

```tsx
className="absolute -top-7 left-0 z-50 whitespace-nowrap rounded-md border border-[var(--td-accent-border)] bg-[var(--td-bg)] px-2 py-1 font-mono text-[10px] text-cyan-100 shadow-xl pointer-events-none"
```

Change smart guide line color from red to amber:

```tsx
className="absolute top-0 bottom-0 w-px bg-[var(--td-warning)] pointer-events-none z-50"
```

and:

```tsx
className="absolute left-0 right-0 h-px bg-[var(--td-warning)] pointer-events-none z-50"
```

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Canvas.tsx frontend/src/components/Ruler.tsx
git commit -m "feat: upgrade canvas workspace visuals"
```

## Task 7: Build The Professional Inspector

**Files:**
- Create: `frontend/src/components/InspectorPanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `InspectorPanel.tsx`**

Start by porting the existing `PropertyPanel` logic into a more structured shell. Preserve all editable behavior from `PropertyPanel`.

Use this component structure:

```tsx
import { useMemo, useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import { getEditableProps } from "../utils/widgetDefaults";
import { FieldLabel, PanelHeader, PanelSection, SelectInput, TextButton, TextInput } from "./ui";
import { FontPicker } from "./FontPicker";

type InspectorTab = "layout" | "style" | "data" | "events" | "advanced";

const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
  { id: "layout", label: "Layout" },
  { id: "style", label: "Style" },
  { id: "data", label: "Data" },
  { id: "events", label: "Events" },
  { id: "advanced", label: "Advanced" },
];
```

Inspector states:

- No selection: render root window settings, theme, menu bar.
- Multi selection: render align, distribute, sizing, common props, delete all.
- Single selection: render widget name/type header, tab buttons, and active tab content.

- [ ] **Step 2: Group single-selection fields**

Use the existing `getEditableProps(widget.type)` output and split fields into tabs:

```ts
const STYLE_KEYS = new Set(["bg", "fg", "font", "relief", "bd", "anchor", "justify", "wraplength"]);
const DATA_KEYS = new Set(["text", "textvariable", "variable", "values", "from_", "to", "increment", "maximum", "mode", "state", "show", "selectmode", "width", "height"]);
const EVENT_KEYS = new Set(["command"]);
```

The `layout` tab renders place/grid controls. The `style` tab renders `STYLE_KEYS`. The `data` tab renders everything in `DATA_KEYS` and any uncategorized editable prop. The `events` tab shows a compact prompt to double-click the widget or use the existing event editor. The `advanced` tab shows notebook tabs, scrollbar binding, z-order, lock, and delete.

- [ ] **Step 3: Replace `PropertyPanel` in `App.tsx`**

Change import:

```ts
import { InspectorPanel } from "./components/InspectorPanel";
```

Replace:

```tsx
{rightPanelOpen && <PropertyPanel />}
```

with:

```tsx
{rightPanelOpen && <InspectorPanel />}
```

Remove the old `PropertyPanel` import.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds. Manual smoke check after implementation must confirm root settings, single selected widget edits, and multi-select controls still work.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/InspectorPanel.tsx frontend/src/App.tsx
git commit -m "feat: add professional inspector panel"
```

## Task 8: Replace Generated Code Panel With Output Dock

**Files:**
- Create: `frontend/src/components/OutputDock.tsx`
- Modify: `frontend/src/components/CodePreview.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `OutputDock.tsx`**

Create a dock with tabs and durable output records:

```tsx
import { useMemo, useState } from "react";
import type { OutputRecord } from "../types/output";
import { CodePreview } from "./CodePreview";
import { PanelHeader, StatusChip, TextButton } from "./ui";

type DockTab = "code" | "validation" | "logs" | "export";

interface OutputDockProps {
  records: OutputRecord[];
  onClear: () => void;
}

const TABS: { id: DockTab; label: string }[] = [
  { id: "code", label: "Code" },
  { id: "validation", label: "Validation" },
  { id: "logs", label: "Logs" },
  { id: "export", label: "Export Preview" },
];

export function OutputDock({ records, onClear }: OutputDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>("code");
  const validationRecords = useMemo(() => records.filter((record) => record.kind === "validation"), [records]);
  const logRecords = useMemo(() => records.filter((record) => record.kind !== "validation"), [records]);

  return (
    <section className="h-56 shrink-0 border-t border-[var(--td-border)] bg-[var(--td-panel)]">
      <PanelHeader
        title="Output"
        detail={`${records.length} records`}
        actions={<TextButton onClick={onClear}>Clear</TextButton>}
      />
      <div className="flex h-8 items-center gap-1 border-b border-[var(--td-border)] px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${
              activeTab === tab.id ? "bg-[var(--td-accent-soft)] text-cyan-100" : "text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="h-[calc(100%-72px)] overflow-auto">
        {activeTab === "code" && <CodePreview docked />}
        {activeTab === "validation" && <RecordList records={validationRecords} empty="Run validation to see generated-code issues." />}
        {activeTab === "logs" && <RecordList records={logRecords} empty="Preview, export, and project activity will appear here." />}
        {activeTab === "export" && <RecordList records={records.filter((record) => record.kind === "export")} empty="Export results will appear here." />}
      </div>
    </section>
  );
}

function RecordList({ records, empty }: { records: OutputRecord[]; empty: string }) {
  if (records.length === 0) {
    return <div className="px-4 py-6 text-[11px] text-[var(--td-text-subtle)]">{empty}</div>;
  }
  return (
    <div className="divide-y divide-[var(--td-border)]">
      {records.map((record) => (
        <article key={record.id} className="px-4 py-2">
          <div className="flex items-center gap-2">
            <StatusChip tone={record.tone === "error" ? "danger" : record.tone === "warning" ? "warning" : record.tone === "success" ? "success" : "neutral"}>{record.kind}</StatusChip>
            <span className="text-[12px] font-medium text-[var(--td-text)]">{record.title}</span>
            <span className="ml-auto font-mono text-[10px] text-[var(--td-text-subtle)]">{new Date(record.createdAt).toLocaleTimeString()}</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--td-text-muted)]">{record.message}</p>
          {record.details && record.details.length > 0 && (
            <ul className="mt-2 space-y-1">
              {record.details.map((detail, index) => (
                <li key={`${record.id}-${index}`} className="rounded border border-[var(--td-border)] bg-[var(--td-bg)] px-2 py-1 font-mono text-[10px] text-amber-100">{detail}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Make `CodePreview` dock-aware**

Update `CodePreview` props:

```tsx
export function CodePreview({ docked = false }: { docked?: boolean }) {
```

When `docked` is true, render only the pre/code body and copy/check controls inside a compact header. When `docked` is false, keep the current collapsible behavior for compatibility.

- [ ] **Step 3: Wire output dock into `App.tsx`**

Replace:

```tsx
<CodePreview />
```

with:

```tsx
<OutputDock records={outputRecords} onClear={() => setOutputRecords([])} />
```

Remove the `void outputRecords;` temporary line from Task 4 if it exists.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds. Manual smoke check after implementation must confirm Validate creates validation records and Code tab still shows generated code.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OutputDock.tsx frontend/src/components/CodePreview.tsx frontend/src/App.tsx
git commit -m "feat: add output dock workflow"
```

## Task 9: Final Product Polish And Responsive Check

**Files:**
- Modify: `frontend/src/components/StatusBar.tsx`
- Modify: `frontend/src/components/ComponentTray.tsx`
- Modify: `frontend/src/components/VariablePanel.tsx`
- Modify: `frontend/src/components/ResourcePanel.tsx`
- Modify: `frontend/src/components/EventEditorModal.tsx`

- [ ] **Step 1: Update status bar styling**

Replace the bright cyan status bar with a quieter product bar:

```tsx
return (
  <div className="flex h-7 shrink-0 select-none items-center gap-3 border-t border-[var(--td-border)] bg-[var(--td-bg)] px-3 font-mono text-[10px] text-[var(--td-text-muted)]">
    ...
  </div>
);
```

Use `StatusChip` for selected widget and grid state where compact enough.

- [ ] **Step 2: Replace emoji-like component icons**

In `ComponentTray.tsx`, replace `ICONS` emoji strings with short text labels or SVG icon components from `icons.tsx`. The tray should use `ComponentIcon` for every non-visual component type and show the type name as text.

- [ ] **Step 3: Align modal panels with tokens**

In `VariablePanel.tsx`, `ResourcePanel.tsx`, and `EventEditorModal.tsx`, replace hardcoded panel classes:

```tsx
bg-[#1e1e2e] border border-[#3c3c52]
```

with tokenized classes:

```tsx
bg-[var(--td-panel)] border border-[var(--td-border)]
```

Also replace close glyphs with clear text or icon buttons with `aria-label="Close"`.

- [ ] **Step 4: Verify build and lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: no lint errors.

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StatusBar.tsx frontend/src/components/ComponentTray.tsx frontend/src/components/VariablePanel.tsx frontend/src/components/ResourcePanel.tsx frontend/src/components/EventEditorModal.tsx
git commit -m "feat: polish pro workspace states"
```

## Task 10: Browser Verification And Final Handoff Commit

**Files:**
- Modify only if browser verification finds visible defects.

- [ ] **Step 1: Start the app**

Run:

```bash
python dev.py
```

Expected: backend on `http://localhost:8000`, frontend on `http://localhost:5173`.

- [ ] **Step 2: Use Browser/IAB for visual verification**

Open:

```text
http://localhost:5173
```

Check:

- Top command bar is visible and not crowded at desktop width.
- Studio Rail shows one active panel with rail tabs.
- Canvas is the visual center and empty state appears when no widgets exist.
- Inspector handles root/no selection, single selection, and multi selection.
- Output Dock shows Code, Validation, Logs, and Export Preview tabs.
- Status bar remains readable and quiet.

- [ ] **Step 3: Smoke test core workflow**

In the browser:

- Drag a `Button` from Widgets to canvas.
- Select it.
- Change its text in Inspector.
- Run Validate.
- Confirm output dock receives validation result.
- Open Code tab and confirm generated code contains the renamed button text.

- [ ] **Step 4: Mobile-sized viewport check**

Use Browser/IAB viewport tools or Playwright fallback to check a mobile-sized viewport. The app does not need to become a mobile-first editor, but it must not produce incoherent overlap. The acceptable mobile behavior is horizontal app-style workspace scrolling or panel collapse, not clipped command actions.

- [ ] **Step 5: Fix visible defects found in verification**

Only fix defects that contradict the approved spec:

- unreadable text,
- overlapping UI,
- broken drag/drop,
- missing output records,
- unusable inspector controls,
- broken preview/validate/export buttons,
- severe mobile overflow in command bar.

- [ ] **Step 6: Final verification commands**

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
python -m compileall backend/app
```

Expected:

- frontend lint has no errors,
- frontend build succeeds,
- backend compile succeeds.

- [ ] **Step 7: Commit final fixes**

If verification caused changes:

```bash
git add frontend/src backend/app
git commit -m "fix: finalize pro redesign verification"
```

If verification caused no changes, do not create an empty commit.

## Completion Criteria

The goal is not complete until current evidence proves:

- The approved design spec has been implemented across app shell, studio rail, canvas, inspector, output dock, and feedback states.
- Existing core workflows still work: add widget, select widget, edit property, validate, preview/export, inspect generated code.
- Frontend build succeeds.
- Frontend lint has no errors or any remaining issues are explicitly tied to pre-existing constraints and accepted by the user.
- Backend compile still succeeds.
- Browser/IAB inspection confirms the app reads as a coherent professional tool rather than a prototype.

Do not mark the active goal complete until these criteria are verified from the current worktree.
