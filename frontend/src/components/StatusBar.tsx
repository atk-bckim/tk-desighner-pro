import { useDesignerStore } from "../store/designerStore";

export function StatusBar() {
  const { widgets, selectedIds, canvasWidth, canvasHeight, gridSize, snapEnabled, zoom, mousePos } = useDesignerStore();
  const selected = selectedIds.length === 1 ? widgets.find(w => w.id === selectedIds[0]) : null;

  return (
    <div className="h-6 bg-[#06b6d4] flex items-center px-3 text-[11px] text-white/90 gap-3 shrink-0 select-none">
      <span className="font-medium">{canvasWidth}x{canvasHeight}</span>
      <span className="text-white/60">|</span>
      <span>{widgets.length} widgets</span>
      {mousePos && (
        <>
          <span className="text-white/60">|</span>
          <span>({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</span>
        </>
      )}
      {selected && (
        <>
          <span className="text-white/60">|</span>
          <span className="font-medium">{selected.type}</span>
          <span>({Math.round(selected.x)}, {Math.round(selected.y)})</span>
          <span>{Math.round(selected.width)}x{Math.round(selected.height)}</span>
        </>
      )}
      <div className="flex-1" />
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
      <span className="text-white/60">|</span>
      <span>{snapEnabled ? `Grid: ${gridSize}px` : "Grid: off"}</span>
    </div>
  );
}
