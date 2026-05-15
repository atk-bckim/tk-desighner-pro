import { useDesignerStore } from "../store/designerStore";

export function StatusBar() {
  const { widgets, selectedIds, canvasWidth, canvasHeight, gridSize, snapEnabled } = useDesignerStore();
  const selected = selectedIds.length === 1 ? widgets.find(w => w.id === selectedIds[0]) : null;

  return (
    <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-3 text-xs text-gray-500 gap-4 shrink-0">
      <span>{canvasWidth}x{canvasHeight}</span>
      <span>Widgets: {widgets.length}</span>
      {selected && (
        <>
          <span className="text-blue-400">{selected.type}</span>
          <span>({Math.round(selected.x)}, {Math.round(selected.y)})</span>
          <span>{Math.round(selected.width)}x{Math.round(selected.height)}</span>
        </>
      )}
      <span className="ml-auto">Grid: {snapEnabled ? `${gridSize}px` : "off"}</span>
    </div>
  );
}
