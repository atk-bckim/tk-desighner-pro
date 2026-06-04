import { useDesignerStore } from "../store/designerStore";

interface ContextMenuProps {
  x: number;
  y: number;
  widgetId: string;
  onClose: () => void;
}

export function ContextMenu({ x, y, widgetId, onClose }: ContextMenuProps) {
  const { snapshot, removeWidget, duplicateWidget, bringToFront, sendToBack, copyWidgets, clipboard, toggleLock, widgets } = useDesignerStore();
  const widget = widgets.find(w => w.id === widgetId);

  const items = [
    { label: "Cut", action: () => { snapshot(); copyWidgets([widgetId]); removeWidget(widgetId); }, shortcut: "Ctrl+X" },
    { label: "Copy", action: () => { copyWidgets([widgetId]); }, shortcut: "Ctrl+C" },
    { label: "Paste", action: () => { if (clipboard.length > 0) { snapshot(); useDesignerStore.getState().pasteWidgets(); } }, shortcut: "Ctrl+V", disabled: clipboard.length === 0 },
    { label: "---", action: () => {} },
    { label: "Duplicate", action: () => { snapshot(); duplicateWidget(widgetId); }, shortcut: "Ctrl+D" },
    { label: "Delete", action: () => { snapshot(); removeWidget(widgetId); }, shortcut: "Del" },
    { label: "---", action: () => {} },
    { label: widget?.locked ? "Unlock" : "Lock", action: () => { toggleLock(widgetId); }, shortcut: "Ctrl+L" },
    { label: "---", action: () => {} },
    { label: "Bring to Front", action: () => bringToFront(widgetId) },
    { label: "Send to Back", action: () => sendToBack(widgetId) },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />

      <div className="fixed bg-[#252536] border border-[#3c3c52] rounded shadow-xl py-1 z-50 min-w-40" style={{ left: x, top: y }}>
        {items.map((item, i) =>
          item.label === "---" ? (
            <div key={i} className="border-t border-[#3c3c52] my-1" />
          ) : (
            <button key={i}
              className={`w-full text-left px-3 py-1.5 text-xs text-[#8888a8] hover:bg-[#2d2d42] hover:text-[#d4d4e8] flex justify-between items-center transition-colors ${item.disabled ? "opacity-20 pointer-events-none" : ""}`}
              onClick={() => { item.action(); onClose(); }}>
              <span>{item.label}</span>
              {item.shortcut && <span className="text-[#5a5a72] ml-4">{item.shortcut}</span>}
            </button>
          )
        )}
      </div>
    </>
  );
}
