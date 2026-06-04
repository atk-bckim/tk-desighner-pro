import { useMemo, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
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
type ChildrenByParent = Map<string | null, WidgetInstance[]>;
type WidgetById = Map<string, WidgetInstance>;

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

function buildLayerIndexes(widgets: WidgetInstance[]): { childrenByParent: ChildrenByParent; widgetById: WidgetById } {
  const childrenByParent: ChildrenByParent = new Map();
  const widgetById: WidgetById = new Map();

  for (const widget of widgets) {
    widgetById.set(widget.id, widget);
  }

  for (const widget of widgets) {
    const parentId = widget.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(widget);
    childrenByParent.set(parentId, siblings);
  }

  return { childrenByParent, widgetById };
}

function buildSearchMatchSet(
  widgets: WidgetInstance[],
  query: string,
  childrenByParent: ChildrenByParent,
): Set<string> | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const matches = new Set<string>();
  const memo = new Map<string, boolean>();
  const visit = (widget: WidgetInstance, visited: Set<string>): boolean => {
    if (visited.has(widget.id)) return false;
    const cached = memo.get(widget.id);
    if (cached !== undefined) return cached;

    const nextVisited = new Set(visited);
    nextVisited.add(widget.id);

    const children = childrenByParent.get(widget.id) ?? [];
    const hasMatchingChild = children.some((child) => visit(child, nextVisited));
    const selfMatches = widgetMatchesSearch(widget, normalized);

    if (selfMatches || hasMatchingChild) {
      matches.add(widget.id);
      memo.set(widget.id, true);
      return true;
    }
    memo.set(widget.id, false);
    return false;
  };

  for (const widget of childrenByParent.get(null) ?? []) {
    visit(widget, new Set());
  }
  for (const widget of widgets) {
    visit(widget, new Set());
  }

  return matches;
}

function isDescendant(
  sourceId: string,
  candidateDescendantId: string,
  childrenByParent: ChildrenByParent,
  visited = new Set<string>(),
): boolean {
  if (visited.has(sourceId)) return false;
  visited.add(sourceId);

  for (const child of childrenByParent.get(sourceId) ?? []) {
    if (child.id === candidateDescendantId) return true;
    if (isDescendant(child.id, candidateDescendantId, childrenByParent, visited)) return true;
  }

  return false;
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
  searchActive,
  searchMatchIds,
  childrenByParent,
  selectedIds,
  selectWidget,
  onDragStart,
  onDrop,
  ancestorIds,
}: {
  widget: WidgetInstance;
  depth?: number;
  searchActive: boolean;
  searchMatchIds: Set<string> | null;
  childrenByParent: ChildrenByParent;
  selectedIds: string[];
  selectWidget: (id: string | null, multi?: boolean) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, targetId: string | null) => void;
  ancestorIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const childAncestorIds = new Set(ancestorIds);
  childAncestorIds.add(widget.id);
  const children = childrenByParent.get(widget.id) ?? [];
  const isSelected = selectedIds.includes(widget.id);
  const canContainChildren = isContainer(widget) || children.length > 0;
  const isExpanded = searchActive ? true : expanded;
  const visibleChildren = (searchMatchIds
    ? children.filter((child) => searchMatchIds.has(child.id))
    : children
  ).filter((child) => !childAncestorIds.has(child.id));
  const nodeLabel = widget.name || String(widget.props.text ?? widget.type);
  const toggleLabel = searchActive
    ? `Search keeps ${nodeLabel} expanded`
    : isExpanded
      ? `Collapse ${nodeLabel}`
      : `Expand ${nodeLabel}`;
  const selectCurrentWidget = () => selectWidget(widget.id);
  const setExpandedFromInput = (open: boolean) => {
    if (!searchActive) setExpanded(open);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCurrentWidget();
      return;
    }
    if (event.key === "ArrowRight" && canContainChildren) {
      event.preventDefault();
      setExpandedFromInput(true);
      return;
    }
    if (event.key === "ArrowLeft" && canContainChildren) {
      event.preventDefault();
      setExpandedFromInput(false);
    }
  };

  return (
    <div role="none">
      <div
        role="treeitem"
        tabIndex={0}
        aria-level={depth + 2}
        aria-selected={isSelected}
        aria-expanded={canContainChildren ? isExpanded : undefined}
        className={`flex items-center gap-1 rounded-md py-1 pr-2 text-[11px] transition-colors ${
          isSelected ? "bg-[var(--td-accent-soft)] text-cyan-100" : "text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
        } ${dragOver ? "ring-1 ring-[var(--td-accent-border)]" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={selectCurrentWidget}
        onKeyDown={handleKeyDown}
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
            tabIndex={-1}
            className="h-4 w-4 shrink-0 rounded text-[10px] text-[var(--td-text-subtle)] hover:bg-[var(--td-panel)] hover:text-[var(--td-text)]"
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={(event) => {
              event.stopPropagation();
              if (!searchActive) setExpanded((open) => !open);
            }}
          >
            {isExpanded ? "v" : ">"}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{nodeLabel}</span>
        {widget.locked && <span className="text-[9px] uppercase text-amber-300">Locked</span>}
        <span className="max-w-16 truncate text-right text-[10px] text-[var(--td-text-subtle)]">{widget.type}</span>
      </div>
      {isExpanded && visibleChildren.length > 0 && (
        <div role="group">
          {visibleChildren.map((child) => (
            <LayerNode
              key={child.id}
              widget={child}
              depth={depth + 1}
              searchActive={searchActive}
              searchMatchIds={searchMatchIds}
              childrenByParent={childrenByParent}
              selectedIds={selectedIds}
              selectWidget={selectWidget}
              onDragStart={onDragStart}
              onDrop={onDrop}
              ancestorIds={childAncestorIds}
            />
          ))}
        </div>
      )}
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
  const searchActive = searchQuery.trim().length > 0;
  const { childrenByParent, widgetById } = useMemo(() => buildLayerIndexes(widgets), [widgets]);
  const searchMatchIds = useMemo(
    () => buildSearchMatchSet(widgets, searchQuery, childrenByParent),
    [widgets, searchQuery, childrenByParent],
  );

  const rootChildren = useMemo(
    () => (childrenByParent.get(null) ?? []).filter((widget) => widget.type !== "Toplevel"),
    [childrenByParent],
  );
  const toplevels = useMemo(
    () => (childrenByParent.get(null) ?? []).filter((widget) => widget.type === "Toplevel"),
    [childrenByParent],
  );
  const filteredRootChildren = searchMatchIds
    ? rootChildren.filter((widget) => searchMatchIds.has(widget.id))
    : rootChildren;
  const filteredToplevels = searchMatchIds
    ? toplevels.filter((widget) => searchMatchIds.has(widget.id))
    : toplevels;
  const rootCanExpand = rootChildren.length > 0;
  const isRootExpanded = searchActive ? true : rootExpanded;
  const rootToggleLabel = searchActive
    ? "Search keeps project root expanded"
    : isRootExpanded
      ? "Collapse project root"
      : "Expand project root";
  const canReparent = (widgetId: string, targetId: string | null): boolean => {
    const draggedWidget = widgetById.get(widgetId);
    if (!draggedWidget) return false;
    if (widgetId === targetId) return false;
    if (draggedWidget.parentId === targetId) return false;
    if (targetId === null) return true;

    const target = widgetById.get(targetId);
    if (!target || !isContainer(target)) return false;
    return !isDescendant(widgetId, targetId, childrenByParent);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDropOnWidget = (_event: DragEvent<HTMLDivElement>, targetId: string | null) => {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (!currentDraggedId || !canReparent(currentDraggedId, targetId)) return;
    snapshot();
    reparentWidget(currentDraggedId, targetId);
  };

  const handleDropOnRoot = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (!currentDraggedId || !canReparent(currentDraggedId, null)) return;
    snapshot();
    reparentWidget(currentDraggedId, null);
  };
  const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectWidget(null);
      return;
    }
    if (event.key === "ArrowRight" && rootCanExpand) {
      event.preventDefault();
      if (!searchActive) setRootExpanded(true);
      return;
    }
    if (event.key === "ArrowLeft" && rootCanExpand) {
      event.preventDefault();
      if (!searchActive) setRootExpanded(false);
    }
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
      <div
        role="tree"
        aria-label="Project layers"
        className="flex-1 overflow-y-auto px-2 py-2"
        onDragOver={(event) => event.preventDefault()}
      >
        <div
          role="treeitem"
          tabIndex={0}
          aria-level={1}
          aria-selected={isRootSelected}
          aria-expanded={rootCanExpand ? isRootExpanded : undefined}
          className={`mb-1 flex items-center gap-1 rounded-md py-1 pr-2 text-[11px] transition-colors ${
            isRootSelected ? "bg-[var(--td-accent-soft)] text-cyan-100" : "text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
          }`}
          style={{ paddingLeft: "8px" }}
          onClick={() => selectWidget(null)}
          onKeyDown={handleRootKeyDown}
          onDrop={handleDropOnRoot}
        >
          <button
            type="button"
            tabIndex={-1}
            className="h-4 w-4 shrink-0 rounded text-[10px] text-[var(--td-text-subtle)] hover:bg-[var(--td-panel)] hover:text-[var(--td-text)]"
            aria-label={rootToggleLabel}
            title={rootToggleLabel}
            onClick={(event) => {
              event.stopPropagation();
              if (!searchActive) setRootExpanded((open) => !open);
            }}
          >
            {isRootExpanded ? "v" : ">"}
          </button>
          <span className="min-w-0 flex-1 truncate font-medium">{projectName}</span>
          <span className="text-[10px] text-[var(--td-text-subtle)]">{canvasWidth}x{canvasHeight}</span>
        </div>

        {isRootExpanded && filteredRootChildren.length > 0 && (
          <div role="group">
            {filteredRootChildren.map((widget) => (
              <LayerNode
                key={widget.id}
                widget={widget}
                searchActive={searchActive}
                searchMatchIds={searchMatchIds}
                childrenByParent={childrenByParent}
                selectedIds={selectedIds}
                selectWidget={selectWidget}
                onDragStart={handleDragStart}
                onDrop={handleDropOnWidget}
                ancestorIds={new Set()}
              />
            ))}
          </div>
        )}

        {filteredToplevels.map((widget) => (
          <LayerNode
            key={widget.id}
            widget={widget}
            searchActive={searchActive}
            searchMatchIds={searchMatchIds}
            childrenByParent={childrenByParent}
            selectedIds={selectedIds}
            selectWidget={selectWidget}
            onDragStart={handleDragStart}
            onDrop={handleDropOnWidget}
            ancestorIds={new Set()}
          />
        ))}

        {widgets.length === 0 && !searchQuery && (
          <EmptyState title="No Layers" body="Drop widgets onto the canvas to populate the project tree." />
        )}
        {widgets.length > 0 && searchActive && filteredRootChildren.length === 0 && filteredToplevels.length === 0 && (
          <EmptyState title="No Layers" body="No layer names, types, or text properties match this search." />
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
