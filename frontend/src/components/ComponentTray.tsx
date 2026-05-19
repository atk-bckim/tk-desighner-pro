import { useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import type { NonVisualComponent, NonVisualType } from "../types/widgets";

const ICONS: Record<NonVisualType, string> = {
  Timer: "\u23F1",
  FileDialog: "\uD83D\uDCC2",
  ColorChooser: "\uD83C\uDFA8",
  MessageBox: "\uD83D\uDCAC",
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

  const inputCls = "bg-[#1e1e2e] border border-[#3c3c52] px-2 py-1 rounded text-xs text-[#d4d4e8] focus:border-[#06b6d4] focus:outline-none w-full";
  const labelCls = "text-[11px] text-[#8888a8] mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-[#252536] border border-[#3c3c52] rounded-lg shadow-2xl p-4 min-w-72" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#d4d4e8]">
            {ICONS[component.type]} Edit {component.type}
          </span>
          <button onClick={onClose} className="text-[#8888a8] hover:text-[#d4d4e8] text-sm">&times;</button>
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
              <input type="checkbox" id="oneshot" checked={!!props.oneshot} onChange={(e) => setProp("oneshot", e.target.checked)} className="accent-[#06b6d4]" />
              <label htmlFor="oneshot" className="text-xs text-[#d4d4e8]">One-shot</label>
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
          <button onClick={onClose} className="px-3 py-1 text-xs text-[#8888a8] hover:text-[#d4d4e8] rounded transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-xs bg-[#06b6d4] hover:bg-[#22d3ee] text-white rounded transition-colors">Save</button>
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
      <div className="h-9 bg-[#252536] border-t border-[#3c3c52] flex items-center px-3 gap-2 shrink-0 select-none overflow-x-auto">
        <span className="text-[10px] text-[#8888a8] shrink-0">Components:</span>
        {nonVisuals.map((nv) => (
          <button
            key={nv.id}
            onClick={() => setEditing(nv)}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#1e1e2e] border border-[#3c3c52] rounded text-[11px] text-[#d4d4e8] hover:border-[#06b6d4]/50 transition-colors shrink-0 group"
          >
            <span>{ICONS[nv.type]}</span>
            <span>{nv.name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); removeNonVisual(nv.id); }}
              className="ml-1 text-[#8888a8] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
            >
              &times;
            </span>
          </button>
        ))}
      </div>
      {editing && <EditModal component={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
