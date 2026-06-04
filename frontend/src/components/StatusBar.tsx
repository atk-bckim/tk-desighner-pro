import { useDesignerStore } from "../store/designerStore";
import { StatusChip } from "./ui";

export function StatusBar() {
  const { widgets, selectedIds, canvasWidth, canvasHeight, gridSize, snapEnabled, zoom, mousePos } = useDesignerStore();
  const selected = selectedIds.length === 1 ? widgets.find(w => w.id === selectedIds[0]) : null;

  return (
    <div className="flex h-7 shrink-0 select-none items-center gap-3 border-t border-[var(--td-border)] bg-[var(--td-bg)] px-3 font-mono text-[10px] text-[var(--td-text-muted)]">
      <span className="font-medium text-[var(--td-text)]">{canvasWidth}x{canvasHeight}</span>
      <span className="text-[var(--td-text-subtle)]">|</span>
      <span>{widgets.length} widgets</span>
      {mousePos && (
        <>
          <span className="text-[var(--td-text-subtle)]">|</span>
          <span>({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</span>
        </>
      )}
      {selected && (
        <>
          <span className="text-[var(--td-text-subtle)]">|</span>
          <StatusChip tone="accent">{selected.type}</StatusChip>
          <span>({Math.round(selected.x)}, {Math.round(selected.y)})</span>
          <span>{Math.round(selected.width)}x{Math.round(selected.height)}</span>
        </>
      )}
      <div className="flex-1" />
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
      <span className="text-[var(--td-text-subtle)]">|</span>
      <StatusChip tone={snapEnabled ? "neutral" : "warning"}>
        {snapEnabled ? `Grid ${gridSize}px` : "Grid off"}
      </StatusChip>
    </div>
  );
}
