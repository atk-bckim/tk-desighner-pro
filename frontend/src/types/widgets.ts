export type WidgetType =
  | "Button"
  | "Label"
  | "Entry"
  | "Text"
  | "Checkbutton"
  | "Radiobutton"
  | "Listbox"
  | "Scale"
  | "Frame"
  | "LabelFrame"
  | "OptionMenu"
  | "Spinbox"
  | "Scrollbar"
  | "Separator"
  | "Notebook"
  | "Toplevel"
  | "Progressbar"
  | "Combobox"
  | "Treeview"
  | "Sizegrip"
  | "Menubutton"
  | "Message";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
  locked: boolean;
  bindings?: {
    xscrollcommand?: string;
    yscrollcommand?: string;
    command?: string;
  };
  events?: Record<string, string>;
  layoutManager?: "place" | "grid";
  gridRow?: number;
  gridCol?: number;
  gridRowSpan?: number;
  gridColSpan?: number;
  gridSticky?: string;
  gridPadX?: number;
  gridPadY?: number;
}

export type TkVarType = "StringVar" | "IntVar" | "DoubleVar" | "BooleanVar";

export interface TkVariable {
  id: string;
  name: string;
  varType: TkVarType;
  defaultValue: string;
}

export type NonVisualType = "Timer" | "FileDialog" | "ColorChooser" | "MessageBox";

export interface NonVisualComponent {
  id: string;
  type: NonVisualType;
  name: string;
  props: Record<string, unknown>;
}

export interface ProjectResource {
  id: string;
  name: string;
  type: "image";
  dataUrl: string;
}

export interface Project {
  schemaVersion?: number;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  widgets: WidgetInstance[];
  tkTheme?: string;
  menuBar?: MenuBarData | null;
  rootBg?: string;
  rootResizable?: boolean;
  variables?: TkVariable[];
  nonVisuals?: NonVisualComponent[];
  resources?: ProjectResource[];
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
  "LabelFrame",
  "OptionMenu",
  "Spinbox",
  "Scrollbar",
  "Separator",
  "Notebook",
  "Toplevel",
  "Progressbar",
  "Combobox",
  "Treeview",
  "Sizegrip",
  "Menubutton",
  "Message",
];

export interface MenuItemData {
  id: string;
  label: string;
  accelerator?: string;
  separator?: boolean;
}

export interface MenuData {
  id: string;
  label: string;
  items: MenuItemData[];
}

export interface MenuBarData {
  menus: MenuData[];
}
