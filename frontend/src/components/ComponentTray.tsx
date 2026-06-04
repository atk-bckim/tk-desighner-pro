import { useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import type { NonVisualComponent, NonVisualType } from "../types/widgets";
import { ComponentIcon } from "./icons";

const TYPE_LABELS: Record<NonVisualType, string> = {
  Timer: "Timer",
  FileDialog: "Dialog",
  ColorChooser: "Color",
  MessageBox: "Message",
};

function EditModal({ component, onClose }: { component: NonVisualComponent; onClose: () => void }) {
  const updateNonVisual = useDesignerStore((s) => s.updateNonVisual);
  const [props, setProps] = useState({ ...component.props });
  const [name, setName] = useState(component.name);

  const handleSave = () => {
    updateNonVisual(component.id, { name, props });
    onClose();
  };

  const setProp = (key: string, value: unknown) => {
    setProps((p) => ({ ...p, [key]: value }));
  };

  const inputCls = "w-full rounded border border-[var(--td-border)] bg-[var(--td-bg)] px-2 py-1 text-xs text-[var(--td-text)] focus:border-[var(--td-accent)] focus:outline-none";
  const labelCls = "mb-1 block text-[11px] text-[var(--td-text-muted)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative min-w-72 rounded-lg border border-[var(--td-border)] bg-[var(--td-panel-raised)] p-4 shadow-[var(--td-shadow-panel)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-medium text-[var(--td-text)]">
            <ComponentIcon className="text-[var(--td-text-muted)]" />
            Edit {component.type}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-0.5 text-[10px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
          >
            Close
          </button>
        </div>

        <div className="mb-3">
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {component.type === "Timer" && (
          <>
            <div className="mb-3">
              <label className={labelCls}>Interval (ms)</label>
              <input type="number" className={inputCls} value={Number(props.interval) || 1000} onChange={(e) => setProp("interval", Number(e.target.value))} />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <input type="checkbox" id="oneshot" checked={!!props.oneshot} onChange={(e) => setProp("oneshot", e.target.checked)} className="accent-[var(--td-accent)]" />
              <label htmlFor="oneshot" className="text-xs text-[var(--td-text)]">One-shot</label>
            </div>
          </>
        )}

        {component.type === "FileDialog" && (
          <>
            <div className="mb-3">
              <label className={labelCls}>Mode</label>
              <select className={inputCls} value={String(props.mode)} onChange={(e) => setProp("mode", e.target.value)}>
                <option value="open">Open File</option>
                <option value="save">Save File</option>
                <option value="directory">Directory</option>
              </select>
            </div>
            <div className="mb-3">
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={String(props.title ?? "")} onChange={(e) => setProp("title", e.target.value)} />
            </div>
            <div className="mb-3">
              <label className={labelCls}>File Types</label>
              <input className={inputCls} placeholder='e.g. [("Text files", "*.txt")]' value={String(props.filetypes ?? "")} onChange={(e) => setProp("filetypes", e.target.value)} />
            </div>
          </>
        )}

        {component.type === "ColorChooser" && (
          <>
            <div className="mb-3">
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={String(props.title ?? "")} onChange={(e) => setProp("title", e.target.value)} />
            </div>
            <div className="mb-3">
              <label className={labelCls}>Initial Color</label>
              <input className={inputCls} placeholder="#ffffff" value={String(props.initialcolor ?? "")} onChange={(e) => setProp("initialcolor", e.target.value)} />
            </div>
          </>
        )}

        {component.type === "MessageBox" && (
          <>
            <div className="mb-3">
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={String(props.mbType)} onChange={(e) => setProp("mbType", e.target.value)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="yesno">Yes/No</option>
              </select>
            </div>
            <div className="mb-3">
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={String(props.title ?? "")} onChange={(e) => setProp("title", e.target.value)} />
            </div>
            <div className="mb-3">
              <label className={labelCls}>Message</label>
              <textarea className={`${inputCls} h-16 resize-y`} value={String(props.message ?? "")} onChange={(e) => setProp("message", e.target.value)} />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1 text-xs text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]">Cancel</button>
          <button type="button" onClick={handleSave} className="rounded border border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] px-3 py-1 text-xs text-cyan-100 transition-colors hover:bg-cyan-400/20">Save</button>
        </div>
      </div>
    </div>
  );
}

export function ComponentTray() {
  const { nonVisuals, removeNonVisual } = useDesignerStore();
  const [editing, setEditing] = useState<NonVisualComponent | null>(null);

  if (nonVisuals.length === 0 && !editing) return null;

  return (
    <>
      <div className="flex h-9 shrink-0 select-none items-center gap-2 overflow-x-auto border-t border-[var(--td-border)] bg-[var(--td-panel)] px-3">
        <span className="shrink-0 text-[10px] text-[var(--td-text-muted)]">Components:</span>
        {nonVisuals.map((nv) => (
          <div key={nv.id} className="group flex shrink-0 items-center overflow-hidden rounded border border-[var(--td-border)] bg-[var(--td-bg)] text-[11px] text-[var(--td-text)] transition-colors hover:border-[var(--td-accent-border)]">
            <button
              type="button"
              onClick={() => setEditing(nv)}
              className="flex items-center gap-1.5 px-2 py-0.5 transition-colors hover:bg-[var(--td-panel-soft)]"
            >
              <ComponentIcon className="h-3.5 w-3.5 text-[var(--td-text-muted)]" />
              <span className="font-mono text-[9px] text-[var(--td-text-subtle)]">{TYPE_LABELS[nv.type]}</span>
              <span>{nv.name}</span>
            </button>
            <button
              type="button"
              onClick={() => removeNonVisual(nv.id)}
              aria-label={`Remove ${nv.name}`}
              className="px-1.5 py-0.5 text-[10px] text-[var(--td-text-muted)] opacity-0 transition-colors hover:bg-red-500/15 hover:text-[var(--td-danger)] focus-visible:opacity-100 group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {editing && <EditModal component={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
