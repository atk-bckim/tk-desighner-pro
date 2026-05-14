import { create } from "zustand";
import type { WidgetInstance, WidgetType, Project } from "../types/widgets";
import { createWidget } from "../utils/widgetDefaults";

interface DesignerState {
  projectName: string;
  canvasWidth: number;
  canvasHeight: number;
  widgets: WidgetInstance[];
  selectedId: string | null;

  addWidget: (type: WidgetType, x: number, y: number) => void;
  removeWidget: (id: string) => void;
  selectWidget: (id: string | null) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetProp: (id: string, key: string, value: unknown) => void;
  loadProject: (project: Project) => void;
  exportProject: () => Project;
  setProjectName: (name: string) => void;
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  projectName: "Untitled",
  canvasWidth: 800,
  canvasHeight: 600,
  widgets: [],
  selectedId: null,

  addWidget: (type, x, y) => {
    const widget = createWidget(type, x, y);
    set((s) => ({ widgets: [...s.widgets, widget], selectedId: widget.id }));
  },

  removeWidget: (id) => {
    set((s) => ({
      widgets: s.widgets.filter((w) => w.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  selectWidget: (id) => set({ selectedId: id }),

  moveWidget: (id, x, y) => {
    set((s) => ({
      widgets: s.widgets.map((w) => (w.id === id ? { ...w, x, y } : w)),
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

  loadProject: (project) => {
    set({
      projectName: project.name,
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
      widgets: project.widgets,
      selectedId: null,
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
}));
