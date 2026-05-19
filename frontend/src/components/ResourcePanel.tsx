import { useRef } from "react";
import { useDesignerStore } from "../store/designerStore";

interface ResourcePanelProps {
  onClose: () => void;
}

export function ResourcePanel({ onClose }: ResourcePanelProps) {
  const { resources, addResource, removeResource } = useDesignerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        addResource(file.name, dataUrl);
      }
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e1e2e] border border-[#3c3c52] rounded-lg shadow-xl w-[500px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c52]">
          <h3 className="text-xs font-semibold text-[#d4d4e8]">Image Resources</h3>
          <button onClick={onClose} className="text-[#5a5a72] hover:text-[#d4d4e8] text-sm leading-none">&#10005;</button>
        </div>
        <div className="px-4 py-2 border-b border-[#3c3c52]">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button onClick={handleUpload} className="text-[10px] bg-[#252536] border border-[#3c3c52] hover:bg-[#2d2d42] hover:border-[#06b6d4]/50 px-2 py-0.5 rounded transition-colors">
            + Upload Image
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {resources.length === 0 && (
            <p className="text-[10px] text-[#5a5a72] text-center py-4">No images uploaded. Click "Upload Image" to add one.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {resources.map((r) => (
              <div key={r.id} className="bg-[#252536] rounded border border-[#3c3c52] p-2 flex flex-col items-center gap-1">
                <img src={r.dataUrl} className="w-16 h-16 object-contain rounded" alt={r.name} />
                <span className="text-[9px] text-[#8888a8] truncate w-full text-center">{r.name}</span>
                <button onClick={() => removeResource(r.id)} className="text-[9px] text-[#ef4444] hover:text-[#f87171]">&#10005; Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
