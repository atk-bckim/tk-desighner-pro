import { useDesignerStore } from "../store/designerStore";
import { getEditableProps } from "../utils/widgetDefaults";

export function PropertyPanel() {
  const { widgets, selectedId, moveWidget, resizeWidget, updateWidgetProp, removeWidget, canvasWidth, canvasHeight, setCanvasSize, bringToFront, sendToBack } =
    useDesignerStore();

  const widget = widgets.find((w) => w.id === selectedId);

  if (!widget) {
    return (
      <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 shrink-0">
        <h2 className="text-sm font-semibold text-gray-400">Properties</h2>
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-gray-400 mb-1">Canvas Size</h3>
          <div className="grid grid-cols-2 gap-1">
            <label className="text-xs text-gray-400">
              Width
              <input type="number" className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                value={canvasWidth} onChange={(e) => setCanvasSize(parseInt(e.target.value) || 800, canvasHeight)} />
            </label>
            <label className="text-xs text-gray-400">
              Height
              <input type="number" className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                value={canvasHeight} onChange={(e) => setCanvasSize(canvasWidth, parseInt(e.target.value) || 600)} />
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">Select a widget to edit its properties</p>
      </div>
    );
  }

  const editableProps = getEditableProps(widget.type);

  return (
    <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400">Properties</h2>
        <button
          onClick={() => removeWidget(widget.id)}
          className="text-red-400 hover:text-red-300 text-xs"
        >
          Delete
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-3">Type: {widget.type}</div>

      {/* Geometry */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">Geometry</h3>
        <div className="grid grid-cols-2 gap-1">
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key} className="text-xs text-gray-400">
              {key}
              <input
                type="number"
                className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                value={widget[key]}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) return;
                  if (key === "x" || key === "y") {
                    moveWidget(widget.id, key === "x" ? val : widget.x, key === "y" ? val : widget.y);
                  } else {
                    resizeWidget(widget.id, key === "width" ? val : widget.width, key === "height" ? val : widget.height);
                  }
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Widget-specific props */}
      {editableProps.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-1">Widget Properties</h3>
          <div className="flex flex-col gap-2">
            {editableProps.map((prop) => (
              <label key={prop.key} className="text-xs text-gray-400">
                {prop.label}
                {prop.type === "select" ? (
                  <select
                    className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                    value={String(widget.props[prop.key] ?? "")}
                    onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : prop.type === "color" ? (
                  <input
                    type="color"
                    className="block w-full h-7 bg-gray-700 rounded mt-0.5 cursor-pointer"
                    value={String(widget.props[prop.key] ?? "#000000")}
                    onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={prop.type === "number" ? "number" : "text"}
                    className="block w-full bg-gray-700 rounded px-1 py-0.5 text-white mt-0.5"
                    value={String(widget.props[prop.key] ?? "")}
                    onChange={(e) =>
                      updateWidgetProp(
                        widget.id,
                        prop.key,
                        prop.type === "number" ? Number(e.target.value) : e.target.value,
                      )
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Z-Order */}
      <div className="mt-3 border-t border-gray-700 pt-2">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">Z-Order</h3>
        <div className="flex gap-1">
          <button onClick={() => bringToFront(widget.id)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded flex-1">To Front</button>
          <button onClick={() => sendToBack(widget.id)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded flex-1">To Back</button>
        </div>
      </div>
    </div>
  );
}
