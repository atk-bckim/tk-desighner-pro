import { useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import { useDesignerStore } from "../store/designerStore";
import { getEditableProps } from "../utils/widgetDefaults";
import { FieldLabel, PanelHeader, PanelSection, SelectInput, TextButton, TextInput } from "./ui";
import { FontPicker } from "./FontPicker";

type InspectorTab = "layout" | "style" | "data" | "events" | "advanced";

const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
  { id: "layout", label: "Layout" },
  { id: "style", label: "Style" },
  { id: "data", label: "Data" },
  { id: "events", label: "Events" },
  { id: "advanced", label: "Advanced" },
];

const STYLE_KEYS = new Set(["bg", "fg", "font", "relief", "bd", "anchor", "justify", "wraplength"]);
const DATA_KEYS = new Set(["text", "textvariable", "variable", "values", "from_", "to", "increment", "maximum", "mode", "state", "show", "selectmode", "width", "height"]);
const EVENT_KEYS = new Set(["command"]);
const COMMON_PROPS = ["bg", "fg", "font", "state"] as const;

type PropSpec = ReturnType<typeof getEditableProps>[number];

const colorInputClass = "h-7 w-full cursor-pointer rounded-md border border-[var(--td-border)] bg-[var(--td-bg)] px-1";
const tinyActionClass = "h-6 px-1.5 text-[10px]";

function toNumber(value: string) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function sanitizeWidgetName(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
}

export function InspectorPanel() {
  const selectedIds = useDesignerStore((s) => s.selectedIds);
  const widgets = useDesignerStore((s) => s.widgets);
  const menuBar = useDesignerStore((s) => s.menuBar);
  const canvasWidth = useDesignerStore((s) => s.canvasWidth);
  const canvasHeight = useDesignerStore((s) => s.canvasHeight);
  const tkTheme = useDesignerStore((s) => s.tkTheme);
  const rootBg = useDesignerStore((s) => s.rootBg);
  const rootResizable = useDesignerStore((s) => s.rootResizable);
  const variables = useDesignerStore((s) => s.variables);
  const resources = useDesignerStore((s) => s.resources);
  const {
    moveWidget,
    resizeWidget,
    updateWidgetProp,
    removeWidget,
    snapshot,
    setCanvasSize,
    bringToFront,
    sendToBack,
    renameWidget,
    addTab,
    removeTab,
    toggleLock,
    alignWidgets,
    setTkTheme,
    distributeWidgets,
    makeSameSize,
    addMenuBar,
    removeMenuBar,
    addMenu,
    removeMenu,
    renameMenu,
    addMenuItem,
    removeMenuItem,
    updateMenuItem,
    setRootBg,
    setRootResizable,
    setLayoutManager,
    updateGridLayout,
  } = useDesignerStore();
  const [activeTab, setActiveTab] = useState<InspectorTab>("layout");
  const [fontPickerOpen, setFontPickerOpen] = useState(false);

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const widget = selectedId ? widgets.find((w) => w.id === selectedId) : null;
  const editableProps = useMemo(() => (widget ? getEditableProps(widget.type) : []), [widget]);

  const styleProps = useMemo(() => editableProps.filter((prop) => STYLE_KEYS.has(prop.key)), [editableProps]);
  const dataProps = useMemo(
    () => editableProps.filter((prop) => DATA_KEYS.has(prop.key) || (!STYLE_KEYS.has(prop.key) && !EVENT_KEYS.has(prop.key))),
    [editableProps],
  );
  const eventProps = useMemo(() => editableProps.filter((prop) => EVENT_KEYS.has(prop.key)), [editableProps]);

  const renderPropField = (prop: PropSpec, targetId: string, value: unknown) => {
    if (prop.key === "variable" || prop.key === "textvariable") {
      return (
        <FieldLabel key={prop.key} label={prop.label}>
          <SelectInput
            value={String(value ?? "")}
            onChange={(e) => {
              snapshot();
              updateWidgetProp(targetId, prop.key, e.target.value);
            }}
          >
            <option value="">- none -</option>
            {variables.map((variable) => (
              <option key={variable.id} value={variable.name}>{variable.name} ({variable.varType})</option>
            ))}
          </SelectInput>
        </FieldLabel>
      );
    }

    if (prop.type === "resource") {
      return (
        <FieldLabel key={prop.key} label={prop.label}>
          <SelectInput
            value={String(value ?? "")}
            onChange={(e) => {
              snapshot();
              updateWidgetProp(targetId, prop.key, e.target.value || undefined);
            }}
          >
            <option value="">- none -</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>{resource.name}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      );
    }

    if (prop.key === "font") {
      return (
        <FieldLabel key={prop.key} label={prop.label}>
          <div className="flex gap-1">
            <TextInput
              className="flex-1 font-mono"
              value={String(value ?? "")}
              onChange={(e) => updateWidgetProp(targetId, prop.key, e.target.value)}
              onBlur={() => snapshot()}
            />
            <TextButton className="w-7 shrink-0 px-0" onClick={() => setFontPickerOpen(true)}>...</TextButton>
          </div>
        </FieldLabel>
      );
    }

    if (prop.type === "select") {
      return (
        <FieldLabel key={prop.key} label={prop.label}>
          <SelectInput
            value={String(value ?? "")}
            onChange={(e) => {
              snapshot();
              updateWidgetProp(targetId, prop.key, e.target.value);
            }}
          >
            <option value="">-</option>
            {prop.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </SelectInput>
        </FieldLabel>
      );
    }

    if (prop.type === "color") {
      return (
        <FieldLabel key={prop.key} label={prop.label}>
          <input
            type="color"
            className={colorInputClass}
            value={String(value ?? "#000000")}
            onChange={(e) => updateWidgetProp(targetId, prop.key, e.target.value)}
            onBlur={() => snapshot()}
          />
        </FieldLabel>
      );
    }

    return (
      <FieldLabel key={prop.key} label={prop.label}>
        <TextInput
          type={prop.type === "number" ? "number" : "text"}
          value={String(value ?? "")}
          onChange={(e) => updateWidgetProp(targetId, prop.key, prop.type === "number" ? Number(e.target.value) : e.target.value)}
          onBlur={() => snapshot()}
        />
      </FieldLabel>
    );
  };

  const addMenuSeparator = (menuId: string) => {
    snapshot();
    useDesignerStore.setState((state) => {
      if (!state.menuBar) return state;
      return {
        menuBar: {
          ...state.menuBar,
          menus: state.menuBar.menus.map((menu) =>
            menu.id === menuId
              ? { ...menu, items: [...menu.items, { id: uuid(), label: "", separator: true }] }
              : menu,
          ),
        },
      };
    });
  };

  if (selectedIds.length > 1) {
    const selectedWidgets = widgets.filter((candidate) => selectedIds.includes(candidate.id));
    const commonProps = COMMON_PROPS.filter((propKey) =>
      selectedWidgets.every((candidate) => getEditableProps(candidate.type).some((prop) => prop.key === propKey)),
    );
    const getCommonValue = (key: string): unknown => {
      const values = selectedWidgets.map((candidate) => candidate.props[key]);
      const first = values[0];
      return values.every((value) => value === first) ? first : undefined;
    };

    return (
      <aside className="w-64 shrink-0 overflow-y-auto border-l border-[var(--td-border)] bg-[var(--td-bg-elevated)]">
        <PanelHeader title="Inspector" detail={`${selectedIds.length} selected`} />
        <PanelSection title="Align">
          <div className="grid grid-cols-3 gap-1">
            <TextButton className={tinyActionClass} onClick={() => alignWidgets(selectedIds, "left")}>Left</TextButton>
            <TextButton className={tinyActionClass} onClick={() => alignWidgets(selectedIds, "top")}>Top</TextButton>
            <TextButton className={tinyActionClass} onClick={() => alignWidgets(selectedIds, "centerH")}>Mid H</TextButton>
            <TextButton className={tinyActionClass} onClick={() => alignWidgets(selectedIds, "right")}>Right</TextButton>
            <TextButton className={tinyActionClass} onClick={() => alignWidgets(selectedIds, "bottom")}>Bottom</TextButton>
            <TextButton className={tinyActionClass} onClick={() => alignWidgets(selectedIds, "centerV")}>Mid V</TextButton>
          </div>
        </PanelSection>
        <PanelSection title="Distribute">
          <div className="grid grid-cols-2 gap-1">
            <TextButton className={tinyActionClass} disabled={selectedIds.length < 3} onClick={() => distributeWidgets(selectedIds, "horizontal")}>Horizontal</TextButton>
            <TextButton className={tinyActionClass} disabled={selectedIds.length < 3} onClick={() => distributeWidgets(selectedIds, "vertical")}>Vertical</TextButton>
          </div>
        </PanelSection>
        <PanelSection title="Sizing">
          <div className="grid grid-cols-3 gap-1">
            <TextButton className={tinyActionClass} disabled={selectedIds.length < 2} onClick={() => makeSameSize(selectedIds, "width")}>Same W</TextButton>
            <TextButton className={tinyActionClass} disabled={selectedIds.length < 2} onClick={() => makeSameSize(selectedIds, "height")}>Same H</TextButton>
            <TextButton className={tinyActionClass} disabled={selectedIds.length < 2} onClick={() => makeSameSize(selectedIds, "both")}>Both</TextButton>
          </div>
        </PanelSection>
        {commonProps.length > 0 && (
          <PanelSection title="Common Props">
            {commonProps.map((key) => {
              const value = getCommonValue(key);
              const spec = selectedWidgets.length > 0 ? getEditableProps(selectedWidgets[0].type).find((prop) => prop.key === key) : null;
              if (!spec) return null;
              return (
                <FieldLabel key={key} label={spec.label}>
                  {spec.type === "color" ? (
                    <input
                      type="color"
                      className={colorInputClass}
                      value={typeof value === "string" ? value : "#000000"}
                      onChange={(e) => selectedIds.forEach((id) => updateWidgetProp(id, key, e.target.value))}
                    />
                  ) : (
                    <TextInput
                      type={spec.type === "number" ? "number" : "text"}
                      value={value !== undefined ? String(value) : ""}
                      placeholder="(mixed)"
                      onChange={(e) => selectedIds.forEach((id) => updateWidgetProp(id, key, spec.type === "number" ? Number(e.target.value) : e.target.value))}
                    />
                  )}
                </FieldLabel>
              );
            })}
          </PanelSection>
        )}
        <PanelSection title="Selection">
          <TextButton
            variant="danger"
            className="w-full justify-center"
            onClick={() => {
              snapshot();
              selectedIds.forEach((id) => removeWidget(id));
            }}
          >
            Delete All
          </TextButton>
        </PanelSection>
      </aside>
    );
  }

  if (!widget) {
    return (
      <aside className="w-64 shrink-0 overflow-y-auto border-l border-[var(--td-border)] bg-[var(--td-bg-elevated)]">
        <PanelHeader title="Inspector" detail="Root window" />
        <PanelSection title="Window">
          <div className="grid grid-cols-2 gap-2">
            <FieldLabel label="Width">
              <TextInput
                type="number"
                value={canvasWidth}
                onChange={(e) => setCanvasSize(parseInt(e.target.value, 10) || 800, canvasHeight)}
                onBlur={() => snapshot()}
              />
            </FieldLabel>
            <FieldLabel label="Height">
              <TextInput
                type="number"
                value={canvasHeight}
                onChange={(e) => setCanvasSize(canvasWidth, parseInt(e.target.value, 10) || 600)}
                onBlur={() => snapshot()}
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Background">
            <input
              type="color"
              className={colorInputClass}
              value={rootBg || "#f0f0f0"}
              onChange={(e) => setRootBg(e.target.value)}
              onBlur={() => snapshot()}
            />
          </FieldLabel>
          <label className="flex h-7 items-center gap-2 text-[11px] text-[var(--td-text-muted)]">
            <input
              type="checkbox"
              className="accent-[var(--td-accent)]"
              checked={rootResizable}
              onChange={(e) => {
                setRootResizable(e.target.checked);
                snapshot();
              }}
            />
            Resizable
          </label>
        </PanelSection>
        <PanelSection title="Theme">
          <SelectInput value={tkTheme} onChange={(e) => setTkTheme(e.target.value)}>
            <option value="default">Default</option>
            <option value="clam">Clam</option>
            <option value="alt">Alt</option>
            <option value="classic">Classic</option>
          </SelectInput>
        </PanelSection>
        <PanelSection title="Menu Bar">
          {!menuBar ? (
            <TextButton
              className="w-full justify-center"
              onClick={() => {
                snapshot();
                addMenuBar();
              }}
            >
              Add Menu Bar
            </TextButton>
          ) : (
            <>
              <div className="flex gap-1">
                <TextButton className="flex-1 justify-center" onClick={() => addMenu("Menu")}>Add Menu</TextButton>
                <TextButton
                  variant="danger"
                  onClick={() => {
                    snapshot();
                    removeMenuBar();
                  }}
                >
                  Remove
                </TextButton>
              </div>
              <div className="space-y-2">
                {menuBar.menus.map((menu) => (
                  <div key={menu.id} className="border-t border-[var(--td-border)] pt-2">
                    <div className="mb-1 flex items-center gap-1">
                      <TextInput
                        className="flex-1"
                        value={menu.label}
                        onChange={(e) => renameMenu(menu.id, e.target.value)}
                        onBlur={() => snapshot()}
                      />
                      <TextButton
                        variant="danger"
                        className="w-7 px-0"
                        onClick={() => {
                          snapshot();
                          removeMenu(menu.id);
                        }}
                      >
                        x
                      </TextButton>
                    </div>
                    <div className="space-y-1">
                      {menu.items.map((item) =>
                        item.separator ? (
                          <div key={item.id} className="flex items-center gap-1 text-[10px] text-[var(--td-text-subtle)]">
                            <span className="flex-1">separator</span>
                            <TextButton
                              variant="danger"
                              className="h-5 w-6 px-0 text-[9px]"
                              onClick={() => {
                                snapshot();
                                removeMenuItem(menu.id, item.id);
                              }}
                            >
                              x
                            </TextButton>
                          </div>
                        ) : (
                          <div key={item.id} className="flex items-center gap-1">
                            <TextInput
                              className="flex-1"
                              value={item.label}
                              placeholder="Label"
                              onChange={(e) => updateMenuItem(menu.id, item.id, { label: e.target.value })}
                              onBlur={() => snapshot()}
                            />
                            <TextInput
                              className="w-16"
                              value={item.accelerator ?? ""}
                              placeholder="Ctrl+..."
                              onChange={(e) => updateMenuItem(menu.id, item.id, { accelerator: e.target.value })}
                              onBlur={() => snapshot()}
                            />
                            <TextButton
                              variant="danger"
                              className="h-7 w-6 px-0"
                              onClick={() => {
                                snapshot();
                                removeMenuItem(menu.id, item.id);
                              }}
                            >
                              x
                            </TextButton>
                          </div>
                        )
                      )}
                    </div>
                    <div className="mt-1 flex gap-2">
                      <button type="button" className="text-[10px] text-cyan-200 hover:text-cyan-100" onClick={() => addMenuItem(menu.id, "Item")}>Add Item</button>
                      <button type="button" className="text-[10px] text-[var(--td-text-muted)] hover:text-[var(--td-text)]" onClick={() => addMenuSeparator(menu.id)}>Add Separator</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="text-[10px] text-[var(--td-text-subtle)]">Select a widget to edit its properties.</p>
        </PanelSection>
      </aside>
    );
  }

  const eventCount = Object.values(widget.events ?? {}).filter((code) => code.trim().length > 0).length;
  const notebookTabs = widgets.filter((candidate) => candidate.parentId === widget.id);
  const linkableWidgets = widgets.filter((candidate) => candidate.id !== widget.id && (candidate.type === "Text" || candidate.type === "Listbox" || candidate.type === "Entry"));

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-l border-[var(--td-border)] bg-[var(--td-bg-elevated)]">
      <PanelHeader title={widget.name} detail={widget.type} />

      <div className="border-b border-[var(--td-border)] px-3 py-2">
        <FieldLabel label="Name">
          <TextInput
            className="font-mono"
            value={widget.name}
            onChange={(e) => renameWidget(widget.id, sanitizeWidgetName(e.target.value))}
            onBlur={() => snapshot()}
          />
        </FieldLabel>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {INSPECTOR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`h-7 rounded-md border px-1 text-[10px] transition-colors ${
                activeTab === tab.id
                  ? "border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100"
                  : "border-[var(--td-border)] bg-[var(--td-panel)] text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "layout" && (
        <PanelSection title="Geometry">
          <div className="flex gap-1">
            <TextButton
              variant={(widget.layoutManager ?? "place") === "place" ? "primary" : "ghost"}
              className="flex-1 justify-center"
              onClick={() => {
                snapshot();
                setLayoutManager(widget.id, "place");
              }}
            >
              place
            </TextButton>
            <TextButton
              variant={widget.layoutManager === "grid" ? "primary" : "ghost"}
              className="flex-1 justify-center"
              onClick={() => {
                snapshot();
                setLayoutManager(widget.id, "grid");
              }}
            >
              grid
            </TextButton>
          </div>
          {(widget.layoutManager ?? "place") === "place" ? (
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <FieldLabel key={key} label={key}>
                  <TextInput
                    type="number"
                    value={widget[key]}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value === null) return;
                      if (key === "x" || key === "y") {
                        moveWidget(widget.id, key === "x" ? value : widget.x, key === "y" ? value : widget.y);
                      } else {
                        resizeWidget(widget.id, key === "width" ? value : widget.width, key === "height" ? value : widget.height);
                      }
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <FieldLabel label="Row">
                  <TextInput
                    type="number"
                    min={1}
                    value={widget.gridRow ?? 1}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null && value >= 1) updateGridLayout(widget.id, { gridRow: value });
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
                <FieldLabel label="Column">
                  <TextInput
                    type="number"
                    min={1}
                    value={widget.gridCol ?? 1}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null && value >= 1) updateGridLayout(widget.id, { gridCol: value });
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
                <FieldLabel label="Row Span">
                  <TextInput
                    type="number"
                    min={1}
                    value={widget.gridRowSpan ?? 1}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null && value >= 1) updateGridLayout(widget.id, { gridRowSpan: value });
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
                <FieldLabel label="Col Span">
                  <TextInput
                    type="number"
                    min={1}
                    value={widget.gridColSpan ?? 1}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null && value >= 1) updateGridLayout(widget.id, { gridColSpan: value });
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
              </div>
              <FieldLabel label="Sticky">
                <SelectInput
                  value={widget.gridSticky ?? ""}
                  onChange={(e) => {
                    snapshot();
                    updateGridLayout(widget.id, { gridSticky: e.target.value || undefined });
                  }}
                >
                  <option value="">(none)</option>
                  <option value="n">n</option>
                  <option value="s">s</option>
                  <option value="e">e</option>
                  <option value="w">w</option>
                  <option value="ns">ns</option>
                  <option value="ew">ew</option>
                  <option value="nsew">nsew</option>
                  <option value="news">news</option>
                </SelectInput>
              </FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <FieldLabel label="Pad X">
                  <TextInput
                    type="number"
                    min={0}
                    value={widget.gridPadX ?? 0}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null && value >= 0) updateGridLayout(widget.id, { gridPadX: value });
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
                <FieldLabel label="Pad Y">
                  <TextInput
                    type="number"
                    min={0}
                    value={widget.gridPadY ?? 0}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null && value >= 0) updateGridLayout(widget.id, { gridPadY: value });
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
                <FieldLabel label="Width">
                  <TextInput
                    type="number"
                    value={widget.width}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null) resizeWidget(widget.id, value, widget.height);
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
                <FieldLabel label="Height">
                  <TextInput
                    type="number"
                    value={widget.height}
                    onChange={(e) => {
                      const value = toNumber(e.target.value);
                      if (value !== null) resizeWidget(widget.id, widget.width, value);
                    }}
                    onBlur={() => snapshot()}
                  />
                </FieldLabel>
              </div>
            </>
          )}
        </PanelSection>
      )}

      {activeTab === "style" && (
        <PanelSection title="Style">
          {styleProps.length > 0 ? styleProps.map((prop) => renderPropField(prop, widget.id, widget.props[prop.key])) : (
            <p className="text-[11px] text-[var(--td-text-subtle)]">No style properties for this widget.</p>
          )}
        </PanelSection>
      )}

      {activeTab === "data" && (
        <PanelSection title="Data">
          {dataProps.length > 0 ? dataProps.map((prop) => renderPropField(prop, widget.id, widget.props[prop.key])) : (
            <p className="text-[11px] text-[var(--td-text-subtle)]">No data properties for this widget.</p>
          )}
        </PanelSection>
      )}

      {activeTab === "events" && (
        <PanelSection title="Events">
          {eventProps.map((prop) => renderPropField(prop, widget.id, widget.props[prop.key]))}
          <div className="rounded-md border border-[var(--td-border)] bg-[var(--td-panel)] p-2">
            <div className="text-[11px] font-medium text-[var(--td-text)]">{eventCount} handler{eventCount === 1 ? "" : "s"}</div>
            <p className="mt-1 text-[10px] leading-4 text-[var(--td-text-muted)]">Double-click the widget on the canvas to open the event editor.</p>
          </div>
        </PanelSection>
      )}

      {activeTab === "advanced" && (
        <>
          {widget.type === "Notebook" && (
            <PanelSection title="Notebook Tabs">
              <TextButton
                className="w-full justify-center"
                onClick={() => {
                  snapshot();
                  addTab(widget.id);
                }}
              >
                Add Tab
              </TextButton>
              {notebookTabs.map((tab) => (
                <div key={tab.id} className="flex items-center gap-1">
                  <TextInput
                    className="flex-1"
                    value={String(tab.props.text ?? "")}
                    onChange={(e) => updateWidgetProp(tab.id, "text", e.target.value)}
                    onBlur={() => snapshot()}
                  />
                  <TextButton
                    variant="danger"
                    className="w-7 px-0"
                    onClick={() => {
                      snapshot();
                      removeTab(widget.id, tab.id);
                    }}
                  >
                    x
                  </TextButton>
                </div>
              ))}
            </PanelSection>
          )}

          {widget.type === "Scrollbar" && (
            <PanelSection title="Binding">
              <FieldLabel label="Link to widget">
                <SelectInput
                  value={widget.bindings?.command ?? ""}
                  onChange={(e) => {
                    const targetId = e.target.value || undefined;
                    snapshot();
                    useDesignerStore.setState((state) => ({
                      widgets: state.widgets.map((candidate) =>
                        candidate.id === widget.id ? { ...candidate, bindings: { ...candidate.bindings, command: targetId } } : candidate,
                      ),
                    }));
                  }}
                >
                  <option value="">- none -</option>
                  {linkableWidgets.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.type})</option>
                  ))}
                </SelectInput>
              </FieldLabel>
            </PanelSection>
          )}

          <PanelSection title="Z-Order">
            <div className="grid grid-cols-2 gap-1">
              <TextButton
                className="justify-center"
                onClick={() => {
                  snapshot();
                  bringToFront(widget.id);
                }}
              >
                Front
              </TextButton>
              <TextButton
                className="justify-center"
                onClick={() => {
                  snapshot();
                  sendToBack(widget.id);
                }}
              >
                Back
              </TextButton>
            </div>
          </PanelSection>

          <PanelSection title="Widget">
            <div className="grid grid-cols-2 gap-1">
              <TextButton
                variant={widget.locked ? "warning" : "ghost"}
                className="justify-center"
                onClick={() => {
                  snapshot();
                  toggleLock(widget.id);
                }}
              >
                {widget.locked ? "Unlock" : "Lock"}
              </TextButton>
              <TextButton
                variant="danger"
                className="justify-center"
                onClick={() => {
                  snapshot();
                  removeWidget(widget.id);
                }}
              >
                Delete
              </TextButton>
            </div>
          </PanelSection>
        </>
      )}

      {fontPickerOpen && (
        <FontPicker
          value={String(widget.props.font ?? "")}
          onChange={(value) => updateWidgetProp(widget.id, "font", value)}
          onClose={() => setFontPickerOpen(false)}
        />
      )}
    </aside>
  );
}
