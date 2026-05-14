export type WidgetType =
  | "Button"
  | "Label"
  | "Entry"
  | "Text"
  | "Checkbutton"
  | "Radiobutton"
  | "Listbox"
  | "Scale"
  | "Frame";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
}

export interface Project {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  widgets: WidgetInstance[];
}

export const WIDGET_TYPES: WidgetType[] = [
  "Button",
  "Label",
  "Entry",
  "Text",
  "Checkbutton",
  "Radiobutton",
  "Listbox",
  "Scale",
  "Frame",
];
