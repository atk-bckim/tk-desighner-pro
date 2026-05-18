import { useState } from "react";
import { useDesignerStore } from "../store/designerStore";
import { getEditableProps } from "../utils/widgetDefaults";
import { FontPicker } from "./FontPicker";

const COMMON_PROPS = ["bg", "fg", "font", "state"] as const;

export function PropertyPanel() {
  const selectedIds = useDesignerStore((s) => s.selectedIds);
  const widgets = useDesignerStore((s) => s.widgets);
  const menuBar = useDesignerStore((s) => s.menuBar);
  const { moveWidget, resizeWidget, updateWidgetProp, removeWidget, snapshot, canvasWidth, canvasHeight, setCanvasSize, bringToFront, sendToBack, renameWidget, addTab, removeTab, toggleLock, alignWidgets, tkTheme, setTkTheme, distributeWidgets, makeSameSize, addMenuBar, removeMenuBar, addMenu, removeMenu, renameMenu, addMenuItem, removeMenuItem, updateMenuItem, rootBg, setRootBg, rootResizable, setRootResizable } =
    useDesignerStore();
  const [fontPickerOpen, setFontPickerOpen] = useState(false);

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const widget = selectedId ? widgets.find(w => w.id === selectedId) : null;

  const inputCls = "block w-full bg-[#1e1e2e] border border-[#3c3c52] rounded px-1.5 py-0.5 text-xs text-[#d4d4e8] focus:border-[#06b6d4] focus:outline-none transition-colors";
  const labelCls = "text-[10px] text-[#8888a8] mb-0.5 block";
  const sectionCls = "border-t border-[#3c3c52] pt-2 mt-2";
  const sectionTitleCls = "text-[10px] font-semibold text-[#5a5a72] uppercase tracking-wider mb-1.5";
  const btnCls = "text-[10px] bg-[#252536] border border-[#3c3c52] hover:bg-[#2d2d42] hover:border-[#06b6d4]/50 px-2 py-0.5 rounded transition-colors duration-150";

  // Multi-select panel
  if (selectedIds.length > 1) {
    const selectedWidgets = widgets.filter(w => selectedIds.includes(w.id));
    const commonProps = COMMON_PROPS.filter(propKey =>
      selectedWidgets.every(w => getEditableProps(w.type).some(p => p.key === propKey))
    );
    const getCommonValue = (key: string): unknown => {
      const values = selectedWidgets.map(w => w.props[key]);
      const first = values[0];
      return values.every(v => v === first) ? first : undefined;
    };

    return (
      <div className="w-56 bg-[#1e1e2e] border-l border-[#3c3c52] p-2 shrink-0 overflow-y-auto">
        <h2 className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wider mb-2">Properties</h2>
        <p className="text-[10px] text-[#06b6d4] mb-2">{selectedIds.length} selected</p>

        <div className={sectionCls}>
          <div className={sectionTitleCls}>Align</div>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => alignWidgets(selectedIds, "left")} className={btnCls}>Left</button>
            <button onClick={() => alignWidgets(selectedIds, "top")} className={btnCls}>Top</button>
            <button onClick={() => alignWidgets(selectedIds, "centerH")} className={btnCls}>Mid H</button>
            <button onClick={() => alignWidgets(selectedIds, "right")} className={btnCls}>Right</button>
            <button onClick={() => alignWidgets(selectedIds, "bottom")} className={btnCls}>Bottom</button>
            <button onClick={() => alignWidgets(selectedIds, "centerV")} className={btnCls}>Mid V</button>
          </div>
        </div>

        <div className={sectionCls}>
          <div className={sectionTitleCls}>Distribute</div>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => distributeWidgets(selectedIds, "horizontal")} disabled={selectedIds.length < 3} className={`${btnCls} disabled:opacity-20`}>Horizontal</button>
            <button onClick={() => distributeWidgets(selectedIds, "vertical")} disabled={selectedIds.length < 3} className={`${btnCls} disabled:opacity-20`}>Vertical</button>
          </div>
        </div>

        <div className={sectionCls}>
          <div className={sectionTitleCls}>Size</div>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => makeSameSize(selectedIds, "width")} disabled={selectedIds.length < 2} className={`${btnCls} disabled:opacity-20`}>Same W</button>
            <button onClick={() => makeSameSize(selectedIds, "height")} disabled={selectedIds.length < 2} className={`${btnCls} disabled:opacity-20`}>Same H</button>
            <button onClick={() => makeSameSize(selectedIds, "both")} disabled={selectedIds.length < 2} className={`${btnCls} disabled:opacity-20`}>Both</button>
          </div>
        </div>

        {commonProps.length > 0 && (
          <div className={sectionCls}>
            <div className={sectionTitleCls}>Common</div>
            <div className="flex flex-col gap-1.5">
              {commonProps.map((key) => {
                const value = getCommonValue(key);
                const spec = selectedWidgets.length > 0 ? getEditableProps(selectedWidgets[0].type).find(p => p.key === key) : null;
                if (!spec) return null;
                return (
                  <label key={key}>
                    <span className={labelCls}>{spec.label}</span>
                    {spec.type === "color" ? (
                      <input type="color" className="block w-full h-6 bg-[#1e1e2e] border border-[#3c3c52] rounded cursor-pointer" value={typeof value === "string" ? value : "#000000"} onChange={(e) => selectedIds.forEach(id => updateWidgetProp(id, key, e.target.value))} />
                    ) : (
                      <input type={spec.type === "number" ? "number" : "text"} className={inputCls} value={value !== undefined ? String(value) : ""} placeholder="(mixed)" onChange={(e) => selectedIds.forEach(id => updateWidgetProp(id, key, spec.type === "number" ? Number(e.target.value) : e.target.value))} />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className={sectionCls}>
          <button onClick={() => { snapshot(); selectedIds.forEach(id => removeWidget(id)); }} className="text-[10px] bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 px-2 py-0.5 rounded w-full transition-colors">Delete All</button>
        </div>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="w-56 bg-[#1e1e2e] border-l border-[#3c3c52] p-2 shrink-0">
        <h2 className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wider mb-2">Properties</h2>
        <div className="mb-3">
          <div className={sectionTitleCls}>Window</div>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-1">
              <label><span className={labelCls}>Width</span><input type="number" className={inputCls} value={canvasWidth} onChange={(e) => setCanvasSize(parseInt(e.target.value) || 800, canvasHeight)} onBlur={() => snapshot()} /></label>
              <label><span className={labelCls}>Height</span><input type="number" className={inputCls} value={canvasHeight} onChange={(e) => setCanvasSize(canvasWidth, parseInt(e.target.value) || 600)} onBlur={() => snapshot()} /></label>
            </div>
            <label><span className={labelCls}>Background</span>
              <input type="color" className="block w-full h-6 bg-[#1e1e2e] border border-[#3c3c52] rounded cursor-pointer" value={rootBg || "#f0f0f0"} onChange={(e) => setRootBg(e.target.value)} onBlur={() => snapshot()} />
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="accent-[#06b6d4]" checked={rootResizable} onChange={(e) => { setRootResizable(e.target.checked); snapshot(); }} />
              <span className={labelCls}>Resizable</span>
            </label>
          </div>
        </div>
        <div className="mb-3">
          <div className={sectionTitleCls}>Theme</div>
          <select className={inputCls} value={tkTheme} onChange={(e) => setTkTheme(e.target.value)}>
            <option value="default">Default</option>
            <option value="clam">Clam</option>
            <option value="alt">Alt</option>
            <option value="classic">Classic</option>
          </select>
        </div>
        <div className={sectionCls}>
          <div className={sectionTitleCls}>Menu Bar</div>
          {!menuBar ? (
            <button onClick={() => { snapshot(); addMenuBar(); }} className={`${btnCls} w-full`}>+ Add Menu Bar</button>
          ) : (
            <>
              <div className="flex gap-1 mb-1.5">
                <button onClick={() => addMenu("Menu")} className={`${btnCls} flex-1`}>+ Menu</button>
                <button onClick={() => { snapshot(); removeMenuBar(); }} className="text-[10px] text-[#ef4444] hover:text-[#f87171]">Remove</button>
              </div>
              {menuBar.menus.map((menu) => (
                <div key={menu.id} className="border border-[#3c3c52] rounded mb-1.5 p-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <input type="text" className={`${inputCls} flex-1`} value={menu.label} onChange={(e) => renameMenu(menu.id, e.target.value)} onBlur={() => snapshot()} />
                    <button onClick={() => { snapshot(); removeMenu(menu.id); }} className="text-[#ef4444] text-[10px] hover:text-[#f87171]">&#10005;</button>
                  </div>
                  {menu.items.map((item) =>
                    item.separator ? (
                      <div key={item.id} className="flex items-center gap-1 mb-0.5">
                        <span className="text-[9px] text-[#5a5a72] flex-1">— separator —</span>
                        <button onClick={() => { snapshot(); removeMenuItem(menu.id, item.id); }} className="text-[#ef4444] text-[8px]">&#10005;</button>
                      </div>
                    ) : (
                      <div key={item.id} className="flex items-center gap-1 mb-0.5">
                        <input type="text" className={`${inputCls} flex-1`} value={item.label} onChange={(e) => updateMenuItem(menu.id, item.id, { label: e.target.value })} onBlur={() => snapshot()} placeholder="Label" />
                        <input type="text" className={`${inputCls} w-16`} value={item.accelerator ?? ""} onChange={(e) => updateMenuItem(menu.id, item.id, { accelerator: e.target.value })} placeholder="Ctrl+..." />
                        <button onClick={() => { snapshot(); removeMenuItem(menu.id, item.id); }} className="text-[#ef4444] text-[8px]">&#10005;</button>
                      </div>
                    )
                  )}
                  <button onClick={() => addMenuItem(menu.id, "Item")} className="text-[9px] text-[#06b6d4] hover:text-[#22d3ee] mt-0.5">+ Item</button>
                  <button onClick={() => { addMenuItem(menu.id, ""); updateMenuItem(menu.id, menu.items[menu.items.length - 1]?.id ?? "", { separator: true }); }} className="text-[9px] text-[#5a5a72] hover:text-[#8888a8] ml-2">+ Separator</button>
                </div>
              ))}
            </>
          )}
        </div>
        <p className="text-[10px] text-[#5a5a72] mt-3">Select a widget to edit</p>
      </div>
    );
  }

  const editableProps = getEditableProps(widget.type);

  return (
    <div className="w-56 bg-[#1e1e2e] border-l border-[#3c3c52] p-2 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wider">Properties</h2>
        <div className="flex gap-1">
          <button onClick={() => toggleLock(widget.id)} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${widget.locked ? "bg-amber-500/20 text-amber-400" : "text-[#5a5a72] hover:text-[#8888a8]"}`}>
            {widget.locked ? "\u{1F512}" : "\u{1F513}"}
          </button>
          <button onClick={() => removeWidget(widget.id)} className="text-[10px] text-[#ef4444] hover:text-[#f87171] transition-colors">Del</button>
        </div>
      </div>

      <div className="text-[10px] text-[#06b6d4] mb-2">{widget.type}</div>

      <div className="mb-2">
        <label><span className={labelCls}>Name</span>
          <input type="text" className={`${inputCls} font-mono`} value={widget.name} onChange={(e) => renameWidget(widget.id, e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} onBlur={() => snapshot()} />
        </label>
      </div>

      <div className={sectionCls}>
        <div className={sectionTitleCls}>Geometry</div>
        <div className="grid grid-cols-2 gap-1">
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key}>
              <span className={labelCls}>{key}</span>
              <input type="number" className={inputCls} value={widget[key]} onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val)) return;
                if (key === "x" || key === "y") moveWidget(widget.id, key === "x" ? val : widget.x, key === "y" ? val : widget.y);
                else resizeWidget(widget.id, key === "width" ? val : widget.width, key === "height" ? val : widget.height);
              }} onBlur={() => snapshot()} />
            </label>
          ))}
        </div>
      </div>

      {editableProps.length > 0 && (
        <div className={sectionCls}>
          <div className={sectionTitleCls}>Widget</div>
          <div className="flex flex-col gap-1.5">
            {editableProps.map((prop) => {
              if (prop.key === "font") {
                return (
                  <label key={prop.key}>
                    <span className={labelCls}>{prop.label}</span>
                    <div className="flex gap-1">
                      <input type="text" className={`${inputCls} flex-1 font-mono`} value={String(widget.props[prop.key] ?? "")} onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)} onBlur={() => snapshot()} />
                      <button onClick={() => setFontPickerOpen(true)} className="text-[10px] bg-[#252536] border border-[#3c3c52] hover:border-[#06b6d4]/50 px-1.5 rounded transition-colors shrink-0">...</button>
                    </div>
                  </label>
                );
              }
              return (
                <label key={prop.key}>
                  <span className={labelCls}>{prop.label}</span>
                  {prop.type === "select" ? (
                    <select className={inputCls} value={String(widget.props[prop.key] ?? "")} onChange={(e) => { snapshot(); updateWidgetProp(widget.id, prop.key, e.target.value); }}>
                      <option value="">—</option>
                      {prop.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : prop.type === "color" ? (
                    <input type="color" className="block w-full h-6 bg-[#1e1e2e] border border-[#3c3c52] rounded cursor-pointer" value={String(widget.props[prop.key] ?? "#000000")} onChange={(e) => updateWidgetProp(widget.id, prop.key, e.target.value)} onBlur={() => snapshot()} />
                  ) : (
                    <input type={prop.type === "number" ? "number" : "text"} className={inputCls} value={String(widget.props[prop.key] ?? "")} onChange={(e) => updateWidgetProp(widget.id, prop.key, prop.type === "number" ? Number(e.target.value) : e.target.value)} onBlur={() => snapshot()} />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {widget.type === "Notebook" && (
        <div className={sectionCls}>
          <div className={sectionTitleCls}>Tabs</div>
          <button onClick={() => addTab(widget.id)} className={`${btnCls} mb-1 w-full`}>+ Add Tab</button>
          {widgets.filter(w => w.parentId === widget.id).map((tab) => (
            <div key={tab.id} className="flex items-center gap-1 mb-0.5">
              <input type="text" className={`${inputCls} flex-1`} value={String(tab.props.text ?? "")} onChange={(e) => updateWidgetProp(tab.id, "text", e.target.value)} />
              <button onClick={() => removeTab(widget.id, tab.id)} className="text-[#ef4444] text-[10px] hover:text-[#f87171]">&#10005;</button>
            </div>
          ))}
        </div>
      )}

      {widget.type === "Scrollbar" && (
        <div className={sectionCls}>
          <div className={sectionTitleCls}>Binding</div>
          <label>
            <span className={labelCls}>Link to widget</span>
            <select
              className={inputCls}
              value={widget.bindings?.command ?? ""}
              onChange={(e) => {
                const targetId = e.target.value || undefined;
                snapshot();
                useDesignerStore.setState(s => ({
                  widgets: s.widgets.map(w =>
                    w.id === widget.id ? { ...w, bindings: { ...w.bindings, command: targetId } } : w
                  ),
                }));
              }}
            >
              <option value="">— none —</option>
              {widgets.filter(w => w.id !== widget.id && (w.type === "Text" || w.type === "Listbox" || w.type === "Entry")).map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className={sectionCls}>
        <div className={sectionTitleCls}>Z-Order</div>
        <div className="flex gap-1">
          <button onClick={() => bringToFront(widget.id)} className={`${btnCls} flex-1`}>Front</button>
          <button onClick={() => sendToBack(widget.id)} className={`${btnCls} flex-1`}>Back</button>
        </div>
      </div>

      {fontPickerOpen && (
        <FontPicker value={String(widget?.props.font ?? "")} onChange={(v) => widget && updateWidgetProp(widget.id, "font", v)} onClose={() => setFontPickerOpen(false)} />
      )}
    </div>
  );
}
