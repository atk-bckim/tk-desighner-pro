import { useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import { TEMPLATES } from "../templates/index";
import { showToast } from "./toastBus";
import { VariablePanel } from "./VariablePanel";
import { ResourcePanel } from "./ResourcePanel";
import type { NonVisualType } from "../types/widgets";
import { projectToApiPayload } from "../utils/projectPayload";

export function Toolbar() {
  const { exportProject, loadProject, projectName, setProjectName, undo, redo, snapshot, removeWidget, duplicateWidget, selectedIds, snapEnabled, toggleSnap, loadTemplate, zoom, setZoom, tabOrderMode, toggleTabOrderMode, addNonVisual } =
    useDesignerStore();
  const undoStackLen = useDesignerStore((s) => s.undoStack.length);
  const redoStackLen = useDesignerStore((s) => s.redoStack.length);
  const [varPanelOpen, setVarPanelOpen] = useState(false);
  const [resPanelOpen, setResPanelOpen] = useState(false);

  const handleSave = () => {
    const project = exportProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.tkdesigner.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.tkdesigner.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const project = JSON.parse(ev.target?.result as string);
          loadProject(project);
          showToast("Project loaded");
        } catch {
          showToast("Invalid project file", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handlePreview = async () => {
    try {
      const project = exportProject();
      const store = useDesignerStore.getState();
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json().catch(() => null);
      if (data?.warning) {
        showToast(data.warning, "warning");
      } else {
        showToast("Preview launched");
      }
    } catch (err) {
      showToast("Preview failed: " + (err as Error).message, "error");
    }
  };

  const handleExport = async () => {
    try {
      const project = exportProject();
      const store = useDesignerStore.getState();
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/ /g, "_")}.py`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Exported successfully");
    } catch (err) {
      showToast("Export failed: " + (err as Error).message, "error");
    }
  };

  const btnBase = "px-2 py-1 rounded text-xs transition-colors duration-150";
  const btnGhost = `${btnBase} text-[#8888a8] hover:text-[#d4d4e8] hover:bg-[#363650]`;
  const btnSuccess = `${btnBase} bg-[#10b981] hover:bg-[#34d399] text-white`;
  const btnWarn = `${btnBase} bg-[#f59e0b] hover:bg-[#fbbf24] text-black`;

  return (
    <>
    <div className="h-10 bg-[#252536] border-b border-[#3c3c52] flex items-center px-3 gap-1 shrink-0 select-none">
      <span className="text-[#06b6d4] font-bold text-sm tracking-tight mr-2">TD</span>
      <div className="w-px h-5 bg-[#3c3c52]" />
      <input
        className="bg-[#1e1e2e] border border-[#3c3c52] px-2 py-0.5 rounded text-xs w-36 text-[#d4d4e8] focus:border-[#06b6d4] focus:outline-none transition-colors"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <button onClick={handleSave} className={btnGhost}>Save</button>
      <button onClick={handleLoad} className={btnGhost}>Load</button>
      <div className="w-px h-5 bg-[#3c3c52] mx-1" />
      <button onClick={() => undo()} disabled={undoStackLen === 0} className={`${btnGhost} disabled:opacity-20`} title="Undo (Ctrl+Z)">&#8630;</button>
      <button onClick={() => redo()} disabled={redoStackLen === 0} className={`${btnGhost} disabled:opacity-20`} title="Redo (Ctrl+Y)">&#8631;</button>
      <div className="w-px h-5 bg-[#3c3c52] mx-1" />
      <button onClick={() => { if (selectedIds.length > 0) { snapshot(); selectedIds.forEach(id => removeWidget(id)); } }} disabled={selectedIds.length === 0} className={`${btnGhost} disabled:opacity-20 text-[#ef4444] hover:text-[#f87171]`} title="Delete">&#10005;</button>
      <button onClick={() => { if (selectedIds.length > 0) { snapshot(); duplicateWidget(selectedIds[0]); } }} disabled={selectedIds.length === 0} className={`${btnGhost} disabled:opacity-20`} title="Duplicate (Ctrl+D)">&#10723;</button>
      <div className="w-px h-5 bg-[#3c3c52] mx-1" />
      <button onClick={toggleSnap} className={`${btnGhost} ${snapEnabled ? "!text-[#06b6d4] !bg-[#06b6d4]/10" : ""}`} title="Toggle Grid">&#8845;</button>
      <div className="relative group">
        <button className={btnGhost}>Templates &#9662;</button>
        <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
          <div className="bg-[#252536] border border-[#3c3c52] rounded shadow-xl py-1 min-w-40">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button key={key} className="w-full text-left px-3 py-1.5 text-xs text-[#8888a8] hover:bg-[#363650] hover:text-[#d4d4e8] flex items-center gap-2 transition-colors"
              onClick={() => { snapshot(); loadTemplate(key); }}>
              <span>{(tpl as { icon: string }).icon}</span>
              <span>{(tpl as { label: string }).label}</span>
            </button>
          ))}
          </div>
        </div>
      </div>
      <div className="relative group">
        <button className={btnGhost}>Components &#9662;</button>
        <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
          <div className="bg-[#252536] border border-[#3c3c52] rounded shadow-xl py-1 min-w-40">
            {([
              ["Timer", "\u23F1"],
              ["FileDialog", "\uD83D\uDCC2"],
              ["ColorChooser", "\uD83C\uDFA8"],
              ["MessageBox", "\uD83D\uDCAC"],
            ] as [NonVisualType, string][]).map(([type, icon]) => (
              <button key={type} className="w-full text-left px-3 py-1.5 text-xs text-[#8888a8] hover:bg-[#363650] hover:text-[#d4d4e8] flex items-center gap-2 transition-colors"
                onClick={() => addNonVisual(type)}>
                <span>{icon}</span>
                <span>{type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={toggleTabOrderMode}
        className={`${btnGhost} ${tabOrderMode ? "!text-[#f59e0b] !bg-[#f59e0b]/10" : ""}`}
        title="Tab Order"
      >
        Tab Order
      </button>
      <button onClick={() => setVarPanelOpen(true)} className={btnGhost} title="Variables">Variables</button>
      <button onClick={() => setResPanelOpen(true)} className={btnGhost} title="Images">Images</button>
      <div className="flex-1" />
      <div className="relative group">
        <button className={btnGhost}>{(zoom * 100).toFixed(0)}%</button>
        <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-50">
          <div className="bg-[#252536] border border-[#3c3c52] rounded shadow-xl py-1 min-w-24">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(z => (
              <button key={z} className="w-full text-left px-3 py-1 text-xs text-[#8888a8] hover:bg-[#363650] hover:text-[#d4d4e8] transition-colors"
                onClick={() => setZoom(z)}>
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={handlePreview} className={btnSuccess}>Preview</button>
      <button onClick={handleExport} className={btnWarn}>Export .py</button>
    </div>
    {varPanelOpen && <VariablePanel onClose={() => setVarPanelOpen(false)} />}
    {resPanelOpen && <ResourcePanel onClose={() => setResPanelOpen(false)} />}
    </>
  );
}
