import { useDesignerStore } from "../store/designerStore";
import type { TkVarType } from "../types/widgets";

interface VariablePanelProps {
  onClose: () => void;
}

export function VariablePanel({ onClose }: VariablePanelProps) {
  const { variables, addVariable, removeVariable, renameVariable, updateVariableDefault } = useDesignerStore();
  const inputCls = "block w-full bg-[#1e1e2e] border border-[#3c3c52] rounded px-1.5 py-0.5 text-xs text-[#d4d4e8] focus:border-[#06b6d4] focus:outline-none";
  const btnCls = "text-[10px] bg-[#252536] border border-[#3c3c52] hover:bg-[#2d2d42] hover:border-[#06b6d4]/50 px-2 py-0.5 rounded transition-colors";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e1e2e] border border-[#3c3c52] rounded-lg shadow-xl w-[420px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c52]">
          <h3 className="text-xs font-semibold text-[#d4d4e8]">Tkinter Variables</h3>
          <button onClick={onClose} className="text-[#5a5a72] hover:text-[#d4d4e8] text-sm leading-none">&#10005;</button>
        </div>
        <div className="flex gap-1 px-4 py-2 border-b border-[#3c3c52]">
          {(["StringVar", "IntVar", "DoubleVar", "BooleanVar"] as TkVarType[]).map((vt) => (
            <button key={vt} onClick={() => addVariable(vt)} className={btnCls}>+ {vt}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {variables.length === 0 && (
            <p className="text-[10px] text-[#5a5a72] text-center py-4">No variables defined. Click a type above to add one.</p>
          )}
          {variables.map((v) => (
            <div key={v.id} className="flex items-center gap-2 mb-2 p-2 bg-[#252536] rounded">
              <span className="text-[10px] text-[#06b6d4] font-mono shrink-0 w-20">{v.varType}</span>
              <input className={`${inputCls} flex-1`} value={v.name} onChange={(e) => renameVariable(v.id, e.target.value)} />
              <input className={`${inputCls} w-24`} value={v.defaultValue} placeholder="default" onChange={(e) => updateVariableDefault(v.id, e.target.value)} />
              <button onClick={() => removeVariable(v.id)} className="text-[10px] text-[#ef4444] hover:text-[#f87171] shrink-0">&#10005;</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
