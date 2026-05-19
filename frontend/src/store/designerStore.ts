import { create } from "zustand";
import type { WidgetInstance, WidgetType, Project, MenuBarData, MenuItemData, TkVariable, TkVarType } from "../types/widgets";
import { createWidget, resetCounters } from "../utils/widgetDefaults";
import { TEMPLATES } from "../templates/index";
import { v4 as uuid } from "uuid";
import { getAbsolutePosition } from "../utils/position";

interface DesignerState {
  projectName: string;
  canvasWidth: number;
  canvasHeight: number;
  widgets: WidgetInstance[];
  selectedIds: string[];

  addWidget: (type: WidgetType, x: number, y: number, parentId?: string | null) => void;
  removeWidget: (id: string) => void;
  selectWidget: (id: string | null, multi?: boolean) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetProp: (id: string, key: string, value: unknown) => void;
  renameWidget: (id: string, name: string) => void;
  loadProject: (project: Project) => void;
  exportProject: () => Project;
  setProjectName: (name: string) => void;

  undoStack: WidgetInstance[][];
  redoStack: WidgetInstance[][];
  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  duplicateWidget: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  setCanvasSize: (width: number, height: number) => void;

  rootBg: string;
  setRootBg: (color: string) => void;
  rootResizable: boolean;
  setRootResizable: (v: boolean) => void;

  gridSize: number;
  snapEnabled: boolean;
  setGridSize: (size: number) => void;
  toggleSnap: () => void;

  alignWidgets: (ids: string[], direction: "left" | "right" | "top" | "bottom" | "centerH" | "centerV") => void;

  toggleLock: (id: string) => void;

  zoom: number;
  setZoom: (z: number) => void;

  addTab: (notebookId: string) => void;
  removeTab: (notebookId: string, tabId: string) => void;
  setActiveTab: (notebookId: string, index: number) => void;

  tkTheme: string;
  setTkTheme: (theme: string) => void;
  loadTemplate: (templateKey: string) => void;

  reparentWidget: (widgetId: string, newParentId: string | null) => void;

  mousePos: { x: number; y: number } | null;
  setMousePos: (pos: { x: number; y: number } | null) => void;

  clipboard: WidgetInstance[];
  copyWidgets: (ids: string[]) => void;
  pasteWidgets: () => void;
  selectAll: () => void;
  distributeWidgets: (ids: string[], direction: "horizontal" | "vertical") => void;
  makeSameSize: (ids: string[], dimension: "width" | "height" | "both") => void;

  menuBar: MenuBarData | null;
  addMenuBar: () => void;
  removeMenuBar: () => void;
  addMenu: (label: string) => void;
  removeMenu: (menuId: string) => void;
  renameMenu: (menuId: string, label: string) => void;
  addMenuItem: (menuId: string, label: string) => void;
  removeMenuItem: (menuId: string, itemId: string) => void;
  updateMenuItem: (menuId: string, itemId: string, updates: Partial<MenuItemData>) => void;

  updateWidgetEvent: (id: string, eventName: string, code: string) => void;
  removeWidgetEvent: (id: string, eventName: string) => void;

  tabOrderMode: boolean;
  toggleTabOrderMode: () => void;

  variables: TkVariable[];
  addVariable: (varType: TkVarType) => void;
  removeVariable: (id: string) => void;
  renameVariable: (id: string, name: string) => void;
  updateVariableDefault: (id: string, defaultValue: string) => void;
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  projectName: "Untitled",
  canvasWidth: 800,
  canvasHeight: 600,
  widgets: [],
  selectedIds: [],

  addWidget: (type, x, y, parentId = null) => {
    const widget = createWidget(type, x, y, parentId);
    set((s) => ({ widgets: [...s.widgets, widget], selectedIds: [widget.id] }));
  },

  removeWidget: (id) => {
    const toRemove = new Set<string>();
    const collect = (parentId: string) => {
      toRemove.add(parentId);
      get().widgets.filter(w => w.parentId === parentId).forEach(w => collect(w.id));
    };
    collect(id);
    set((s) => ({
      widgets: s.widgets.filter((w) => !toRemove.has(w.id)),
      selectedIds: s.selectedIds.filter(i => !toRemove.has(i)),
    }));
  },

  selectWidget: (id, multi = false) => {
    if (id === null) { set({ selectedIds: [] }); return; }
    set((s) => {
      if (multi) {
        const has = s.selectedIds.includes(id);
        return { selectedIds: has ? s.selectedIds.filter(i => i !== id) : [...s.selectedIds, id] };
      }
      return { selectedIds: [id] };
    });
  },

  moveWidget: (id, x, y) => {
    set((s) => ({
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, x, y } : w
      ),
    }));
  },

  resizeWidget: (id, width, height) => {
    set((s) => ({
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, width: Math.max(20, width), height: Math.max(20, height) } : w,
      ),
    }));
  },

  updateWidgetProp: (id, key, value) => {
    set((s) => ({
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, props: { ...w.props, [key]: value } } : w,
      ),
    }));
  },

  renameWidget: (id, name) => {
    set((s) => ({
      widgets: s.widgets.map((w) => (w.id === id ? { ...w, name } : w)),
    }));
  },

  loadProject: (project) => {
    resetCounters(project.widgets);
    set({
      projectName: project.name,
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
      widgets: project.widgets,
      selectedIds: [],
      menuBar: project.menuBar ?? null,
      rootBg: project.rootBg ?? "",
      rootResizable: project.rootResizable ?? true,
      variables: project.variables ?? [],
    });
  },

  exportProject: () => {
    const s = get();
    return {
      name: s.projectName,
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      widgets: s.widgets,
      menuBar: s.menuBar,
      rootBg: s.rootBg,
      rootResizable: s.rootResizable,
      variables: s.variables,
    };
  },

  setProjectName: (name) => set({ projectName: name }),

  undoStack: [],
  redoStack: [],

  snapshot: () => {
    const current = get().widgets;
    set((s) => {
      const stack = [...s.undoStack, current];
      return { undoStack: stack.length > 100 ? stack.slice(-100) : stack, redoStack: [] };
    });
  },

  undo: () => {
    const { undoStack, widgets } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      widgets: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, widgets],
      selectedIds: [],
    });
  },

  redo: () => {
    const { redoStack, widgets } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      widgets: next,
      undoStack: [...get().undoStack, widgets],
      redoStack: redoStack.slice(0, -1),
      selectedIds: [],
    });
  },

  duplicateWidget: (id) => {
    const widget = get().widgets.find((w) => w.id === id);
    if (!widget) return;

    const idMap = new Map<string, string>();
    const clones: WidgetInstance[] = [];

    const cloneWidget = (origId: string, newParentId: string | null) => {
      const orig = get().widgets.find((w) => w.id === origId);
      if (!orig) return;
      const newId = uuid();
      idMap.set(origId, newId);
      const clone: WidgetInstance = {
        ...orig,
        id: newId,
        name: orig.name + "_copy",
        parentId: newParentId,
        x: orig.x + 20,
        y: orig.y + 20,
        props: { ...orig.props },
      };
      clones.push(clone);
      // Clone children recursively
      get()
        .widgets.filter((w) => w.parentId === origId)
        .forEach((child) => {
          cloneWidget(child.id, newId);
        });
    };

    cloneWidget(id, widget.parentId);
    set((s) => ({
      widgets: [...s.widgets, ...clones],
      selectedIds: [idMap.get(id)!],
    }));
  },

  bringToFront: (id) => {
    set((s) => {
      const idx = s.widgets.findIndex(w => w.id === id);
      if (idx === -1) return s;
      const w = s.widgets[idx];
      const rest = s.widgets.filter((_, i) => i !== idx);
      return { widgets: [...rest, w] };
    });
  },

  sendToBack: (id) => {
    set((s) => {
      const idx = s.widgets.findIndex(w => w.id === id);
      if (idx === -1) return s;
      const w = s.widgets[idx];
      const rest = s.widgets.filter((_, i) => i !== idx);
      return { widgets: [w, ...rest] };
    });
  },

  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  rootBg: "",
  setRootBg: (color) => set({ rootBg: color }),
  rootResizable: true,
  setRootResizable: (v) => set({ rootResizable: v }),

  gridSize: 10,
  snapEnabled: true,

  setGridSize: (size) => set({ gridSize: size }),

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  alignWidgets: (ids, direction) => {
    set((s) => {
      const targets = s.widgets.filter(w => ids.includes(w.id));
      if (targets.length < 2) return s;
      const ref = targets[0];
      const updated = s.widgets.map(w => {
        if (!ids.includes(w.id)) return w;
        switch (direction) {
          case "left": return { ...w, x: ref.x };
          case "right": return { ...w, x: ref.x + ref.width - w.width };
          case "top": return { ...w, y: ref.y };
          case "bottom": return { ...w, y: ref.y + ref.height - w.height };
          case "centerH": return { ...w, y: ref.y + Math.round((ref.height - w.height) / 2) };
          case "centerV": return { ...w, x: ref.x + Math.round((ref.width - w.width) / 2) };
          default: return w;
        }
      });
      return { widgets: updated };
    });
  },

  toggleLock: (id: string) => {
    set((s) => ({
      widgets: s.widgets.map(w => w.id === id ? { ...w, locked: !w.locked } : w),
    }));
  },

  zoom: 1,
  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(3, Math.round(z * 100) / 100)) }),

  addTab: (notebookId: string) => {
    const tabs = get().widgets.filter(w => w.parentId === notebookId);
    const tab = createWidget("Frame", 0, 30, notebookId);
    tab.props.text = `Tab ${tabs.length + 1}`;
    tab.width = 0;
    tab.height = 0;
    set((s) => ({ widgets: [...s.widgets, tab] }));
  },

  removeTab: (_notebookId: string, tabId: string) => {
    get().removeWidget(tabId);
  },

  setActiveTab: (notebookId: string, index: number) => {
    set((s) => ({
      widgets: s.widgets.map(w => w.id === notebookId ? { ...w, props: { ...w.props, activeTab: index } } : w),
    }));
  },

  tkTheme: "default",
  setTkTheme: (theme) => set({ tkTheme: theme }),

  loadTemplate: (templateKey: string) => {
    const template = TEMPLATES[templateKey];
    if (!template) return;
    const widgets = template.create();
    set({ widgets, selectedIds: [], undoStack: [], redoStack: [] });
  },

  mousePos: null,
  setMousePos: (pos) => set({ mousePos: pos }),

  reparentWidget: (widgetId, newParentId) => {
    const { widgets } = get();

    // Prevent dropping onto self
    if (widgetId === newParentId) return;

    // Prevent circular: check if newParentId is a descendant of widgetId
    if (newParentId) {
      const collectDescendants = (id: string): Set<string> => {
        const set = new Set<string>();
        widgets.filter(w => w.parentId === id).forEach(w => {
          set.add(w.id);
          collectDescendants(w.id).forEach(d => set.add(d));
        });
        return set;
      };
      if (collectDescendants(widgetId).has(newParentId)) return;
    }

    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Compute current absolute position
    const currentAbs = getAbsolutePosition(widget, widgets);

    // Compute new relative position within new parent
    let newX = currentAbs.x;
    let newY = currentAbs.y;
    if (newParentId) {
      const newParent = widgets.find(w => w.id === newParentId);
      if (newParent) {
        const parentAbs = getAbsolutePosition(newParent, widgets);
        newX = currentAbs.x - parentAbs.x;
        newY = currentAbs.y - parentAbs.y;
      }
    }

    set((s) => ({
      widgets: s.widgets.map(w =>
        w.id === widgetId ? { ...w, parentId: newParentId, x: newX, y: newY } : w
      ),
    }));
  },

  clipboard: [],

  copyWidgets: (ids) => {
    const { widgets } = get();
    // Copy widgets and their descendants
    const toCopy = new Set<string>();
    const collect = (id: string) => {
      toCopy.add(id);
      widgets.filter(w => w.parentId === id).forEach(w => collect(w.id));
    };
    ids.forEach(id => collect(id));
    set({ clipboard: widgets.filter(w => toCopy.has(w.id)).map(w => ({ ...w, props: { ...w.props } })) });
  },

  pasteWidgets: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;
    const idMap = new Map<string, string>();
    const clones: WidgetInstance[] = [];
    const clipboardIds = new Set(clipboard.map(w => w.id));

    // First pass: create all new IDs
    for (const orig of clipboard) {
      idMap.set(orig.id, uuid());
    }

    // Second pass: create clones with mapped IDs
    for (const orig of clipboard) {
      const newParentId = orig.parentId && clipboardIds.has(orig.parentId)
        ? idMap.get(orig.parentId)!
        : orig.parentId;
      clones.push({
        ...orig,
        id: idMap.get(orig.id)!,
        name: orig.name + "_paste",
        parentId: newParentId,
        x: orig.x + 20,
        y: orig.y + 20,
        props: { ...orig.props },
      });
    }

    // Select root clones (those whose original parentId was not in clipboard)
    const rootIds = clipboard
      .filter(w => !w.parentId || !clipboardIds.has(w.parentId))
      .map(w => idMap.get(w.id)!);

    set((s) => ({
      widgets: [...s.widgets, ...clones],
      selectedIds: rootIds,
    }));
  },

  selectAll: () => {
    set((s) => ({ selectedIds: s.widgets.map(w => w.id) }));
  },

  menuBar: null,

  addMenuBar: () => set({ menuBar: { menus: [
    { id: uuid(), label: "File", items: [
      { id: uuid(), label: "New", accelerator: "Ctrl+N" },
      { id: uuid(), label: "Exit", accelerator: "" },
    ] },
  ] } }),

  removeMenuBar: () => set({ menuBar: null }),

  addMenu: (label) => set((s) => {
    if (!s.menuBar) return s;
    return { menuBar: { ...s.menuBar, menus: [...s.menuBar.menus, { id: uuid(), label, items: [] }] } };
  }),

  removeMenu: (menuId) => set((s) => {
    if (!s.menuBar) return s;
    return { menuBar: { ...s.menuBar, menus: s.menuBar.menus.filter(m => m.id !== menuId) } };
  }),

  renameMenu: (menuId, label) => set((s) => {
    if (!s.menuBar) return s;
    return { menuBar: { ...s.menuBar, menus: s.menuBar.menus.map(m => m.id === menuId ? { ...m, label } : m) } };
  }),

  addMenuItem: (menuId, label) => set((s) => {
    if (!s.menuBar) return s;
    return { menuBar: { ...s.menuBar, menus: s.menuBar.menus.map(m =>
      m.id === menuId ? { ...m, items: [...m.items, { id: uuid(), label, accelerator: "" }] } : m
    ) } };
  }),

  removeMenuItem: (menuId, itemId) => set((s) => {
    if (!s.menuBar) return s;
    return { menuBar: { ...s.menuBar, menus: s.menuBar.menus.map(m =>
      m.id === menuId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m
    ) } };
  }),

  updateMenuItem: (menuId, itemId, updates) => set((s) => {
    if (!s.menuBar) return s;
    return { menuBar: { ...s.menuBar, menus: s.menuBar.menus.map(m =>
      m.id === menuId ? { ...m, items: m.items.map(i => i.id === itemId ? { ...i, ...updates } : i) } : m
    ) } };
  }),

  distributeWidgets: (ids, direction) => {
    set((s) => {
      const targets = s.widgets.filter(w => ids.includes(w.id));
      if (targets.length < 3) return s;
      const sorted = direction === "horizontal"
        ? [...targets].sort((a, b) => a.x - b.x)
        : [...targets].sort((a, b) => a.y - b.y);

      const totalSize = direction === "horizontal"
        ? sorted.reduce((sum, w) => sum + w.width, 0)
        : sorted.reduce((sum, w) => sum + w.height, 0);
      const minPos = direction === "horizontal" ? sorted[0].x : sorted[0].y;
      const maxPos = direction === "horizontal"
        ? sorted[sorted.length - 1].x + sorted[sorted.length - 1].width
        : sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
      const gap = (maxPos - minPos - totalSize) / (sorted.length - 1);

      const updated = [...sorted];
      let current = minPos;
      for (let i = 0; i < updated.length; i++) {
        if (direction === "horizontal") {
          updated[i] = { ...updated[i], x: Math.round(current) };
          current += updated[i].width + gap;
        } else {
          updated[i] = { ...updated[i], y: Math.round(current) };
          current += updated[i].height + gap;
        }
      }

      const updatedMap = new Map(updated.map(w => [w.id, w]));
      return {
        widgets: s.widgets.map(w => updatedMap.has(w.id) ? updatedMap.get(w.id)! : w),
      };
    });
  },

  makeSameSize: (ids, dimension) => {
    set((s) => {
      const targets = s.widgets.filter(w => ids.includes(w.id));
      if (targets.length < 2) return s;
      const ref = targets[0];
      const updated = s.widgets.map(w => {
        if (!ids.includes(w.id)) return w;
        return {
          ...w,
          width: (dimension === "width" || dimension === "both") ? ref.width : w.width,
          height: (dimension === "height" || dimension === "both") ? ref.height : w.height,
        };
      });
      return { widgets: updated };
    });
  },

  updateWidgetEvent: (id, eventName, code) => {
    set((s) => ({
      widgets: s.widgets.map(w => {
        if (w.id !== id) return w;
        const events = { ...w.events };
        if (code.trim()) {
          events[eventName] = code;
        } else {
          delete events[eventName];
        }
        return { ...w, events };
      }),
    }));
  },

  removeWidgetEvent: (id, eventName) => {
    set((s) => ({
      widgets: s.widgets.map(w => {
        if (w.id !== id) return w;
        const events = { ...w.events };
        delete events[eventName];
        return { ...w, events };
      }),
    }));
  },

  tabOrderMode: false,
  toggleTabOrderMode: () => set((s) => ({ tabOrderMode: !s.tabOrderMode })),

  variables: [],
  addVariable: (varType) => {
    const id = uuid();
    const prefix = varType.replace("Var", "").toLowerCase();
    const name = `${prefix}_var_${get().variables.length + 1}`;
    set((s) => ({ variables: [...s.variables, { id, name, varType, defaultValue: "" }] }));
  },
  removeVariable: (id) => set((s) => ({ variables: s.variables.filter(v => v.id !== id) })),
  renameVariable: (id, name) => set((s) => ({ variables: s.variables.map(v => v.id === id ? { ...v, name } : v) })),
  updateVariableDefault: (id, defaultValue) => set((s) => ({ variables: s.variables.map(v => v.id === id ? { ...v, defaultValue } : v) })),
}));
