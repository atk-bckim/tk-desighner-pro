import { useDraggable } from "@dnd-kit/core";
import { WIDGET_TYPES } from "../types/widgets";
import type { WidgetType } from "../types/widgets";

function WidgetItem({ type }: { type: WidgetType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { fromToolbox: true, widgetType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-gray-700 hover:bg-gray-600 p-2 rounded cursor-grab text-sm select-none ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {type}
    </div>
  );
}

export function Toolbox() {
  return (
    <div className="w-48 bg-gray-800 border-r border-gray-700 p-3 overflow-y-auto shrink-0">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Widgets</h2>
      <div className="flex flex-col gap-2">
        {WIDGET_TYPES.map((type) => (
          <WidgetItem key={type} type={type} />
        ))}
      </div>
    </div>
  );
}
