import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useDesignerStore } from "../store/designerStore";
import { AssetIcon, ComponentIcon, LayersIcon, SearchIcon, VariableIcon, WidgetIcon } from "./icons";
import { EmptyState, PanelHeader, TextButton, TextInput } from "./ui";
import type { WidgetInstance, WidgetType, NonVisualType } from "../types/widgets";
import { useDraggable } from "@dnd-kit/core";

const STUDIO_TABS = [
  { id: "widgets", label: "Widgets", icon: WidgetIcon },
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "assets", label: "Assets", icon: AssetIcon },
  { id: "variables", label: "Variables", icon: VariableIcon },
  { id: "components", label: "Components", icon: ComponentIcon },
] as const;

type StudioTab = typeof STUDIO_TABS[number]["id"];

const WIDGET_GROUPS: { label: string; types: WidgetType[] }[] = [
  { label: "Container", types: ["Frame", "LabelFrame", "Notebook", "Toplevel"] },
  { label: "Display", types: ["Label", "Button", "Checkbutton", "Radiobutton", "Progressbar"] },
  { label: "Input", types: ["Entry", "Text", "Spinbox", "OptionMenu", "Combobox"] },
  { label: "Advanced", types: ["Listbox", "Scale", "Scrollbar", "Separator", "Treeview", "Menubutton", "Message", "Sizegrip"] },
];

const NON_VISUAL_TYPES: NonVisualType[] = ["Timer", "FileDialog", "ColorChooser", "MessageBox"];

function isContainer(widget: WidgetInstance): boolean {
  return widget.type === "Frame" || widget.type === "LabelFrame" || widget.type === "Notebook" || widget.type === "Toplevel";
}

function widgetMatchesSearch(widget: WidgetInstance, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    widget.name.toLowerCase().includes(q) ||
    widget.type.toLowerCase().includes(q) ||
    String(widget.props.text ?? "").toLowerCase().includes(q)
  );
}

function subtreeMatchesSearch(widget: WidgetInstance, query: string, allWidgets: WidgetInstance[]): boolean {
  if (widgetMatchesSearch(widget, query)) return true;
  return allWidgets
    .filter((candidate) => candidate.parentId === widget.id)
    .some((child) => subtreeMatchesSearch(child, query, allWidgets));
}

function WidgetPaletteItem({ type }: { type: WidgetType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { fromToolbox: true, widgetType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Drag to add ${type} widget`}
      className={`flex cursor-grab items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-[11px] transition-colors ${
        isDragging ? "opacity-40" : "text-[var(--td-text-muted)] hover:border-[var(--td-border)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
      }`}
    >
      <span>{type}</span>
      <span className="font-mono text-[10px] text-[var(--td-text-subtle)]">{type.slice(0, 3)}</span>
    </div>
  );
}

function WidgetsTab() {
  const [query, setQuery] = useState("");
  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return WIDGET_GROUPS
      .map((group) => ({
        ...group,
        types: normalized
          ? group.types.filter((type) => type.toLowerCase().includes(normalized))
          : group.types,
      }))
      .filter((group) => group.types.length > 0);
  }, [query]);

  return (
    <>
      <PanelHeader title="Widgets" detail="Drag controls onto the canvas" />
      <div className="border-b border-[var(--td-border)] p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1.5 h-4 w-4 text-[var(--td-text-subtle)]" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search widgets"
            aria-label="Search widgets"
            className="pl-7"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filteredGroups.length === 0 ? (
          <EmptyState title="No Widgets" body="No widget names match this search." />
        ) : (
          filteredGroups.map((group) => (
            <section key={group.label} className="mb-3">
              <div className="mb-1 px-1 text-[10px] font-semibold uppercase text-[var(--td-text-subtle)]">{group.label}</div>
              <div className="space-y-0.5">
                {group.types.map((type) => (
                  <WidgetPaletteItem key={type} type={type} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}

function LayerNode({
  widget,
  depth = 0,
  searchQuery,
  onDragStart,
  onDrop,
  allWidgets,
}: {
  widget: WidgetInstance;
  depth?: number;
  searchQuery: string;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, targetId: string | null) => void;
  allWidgets: WidgetInstance[];
}) {
  const widgets = useDesignerStore((state) => state.widgets);
  const selectedIds = useDesignerStore((state) => state.selectedIds);
  const selectWidget = useDesignerStore((state) => state.selectWidget);
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const children = widgets.filter((candidate) => candidate.parentId === widget.id);
  const isSelected = selectedIds.includes(widget.id);
  const canContainChildren = isContainer(widget) || children.length > 0;
  const visibleChildren = searchQuery
    ? children.filter((child) => subtreeMatchesSearch(child, searchQuery, allWidgets))
    : children;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md py-1 pr-2 text-[11px] transition-colors ${
          isSelected ? "bg-[var(--td-accent-soft)] text-cyan-100" : "text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
        } ${dragOver ? "ring-1 ring-[var(--td-accent-border)]" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => selectWidget(widget.id)}
        draggable
        onDragStart={(event) => onDragStart(event, widget.id)}
        onDragOver={(event) => {
          if (!canContainChildren) return;
          event.preventDefault();
          event.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          onDrop(event, widget.id);
        }}
      >
        {canContainChildren ? (
          <button
            type="button"
            className="h-4 w-4 shrink-0 rounded text-[10px] text-[var(--td-text-subtle)] hover:bg-[var(--td-panel)] hover:text-[var(--td-text)]"
            aria-label={expanded ? `Collapse ${widget.name}` : `Expand ${widget.name}`}
            title={expanded ? `Collapse ${widget.name}` : `Expand ${widget.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((open) => !open);
            }}
          >
            {expanded ? "v" : ">"}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{widget.name || String(widget.props.text ?? widget.type)}</span>
        {widget.locked && <span className="text-[9px] uppercase text-amber-300">Locked</span>}
        <span className="max-w-16 truncate text-right text-[10px] text-[var(--td-text-subtle)]">{widget.type}</span>
      </div>
      {expanded && visibleChildren.map((child) => (
        <LayerNode
          key={child.id}
          widget={child}
          depth={depth + 1}
          searchQuery={searchQuery}
          onDragStart={onDragStart}
          onDrop={onDrop}
          allWidgets={allWidgets}
        />
      ))}
    </div>
  );
}

function LayersTab() {
  const widgets = useDesignerStore((state) => state.widgets);
  const reparentWidget = useDesignerStore((state) => state.reparentWidget);
  const snapshot = useDesignerStore((state) => state.snapshot);
  const projectName = useDesignerStore((state) => state.projectName);
  const selectedIds = useDesignerStore((state) => state.selectedIds);
  const selectWidget = useDesignerStore((state) => state.selectWidget);
  const canvasWidth = useDesignerStore((state) => state.canvasWidth);
  const canvasHeight = useDesignerStore((state) => state.canvasHeight);
  const [searchQuery, setSearchQuery] = useState("");
  const [rootExpanded, setRootExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const isRootSelected = selectedIds.length === 0;

  const rootChildren = useMemo(
    () => widgets.filter((widget) => widget.parentId === null && widget.type !== "Toplevel"),
    [widgets],
  );
  const toplevels = useMemo(
    () => widgets.filter((widget) => widget.parentId === null && widget.type === "Toplevel"),
    [widgets],
  );
  const filteredRootChildren = searchQuery
    ? rootChildren.filter((widget) => subtreeMatchesSearch(widget, searchQuery, widgets))
    : rootChildren;
  const filteredToplevels = searchQuery
    ? toplevels.filter((widget) => subtreeMatchesSearch(widget, searchQuery, widgets))
    : toplevels;

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDropOnWidget = (_event: DragEvent<HTMLDivElement>, targetId: string | null) => {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (!currentDraggedId || currentDraggedId === targetId) return;
    if (targetId !== null) {
      const target = widgets.find((widget) => widget.id === targetId);
      if (!target || !isContainer(target)) return;
    }
    snapshot();
    reparentWidget(currentDraggedId, targetId);
  };

  const handleDropOnRoot = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (!currentDraggedId) return;
    snapshot();
    reparentWidget(currentDraggedId, null);
  };

  return (
    <>
      <PanelHeader title="Layers" detail={`${widgets.length} widget${widgets.length === 1 ? "" : "s"}`} />
      <div className="border-b border-[var(--td-border)] p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1.5 h-4 w-4 text-[var(--td-text-subtle)]" />
          <TextInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search layers"
            aria-label="Search layers"
            className="pl-7"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2" onDragOver={(event) => event.preventDefault()}>
        <div
          className={`mb-1 flex items-center gap-1 rounded-md py-1 pr-2 text-[11px] transition-colors ${
            isRootSelected ? "bg-[var(--td-accent-soft)] text-cyan-100" : "text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
          }`}
          style={{ paddingLeft: "8px" }}
          onClick={() => selectWidget(null)}
          onDrop={handleDropOnRoot}
        >
          <button
            type="button"
            className="h-4 w-4 shrink-0 rounded text-[10px] text-[var(--td-text-subtle)] hover:bg-[var(--td-panel)] hover:text-[var(--td-text)]"
            aria-label={rootExpanded ? "Collapse project root" : "Expand project root"}
            title={rootExpanded ? "Collapse project root" : "Expand project root"}
            onClick={(event) => {
              event.stopPropagation();
              setRootExpanded((open) => !open);
            }}
          >
            {rootExpanded ? "v" : ">"}
          </button>
          <span className="min-w-0 flex-1 truncate font-medium">{projectName}</span>
          <span className="text-[10px] text-[var(--td-text-subtle)]">{canvasWidth}x{canvasHeight}</span>
        </div>

        {rootExpanded && filteredRootChildren.map((widget) => (
          <LayerNode
            key={widget.id}
            widget={widget}
            searchQuery={searchQuery}
            onDragStart={handleDragStart}
            onDrop={handleDropOnWidget}
            allWidgets={widgets}
          />
        ))}

        {filteredToplevels.map((widget) => (
          <LayerNode
            key={widget.id}
            widget={widget}
            searchQuery={searchQuery}
            onDragStart={handleDragStart}
            onDrop={handleDropOnWidget}
            allWidgets={widgets}
          />
        ))}

        {widgets.length === 0 && !searchQuery && (
          <EmptyState title="No Layers" body="Drop widgets onto the canvas to populate the project tree." />
        )}
      </div>
    </>
  );
}

function AssetsTab() {
  const resources = useDesignerStore((state) => state.resources);
  const previewResources = resources.slice(0, 12);

  return (
    <>
      <PanelHeader title="Assets" detail={`${resources.length} image${resources.length === 1 ? "" : "s"}`} />
      <div className="flex-1 overflow-y-auto p-3">
        {resources.length === 0 ? (
          <EmptyState title="No Images" body="Image resources added from the command bar will appear here." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previewResources.map((resource) => (
              <div key={resource.id} className="min-w-0 rounded-md border border-[var(--td-border)] bg-[var(--td-panel)] p-1.5">
                <img src={resource.dataUrl} alt={resource.name} className="h-14 w-full rounded object-contain" />
                <div className="mt-1 truncate text-center text-[9px] text-[var(--td-text-muted)]">{resource.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function VariablesTab() {
  const variables = useDesignerStore((state) => state.variables);

  return (
    <>
      <PanelHeader title="Variables" detail={`${variables.length} variable${variables.length === 1 ? "" : "s"}`} />
      <div className="flex-1 overflow-y-auto p-3">
        {variables.length === 0 ? (
          <EmptyState title="No Variables" body="Variables added from the command bar will appear here." />
        ) : (
          <div className="space-y-1.5">
            {variables.map((variable) => (
              <div key={variable.id} className="rounded-md border border-[var(--td-border)] bg-[var(--td-panel)] px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-medium text-[var(--td-text)]">{variable.name}</span>
                  <span className="shrink-0 font-mono text-[9px] text-[var(--td-text-subtle)]">{variable.varType}</span>
                </div>
                {variable.defaultValue && (
                  <div className="mt-0.5 truncate text-[10px] text-[var(--td-text-muted)]">Default: {variable.defaultValue}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ComponentsTab() {
  const nonVisuals = useDesignerStore((state) => state.nonVisuals);
  const addNonVisual = useDesignerStore((state) => state.addNonVisual);

  return (
    <>
      <PanelHeader title="Components" detail={`${nonVisuals.length} component${nonVisuals.length === 1 ? "" : "s"}`} />
      <div className="border-b border-[var(--td-border)] p-3">
        <div className="grid grid-cols-2 gap-1.5">
          {NON_VISUAL_TYPES.map((type) => (
            <TextButton key={type} variant="ghost" className="justify-center" onClick={() => addNonVisual(type)}>
              Add {type}
            </TextButton>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {nonVisuals.length === 0 ? (
          <EmptyState title="No Components" body="Add non-visual components to include dialogs, timers, and message boxes." />
        ) : (
          <div className="space-y-1.5">
            {nonVisuals.map((component) => (
              <div key={component.id} className="rounded-md border border-[var(--td-border)] bg-[var(--td-panel)] px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-medium text-[var(--td-text)]">{component.name}</span>
                  <span className="shrink-0 font-mono text-[9px] text-[var(--td-text-subtle)]">{component.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ActivePanel({ activeTab }: { activeTab: StudioTab }) {
  if (activeTab === "layers") return <LayersTab />;
  if (activeTab === "assets") return <AssetsTab />;
  if (activeTab === "variables") return <VariablesTab />;
  if (activeTab === "components") return <ComponentsTab />;
  return <WidgetsTab />;
}

export function StudioRail() {
  const [activeTab, setActiveTab] = useState<StudioTab>("widgets");

  return (
    <aside className="flex h-full shrink-0 border-r border-[var(--td-border)] bg-[var(--td-panel)]">
      <nav className="flex w-12 flex-col items-center gap-1 border-r border-[var(--td-border)] py-2" aria-label="Studio sections">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              title={tab.label}
              aria-pressed={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-md border text-[var(--td-text-muted)] transition-colors ${
                active
                  ? "border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100"
                  : "border-transparent hover:border-[var(--td-border-strong)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>
      <div className="flex w-[260px] flex-col bg-[var(--td-bg-elevated)]">
        <ActivePanel activeTab={activeTab} />
      </div>
    </aside>
  );
}
