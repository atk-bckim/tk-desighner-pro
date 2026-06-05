import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useDesignerStore } from "../store/designerStore";
import type { OutputRecord } from "../types/output";
import type { NonVisualType } from "../types/widgets";
import { TEMPLATES } from "../templates/index";
import { useProjectCommands } from "../hooks/useProjectCommands";
import {
  CheckIcon,
  ExportIcon,
  FolderOpenIcon,
  MessageIcon,
  MoreIcon,
  PaletteIcon,
  PanelIcon,
  PlayIcon,
  RedoIcon,
  SaveIcon,
  TimerIcon,
  UndoIcon,
  UploadIcon,
} from "./icons";
import { IconButton, StatusChip, TextButton } from "./ui";
import { ResourcePanel } from "./ResourcePanel";
import { VariablePanel } from "./VariablePanel";
import { TemplateIcon } from "./templateIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const NON_VISUAL_COMPONENTS: { type: NonVisualType; Icon: IconComponent }[] = [
  { type: "Timer", Icon: TimerIcon },
  { type: "FileDialog", Icon: FolderOpenIcon },
  { type: "ColorChooser", Icon: PaletteIcon },
  { type: "MessageBox", Icon: MessageIcon },
];

const dropdownWrapClass = "absolute left-0 top-full z-[60] hidden pt-1 group-hover:block group-focus-within:block";
const dropdownClass = "min-w-44 rounded-md border border-[var(--td-border)] bg-[var(--td-panel-raised)] py-1 shadow-[var(--td-shadow-panel)]";
const dropdownItemClass = "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)] focus:bg-[var(--td-panel-soft)] focus:text-[var(--td-text)] focus:outline-none";
const mobileMenuClass = "absolute right-0 top-full z-[80] mt-2 max-h-[calc(100vh-4rem)] w-[calc(100vw-1.5rem)] max-w-sm overflow-y-auto rounded-md border border-[var(--td-border)] bg-[var(--td-panel-raised)] py-2 shadow-[var(--td-shadow-panel)]";
const mobileItemClass = "flex h-8 w-full items-center gap-2 px-3 text-left text-[11px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)] focus:bg-[var(--td-panel-soft)] focus:text-[var(--td-text)] focus:outline-none disabled:opacity-35";

interface CommandBarProps {
  addOutput: (record: Omit<OutputRecord, "id" | "createdAt">) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

function MobileMenuSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--td-border)] py-1 last:border-b-0">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase text-[var(--td-text-subtle)]">{label}</div>
      {children}
    </div>
  );
}

function MobileMenuItem({
  checked,
  children,
  disabled,
  icon,
  onClick,
}: {
  checked?: boolean;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  onClick: () => void;
}) {
  const menuItemRole = checked === undefined ? "menuitem" : "menuitemcheckbox";

  return (
    <button
      type="button"
      role={menuItemRole}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={mobileItemClass}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--td-text-subtle)]">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (mobileMenuRef.current?.contains(event.target as Node)) return;
      setMobileMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleLoadTemplate = (key: string) => {
    snapshot();
    loadTemplate(key);
  };

  const runMobileAction = (action: () => void | Promise<void>) => {
    void action();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="relative z-40 h-12 shrink-0 overflow-visible border-b border-[var(--td-border)] bg-[var(--td-panel)] shadow-[var(--td-shadow-panel)]">
        <div className="flex h-full min-w-0 items-center gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-[11px] font-bold text-cyan-100">TD</div>
            <div className="min-w-0">
              <div className="hidden text-[10px] uppercase text-[var(--td-text-subtle)] sm:block">Tkinter Designer Pro</div>
              <input
                className="h-5 w-36 max-w-[42vw] rounded border border-transparent bg-transparent text-[12px] font-semibold text-[var(--td-text)] outline-none transition-colors focus:border-[var(--td-accent-border)] focus:bg-[var(--td-bg)] focus:px-1 sm:w-44"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                aria-label="Project name"
              />
            </div>
          </div>

          <div className="hidden h-6 w-px bg-[var(--td-border)] lg:block" />

          <div className="hidden items-center gap-1 lg:flex">
            <IconButton label="Save project" onClick={saveProject}><SaveIcon className="h-4 w-4" /></IconButton>
            <IconButton label="Load project" onClick={loadProject}><UploadIcon className="h-4 w-4" /></IconButton>
            <IconButton label="Undo" onClick={undo} disabled={undoStackLen === 0}><UndoIcon className="h-4 w-4" /></IconButton>
            <IconButton label="Redo" onClick={redo} disabled={redoStackLen === 0}><RedoIcon className="h-4 w-4" /></IconButton>
          </div>

          <div className="hidden h-6 w-px bg-[var(--td-border)] lg:block" />

          <div className="hidden items-center gap-2 lg:flex">
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
                      onClick={() => handleLoadTemplate(key)}
                      role="menuitem"
                    >
                      <TemplateIcon templateKey={key} />
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
                  {NON_VISUAL_COMPONENTS.map(({ type, Icon }) => (
                    <button
                      key={type}
                      type="button"
                      className={dropdownItemClass}
                      onClick={() => addNonVisual(type)}
                      role="menuitem"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <TextButton variant={tabOrderMode ? "warning" : "ghost"} onClick={toggleTabOrderMode} aria-pressed={tabOrderMode}>Tab Order</TextButton>
            <TextButton variant="ghost" onClick={() => setVarPanelOpen(true)}>Variables</TextButton>
            <TextButton variant="ghost" onClick={() => setResPanelOpen(true)}>Images</TextButton>
          </div>

          <div className="flex-1" />

          <div className="hidden items-center gap-1 lg:flex">
            <IconButton label={leftPanelOpen ? "Hide studio rail" : "Show studio rail"} onClick={onToggleLeftPanel}><PanelIcon className="h-4 w-4" /></IconButton>
            <IconButton label={rightPanelOpen ? "Hide inspector" : "Show inspector"} onClick={onToggleRightPanel}><PanelIcon className="h-4 w-4 rotate-180" /></IconButton>
            <TextButton variant="primary" onClick={previewProject}><PlayIcon className="h-4 w-4" />Preview</TextButton>
            <TextButton variant="warning" onClick={validateProject}><CheckIcon className="h-4 w-4" />Validate</TextButton>
            <TextButton variant="success" onClick={exportPython}><ExportIcon className="h-4 w-4" />Export</TextButton>
          </div>

          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <TextButton variant="primary" onClick={previewProject}><PlayIcon className="h-4 w-4" />Preview</TextButton>
            <div className="relative" ref={mobileMenuRef}>
              <IconButton
                label="More commands"
                aria-haspopup="menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                <MoreIcon className="h-4 w-4" />
              </IconButton>
              {mobileMenuOpen && (
                <div className={mobileMenuClass} role="menu" aria-label="More commands">
                  <MobileMenuSection label="Project">
                    <MobileMenuItem icon={<SaveIcon className="h-4 w-4" />} onClick={() => runMobileAction(saveProject)}>Save project</MobileMenuItem>
                    <MobileMenuItem icon={<UploadIcon className="h-4 w-4" />} onClick={() => runMobileAction(loadProject)}>Load project</MobileMenuItem>
                    <MobileMenuItem icon={<UndoIcon className="h-4 w-4" />} disabled={undoStackLen === 0} onClick={() => runMobileAction(undo)}>Undo</MobileMenuItem>
                    <MobileMenuItem icon={<RedoIcon className="h-4 w-4" />} disabled={redoStackLen === 0} onClick={() => runMobileAction(redo)}>Redo</MobileMenuItem>
                  </MobileMenuSection>

                  <MobileMenuSection label="View">
                    <MobileMenuItem checked={snapEnabled} onClick={() => runMobileAction(toggleSnap)}>Snap {snapEnabled ? "on" : "off"}</MobileMenuItem>
                    <MobileMenuItem checked={tabOrderMode} onClick={() => runMobileAction(toggleTabOrderMode)}>Tab Order</MobileMenuItem>
                    <MobileMenuItem icon={<PanelIcon className="h-4 w-4" />} onClick={() => runMobileAction(onToggleLeftPanel)}>
                      {leftPanelOpen ? "Hide studio rail" : "Show studio rail"}
                    </MobileMenuItem>
                    <MobileMenuItem icon={<PanelIcon className="h-4 w-4 rotate-180" />} onClick={() => runMobileAction(onToggleRightPanel)}>
                      {rightPanelOpen ? "Hide inspector" : "Show inspector"}
                    </MobileMenuItem>
                  </MobileMenuSection>

                  <MobileMenuSection label="Templates">
                    {Object.entries(TEMPLATES).map(([key, template]) => (
                      <MobileMenuItem
                        key={key}
                        icon={<TemplateIcon templateKey={key} />}
                        onClick={() => runMobileAction(() => handleLoadTemplate(key))}
                      >
                        {template.label}
                      </MobileMenuItem>
                    ))}
                  </MobileMenuSection>

                  <MobileMenuSection label="Components">
                    {NON_VISUAL_COMPONENTS.map(({ type, Icon }) => (
                      <MobileMenuItem
                        key={type}
                        icon={<Icon className="h-4 w-4" />}
                        onClick={() => runMobileAction(() => addNonVisual(type))}
                      >
                        {type}
                      </MobileMenuItem>
                    ))}
                  </MobileMenuSection>

                  <MobileMenuSection label="Assets">
                    <MobileMenuItem onClick={() => runMobileAction(() => setVarPanelOpen(true))}>Variables</MobileMenuItem>
                    <MobileMenuItem onClick={() => runMobileAction(() => setResPanelOpen(true))}>Images</MobileMenuItem>
                  </MobileMenuSection>

                  <MobileMenuSection label="Output">
                    <MobileMenuItem icon={<CheckIcon className="h-4 w-4" />} onClick={() => runMobileAction(validateProject)}>Validate</MobileMenuItem>
                    <MobileMenuItem icon={<ExportIcon className="h-4 w-4" />} onClick={() => runMobileAction(exportPython)}>Export</MobileMenuItem>
                    <div className="px-3 py-1 text-[10px] text-[var(--td-text-subtle)]">
                      {Math.round(zoom * 100)}% / {widgetCount} widgets
                    </div>
                  </MobileMenuSection>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {varPanelOpen && <VariablePanel onClose={() => setVarPanelOpen(false)} />}
      {resPanelOpen && <ResourcePanel onClose={() => setResPanelOpen(false)} />}
    </>
  );
}
