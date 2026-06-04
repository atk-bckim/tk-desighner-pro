import { useDesignerStore } from "../store/designerStore";
import type { TkVarType } from "../types/widgets";

interface VariablePanelProps {
  onClose: () => void;
}

export function VariablePanel({ onClose }: VariablePanelProps) {
  const { variables, addVariable, removeVariable, renameVariable, updateVariableDefault } = useDesignerStore();
  const inputCls = "block w-full rounded border border-[var(--td-border)] bg-[var(--td-bg)] px-1.5 py-0.5 text-xs text-[var(--td-text)] focus:border-[var(--td-accent)] focus:outline-none";
  const btnCls = "rounded border border-[var(--td-border)] bg-[var(--td-panel)] px-2 py-0.5 text-[10px] text-[var(--td-text-muted)] transition-colors hover:border-[var(--td-accent-border)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="flex max-h-[70vh] w-[420px] flex-col rounded-lg border border-[var(--td-border)] bg-[var(--td-panel)] shadow-[var(--td-shadow-panel)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--td-border)] px-4 py-3">
          <h3 className="text-xs font-semibold text-[var(--td-text)]">Tkinter Variables</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-0.5 text-[10px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
          >
            Close
          </button>
        </div>
        <div className="flex gap-1 border-b border-[var(--td-border)] px-4 py-2">
          {(["StringVar", "IntVar", "DoubleVar", "BooleanVar"] as TkVarType[]).map((vt) => (
            <button key={vt} type="button" onClick={() => addVariable(vt)} className={btnCls}>+ {vt}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {variables.length === 0 && (
            <p className="py-4 text-center text-[10px] text-[var(--td-text-subtle)]">No variables defined. Click a type above to add one.</p>
          )}
          {variables.map((v) => (
            <div key={v.id} className="mb-2 flex items-center gap-2 rounded bg-[var(--td-panel-raised)] p-2">
              <span className="w-20 shrink-0 font-mono text-[10px] text-cyan-100">{v.varType}</span>
              <input className={`${inputCls} flex-1`} value={v.name} onChange={(e) => renameVariable(v.id, e.target.value)} />
              <input className={`${inputCls} w-24`} value={v.defaultValue} placeholder="default" onChange={(e) => updateVariableDefault(v.id, e.target.value)} />
              <button
                type="button"
                onClick={() => removeVariable(v.id)}
                aria-label={`Remove variable ${v.name}`}
                className="shrink-0 rounded px-2 py-0.5 text-[10px] text-[var(--td-danger)] transition-colors hover:bg-red-500/15"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
