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
      <div role="dialog" aria-modal="true" className="flex max-h-[70vh] w-[500px] flex-col rounded-lg border border-[var(--td-border)] bg-[var(--td-panel)] shadow-[var(--td-shadow-panel)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--td-border)] px-4 py-3">
          <h3 className="text-xs font-semibold text-[var(--td-text)]">Image Resources</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-0.5 text-[10px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
          >
            Close
          </button>
        </div>
        <div className="border-b border-[var(--td-border)] px-4 py-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button type="button" onClick={handleUpload} className="rounded border border-[var(--td-border)] bg-[var(--td-panel-raised)] px-2 py-0.5 text-[10px] text-[var(--td-text-muted)] transition-colors hover:border-[var(--td-accent-border)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]">
            + Upload Image
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {resources.length === 0 && (
            <p className="py-4 text-center text-[10px] text-[var(--td-text-subtle)]">No images uploaded. Click "Upload Image" to add one.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {resources.map((r) => (
              <div key={r.id} className="flex flex-col items-center gap-1 rounded border border-[var(--td-border)] bg-[var(--td-panel-raised)] p-2">
                <img src={r.dataUrl} className="w-16 h-16 object-contain rounded" alt={r.name} />
                <span className="w-full truncate text-center text-[9px] text-[var(--td-text-muted)]">{r.name}</span>
                <button
                  type="button"
                  onClick={() => removeResource(r.id)}
                  aria-label={`Remove resource ${r.name}`}
                  className="rounded px-1.5 py-0.5 text-[9px] text-[var(--td-danger)] transition-colors hover:bg-red-500/15"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
