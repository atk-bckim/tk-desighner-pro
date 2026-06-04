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
