import { useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import type { OutputRecord } from "../types/output";
import type { NonVisualType } from "../types/widgets";
import { TEMPLATES } from "../templates/index";
import { useProjectCommands } from "../hooks/useProjectCommands";
import { CheckIcon, ExportIcon, PanelIcon, PlayIcon, RedoIcon, SaveIcon, UndoIcon, UploadIcon } from "./icons";
import { IconButton, StatusChip, TextButton } from "./ui";
import { ResourcePanel } from "./ResourcePanel";
import { VariablePanel } from "./VariablePanel";

const NON_VISUAL_COMPONENTS: [NonVisualType, string][] = [
  ["Timer", "\u23F1"],
  ["FileDialog", "\uD83D\uDCC2"],
  ["ColorChooser", "\uD83C\uDFA8"],
  ["MessageBox", "\uD83D\uDCAC"],
];

const dropdownWrapClass = "absolute left-0 top-full z-50 hidden pt-1 group-hover:block group-focus-within:block";
const dropdownClass = "min-w-44 rounded-md border border-[var(--td-border)] bg-[var(--td-panel-raised)] py-1 shadow-[var(--td-shadow-panel)]";
const dropdownItemClass = "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)] focus:bg-[var(--td-panel-soft)] focus:text-[var(--td-text)] focus:outline-none";

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
  const [varPanelOpen, setVarPanelOpen] = useState(false);
  const [resPanelOpen, setResPanelOpen] = useState(false);
  const projectName = useDesignerStore((state) => state.projectName);
  const setProjectName = useDesignerStore((state) => state.setProjectName);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const undoStackLen = useDesignerStore((state) => state.undoStack.length);
  const redoStackLen = useDesignerStore((state) => state.redoStack.length);
  const widgetCount = useDesignerStore((state) => state.widgets.length);
  const zoom = useDesignerStore((state) => state.zoom);
  const snapEnabled = useDesignerStore((state) => state.snapEnabled);
  const toggleSnap = useDesignerStore((state) => state.toggleSnap);
  const snapshot = useDesignerStore((state) => state.snapshot);
  const loadTemplate = useDesignerStore((state) => state.loadTemplate);
  const addNonVisual = useDesignerStore((state) => state.addNonVisual);
  const tabOrderMode = useDesignerStore((state) => state.tabOrderMode);
  const toggleTabOrderMode = useDesignerStore((state) => state.toggleTabOrderMode);
  const { saveProject, loadProject, validateProject, previewProject, exportPython } = useProjectCommands(addOutput);

  return (
    <>
      <header className="h-12 shrink-0 border-b border-[var(--td-border)] bg-[var(--td-panel)] shadow-[var(--td-shadow-panel)] max-lg:overflow-x-auto lg:overflow-visible">
        <div className="flex h-full min-w-max items-center gap-2 px-3">
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

        <TextButton variant={snapEnabled ? "primary" : "ghost"} onClick={toggleSnap} aria-pressed={snapEnabled}>Snap</TextButton>
        <StatusChip tone="neutral">{Math.round(zoom * 100)}%</StatusChip>
        <StatusChip tone={widgetCount > 0 ? "accent" : "neutral"}>{widgetCount} widgets</StatusChip>

        <div className="relative group">
          <TextButton variant="ghost" aria-haspopup="menu">Templates</TextButton>
          <div className={dropdownWrapClass}>
            <div className={dropdownClass} role="menu">
              {Object.entries(TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  type="button"
                  className={dropdownItemClass}
                  onClick={() => {
                    snapshot();
                    loadTemplate(key);
                  }}
                  role="menuitem"
                >
                  <span>{template.icon}</span>
                  <span>{template.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative group">
          <TextButton variant="ghost" aria-haspopup="menu">Components</TextButton>
          <div className={dropdownWrapClass}>
            <div className={dropdownClass} role="menu">
              {NON_VISUAL_COMPONENTS.map(([type, icon]) => (
                <button
                  key={type}
                  type="button"
                  className={dropdownItemClass}
                  onClick={() => addNonVisual(type)}
                  role="menuitem"
                >
                  <span>{icon}</span>
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <TextButton variant={tabOrderMode ? "warning" : "ghost"} onClick={toggleTabOrderMode} aria-pressed={tabOrderMode}>Tab Order</TextButton>
        <TextButton variant="ghost" onClick={() => setVarPanelOpen(true)}>Variables</TextButton>
        <TextButton variant="ghost" onClick={() => setResPanelOpen(true)}>Images</TextButton>

        <div className="flex-1" />

        <IconButton label={leftPanelOpen ? "Hide studio rail" : "Show studio rail"} onClick={onToggleLeftPanel}><PanelIcon className="h-4 w-4" /></IconButton>
        <IconButton label={rightPanelOpen ? "Hide inspector" : "Show inspector"} onClick={onToggleRightPanel}><PanelIcon className="h-4 w-4 rotate-180" /></IconButton>
        <TextButton variant="primary" onClick={previewProject}><PlayIcon className="h-4 w-4" />Preview</TextButton>
        <TextButton variant="warning" onClick={validateProject}><CheckIcon className="h-4 w-4" />Validate</TextButton>
        <TextButton variant="success" onClick={exportPython}><ExportIcon className="h-4 w-4" />Export</TextButton>
        </div>
      </header>
      {varPanelOpen && <VariablePanel onClose={() => setVarPanelOpen(false)} />}
      {resPanelOpen && <ResourcePanel onClose={() => setResPanelOpen(false)} />}
    </>
  );
}
