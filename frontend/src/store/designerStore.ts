import { create } from "zustand";
import type { WidgetInstance, WidgetType, Project } from "../types/widgets";
import { createWidget, resetCounters } from "../utils/widgetDefaults";
import { v4 as uuid } from "uuid";

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
    set((s) => {
      const widget = s.widgets.find((w) => w.id === id);
      if (!widget) return s;
      const dx = x - widget.x;
      const dy = y - widget.y;

      // Collect all descendant IDs
      const collectDescendants = (parentId: string): string[] => {
        const ids: string[] = [];
        s.widgets
          .filter((w) => w.parentId === parentId)
          .forEach((w) => {
            ids.push(w.id);
            ids.push(...collectDescendants(w.id));
          });
        return ids;
      };
      const descendantIds = collectDescendants(id);

      return {
        widgets: s.widgets.map((w) => {
          if (w.id === id) return { ...w, x, y };
          if (descendantIds.includes(w.id))
            return { ...w, x: w.x + dx, y: w.y + dy };
          return w;
        }),
      };
    });
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
    });
  },

  exportProject: () => {
    const s = get();
    return {
      name: s.projectName,
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      widgets: s.widgets,
    };
  },

  setProjectName: (name) => set({ projectName: name }),

  undoStack: [],
  redoStack: [],

  snapshot: () => {
    const current = get().widgets;
    set((s) => ({ undoStack: [...s.undoStack, current], redoStack: [] }));
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
}));
