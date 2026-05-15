import type { WidgetInstance } from "../types/widgets";

/**
 * Compute the absolute canvas position of a widget by accumulating
 * parent offsets. Widgets without a parentId have absolute (canvas) coords;
 * children store coords relative to their parent Frame.
 */
export function getAbsolutePosition(
  widget: WidgetInstance,
  allWidgets: WidgetInstance[],
): { x: number; y: number } {
  if (!widget.parentId) return { x: widget.x, y: widget.y };
  const parent = allWidgets.find((w) => w.id === widget.parentId);
  if (!parent) return { x: widget.x, y: widget.y };
  const parentAbs = getAbsolutePosition(parent, allWidgets);
  return { x: parentAbs.x + widget.x, y: parentAbs.y + widget.y };
}
