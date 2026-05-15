import { useDesignerStore } from "../store/designerStore";

interface ContextMenuProps {
  x: number;
  y: number;
  widgetId: string;
  onClose: () => void;
}

export function ContextMenu({ x, y, widgetId, onClose }: ContextMenuProps) {
  const { snapshot, removeWidget, duplicateWidget, bringToFront, sendToBack } = useDesignerStore();

  const items = [
    { label: "Duplicate", action: () => { snapshot(); duplicateWidget(widgetId); }, shortcut: "Ctrl+D" },
    { label: "Delete", action: () => { snapshot(); removeWidget(widgetId); }, shortcut: "Del" },
    { label: "---", action: () => {} },
    { label: "Bring to Front", action: () => bringToFront(widgetId) },
    { label: "Send to Back", action: () => sendToBack(widgetId) },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 z-50 min-w-40" style={{ left: x, top: y }}>
        {items.map((item, i) =>
          item.label === "---" ? (
            <div key={i} className="border-t border-gray-600 my-1" />
          ) : (
            <button key={i} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 flex justify-between items-center"
              onClick={() => { item.action(); onClose(); }}>
              <span>{item.label}</span>
              {item.shortcut && <span className="text-gray-500 ml-4">{item.shortcut}</span>}
            </button>
          )
        )}
      </div>
    </>
  );
}
