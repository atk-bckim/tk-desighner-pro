import type { WidgetType, WidgetInstance } from "../types/widgets";
import { v4 as uuid } from "uuid";

interface PropSpec {
  key: string;
  label: string;
  type: "text" | "number" | "color" | "select";
  options?: string[];
}

interface WidgetSpec {
  defaultWidth: number;
  defaultHeight: number;
  defaultProps: Record<string, unknown>;
  editableProps: PropSpec[];
}

const TTK_WIDGETS: Set<WidgetType> = new Set(["Notebook", "Progressbar", "Combobox", "Treeview", "Sizegrip"]);

export function isTtk(type: WidgetType): boolean {
  return TTK_WIDGETS.has(type);
}

const widgetCounters: Record<string, number> = {};

const SPECS: Record<WidgetType, WidgetSpec> = {
  Button: {
    defaultWidth: 120,
    defaultHeight: 40,
    defaultProps: { text: "Button" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "font", label: "Font", type: "text" },
      { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "active"] },
      { key: "bd", label: "Border width", type: "number" },
      { key: "command", label: "Command", type: "text" },
    ],
  },
  Label: {
    defaultWidth: 100,
    defaultHeight: 30,
    defaultProps: { text: "Label" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "font", label: "Font", type: "text" },
      { key: "anchor", label: "Anchor", type: "select", options: ["nw", "n", "ne", "w", "center", "e", "sw", "s", "se"] },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled"] },
      { key: "wraplength", label: "Wrap length", type: "number" },
      { key: "justify", label: "Justify", type: "select", options: ["left", "center", "right"] },
    ],
  },
  Entry: {
    defaultWidth: 200,
    defaultHeight: 30,
    defaultProps: {},
    editableProps: [
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "show", label: "Show char", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "readonly"] },
      { key: "textvariable", label: "Text variable", type: "text" },
    ],
  },
  Text: {
    defaultWidth: 250,
    defaultHeight: 120,
    defaultProps: {},
    editableProps: [
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "height", label: "Height (lines)", type: "number" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled"] },
      { key: "textvariable", label: "Text variable", type: "text" },
    ],
  },
  Checkbutton: {
    defaultWidth: 120,
    defaultHeight: 30,
    defaultProps: { text: "Checkbutton" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "active"] },
      { key: "justify", label: "Justify", type: "select", options: ["left", "center", "right"] },
      { key: "command", label: "Command", type: "text" },
      { key: "variable", label: "Variable", type: "text" },
    ],
  },
  Radiobutton: {
    defaultWidth: 120,
    defaultHeight: 30,
    defaultProps: { text: "Radiobutton", value: "1" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "value", label: "Value", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "active"] },
      { key: "justify", label: "Justify", type: "select", options: ["left", "center", "right"] },
      { key: "command", label: "Command", type: "text" },
      { key: "variable", label: "Variable", type: "text" },
    ],
  },
  Listbox: {
    defaultWidth: 200,
    defaultHeight: 120,
    defaultProps: {},
    editableProps: [
      { key: "height", label: "Height (items)", type: "number" },
      { key: "selectmode", label: "Select mode", type: "select", options: ["browse", "single", "multiple", "extended"] },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled"] },
    ],
  },
  Scale: {
    defaultWidth: 200,
    defaultHeight: 40,
    defaultProps: { from_: 0, to: 100, orient: "horizontal" },
    editableProps: [
      { key: "from_", label: "From", type: "number" },
      { key: "to", label: "To", type: "number" },
      { key: "orient", label: "Orientation", type: "select", options: ["horizontal", "vertical"] },
      { key: "length", label: "Length (px)", type: "number" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "active"] },
      { key: "command", label: "Command", type: "text" },
      { key: "variable", label: "Variable", type: "text" },
    ],
  },
  Frame: {
    defaultWidth: 250,
    defaultHeight: 200,
    defaultProps: {},
    editableProps: [
      { key: "bg", label: "Background", type: "color" },
      { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
      { key: "bd", label: "Border width", type: "number" },
    ],
  },
  LabelFrame: {
    defaultWidth: 250,
    defaultHeight: 200,
    defaultProps: { text: "LabelFrame" },
    editableProps: [
      { key: "text", label: "Title", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
      { key: "bd", label: "Border width", type: "number" },
    ],
  },
  OptionMenu: {
    defaultWidth: 150,
    defaultHeight: 30,
    defaultProps: { values: "Option1,Option2,Option3" },
    editableProps: [
      { key: "values", label: "Options (comma-sep)", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
    ],
  },
  Spinbox: {
    defaultWidth: 100,
    defaultHeight: 30,
    defaultProps: { from_: 0, to: 100, increment: 1 },
    editableProps: [
      { key: "from_", label: "From", type: "number" },
      { key: "to", label: "To", type: "number" },
      { key: "increment", label: "Increment", type: "number" },
      { key: "width", label: "Width (chars)", type: "number" },
    ],
  },
  Scrollbar: {
    defaultWidth: 20,
    defaultHeight: 200,
    defaultProps: { orient: "vertical" },
    editableProps: [
      { key: "orient", label: "Orientation", type: "select", options: ["vertical", "horizontal"] },
    ],
  },
  Separator: {
    defaultWidth: 200,
    defaultHeight: 4,
    defaultProps: { orient: "horizontal" },
    editableProps: [
      { key: "orient", label: "Orientation", type: "select", options: ["horizontal", "vertical"] },
    ],
  },
  Notebook: {
    defaultWidth: 400,
    defaultHeight: 300,
    defaultProps: { activeTab: 0 },
    editableProps: [],
  },
  Toplevel: {
    defaultWidth: 350,
    defaultHeight: 250,
    defaultProps: { title: "Toplevel", bg: "#f0f0f0" },
    editableProps: [
      { key: "title", label: "Title", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
      { key: "bd", label: "Border width", type: "number" },
    ],
  },
  Progressbar: {
    defaultWidth: 200,
    defaultHeight: 20,
    defaultProps: { orient: "horizontal", mode: "determinate", maximum: 100 },
    editableProps: [
      { key: "orient", label: "Orientation", type: "select", options: ["horizontal", "vertical"] },
      { key: "length", label: "Length (px)", type: "number" },
      { key: "mode", label: "Mode", type: "select", options: ["determinate", "indeterminate"] },
      { key: "maximum", label: "Maximum", type: "number" },
    ],
  },
  Combobox: {
    defaultWidth: 200,
    defaultHeight: 30,
    defaultProps: { values: "Option1,Option2,Option3" },
    editableProps: [
      { key: "values", label: "Options (comma-sep)", type: "text" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "readonly"] },
    ],
  },
  Treeview: {
    defaultWidth: 300,
    defaultHeight: 200,
    defaultProps: { height: 10, selectmode: "extended" },
    editableProps: [
      { key: "height", label: "Height (rows)", type: "number" },
      { key: "selectmode", label: "Select mode", type: "select", options: ["browse", "extended", "none"] },
    ],
  },
  Sizegrip: {
    defaultWidth: 16,
    defaultHeight: 16,
    defaultProps: {},
    editableProps: [],
  },
  Menubutton: {
    defaultWidth: 120,
    defaultHeight: 30,
    defaultProps: { text: "Menu" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "state", label: "State", type: "select", options: ["normal", "disabled", "active"] },
      { key: "relief", label: "Relief", type: "select", options: ["flat", "raised", "sunken", "groove", "ridge"] },
    ],
  },
  Message: {
    defaultWidth: 200,
    defaultHeight: 60,
    defaultProps: { text: "Message text" },
    editableProps: [
      { key: "text", label: "Text", type: "text" },
      { key: "bg", label: "Background", type: "color" },
      { key: "fg", label: "Foreground", type: "color" },
      { key: "font", label: "Font", type: "text" },
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "justify", label: "Justify", type: "select", options: ["left", "center", "right"] },
      { key: "anchor", label: "Anchor", type: "select", options: ["nw", "n", "ne", "w", "center", "e", "sw", "s", "se"] },
    ],
  },
};

export const WIDGET_EVENTS: Record<string, { event: string; label: string }[]> = {
  Button:        [{ event: "command", label: "On Click" }],
  Checkbutton:   [{ event: "command", label: "On Toggle" }],
  Radiobutton:   [{ event: "command", label: "On Select" }],
  Scale:         [{ event: "command", label: "On Value Change" }],
  Entry:         [{ event: "<Return>", label: "On Enter Key" }, { event: "<FocusOut>", label: "On Focus Lost" }, { event: "<KeyRelease>", label: "On Key Up" }],
  Text:          [{ event: "<KeyRelease>", label: "On Key Up" }, { event: "<FocusOut>", label: "On Focus Lost" }],
  Listbox:       [{ event: "<<ListboxSelect>>", label: "On Select" }, { event: "<<ListboxSelect>>", label: "On Double Click" }],
  Combobox:      [{ event: "<<ComboboxSelected>>", label: "On Select" }],
  Treeview:      [{ event: "<<TreeviewSelect>>", label: "On Select" }, { event: "<<TreeviewOpen>>", label: "On Expand" }, { event: "<<TreeviewClose>>", label: "On Collapse" }],
  Spinbox:       [{ event: "command", label: "On Value Change" }, { event: "<Return>", label: "On Enter Key" }],
  Menubutton:    [{ event: "command", label: "On Click" }],
  OptionMenu:    [{ event: "<<OptionMenuSelect>>", label: "On Select" }],
  Label:         [{ event: "<Button-1>", label: "On Click" }],
  Frame:         [],
  LabelFrame:    [],
  Notebook:      [{ event: "<<NotebookTabChanged>>", label: "On Tab Change" }],
  Toplevel:      [{ event: "<Configure>", label: "On Resize" }],
  Scrollbar:     [],
  Separator:     [],
  Progressbar:   [],
  Sizegrip:      [],
  Message:       [],
};

export const GENERIC_EVENTS: { event: string; label: string }[] = [
  { event: "<Button-1>", label: "On Left Click" },
  { event: "<Enter>", label: "On Mouse Enter" },
  { event: "<Leave>", label: "On Mouse Leave" },
  { event: "<Configure>", label: "On Resize" },
];

export function getSpec(type: WidgetType): WidgetSpec {
  return SPECS[type];
}

export function getEditableProps(type: WidgetType): PropSpec[] {
  return SPECS[type].editableProps;
}

export function resetCounters(widgets: WidgetInstance[]) {
  for (const w of widgets) {
    const match = w.name.match(/^(.+?)_(\d+)$/);
    if (match) {
      const num = parseInt(match[2]);
      widgetCounters[w.type] = Math.max(widgetCounters[w.type] || 0, num);
    }
  }
}

export function createWidget(
  type: WidgetType,
  x: number,
  y: number,
  parentId: string | null = null,
): WidgetInstance {
  const spec = SPECS[type];
  if (!widgetCounters[type]) widgetCounters[type] = 0;
  widgetCounters[type]++;
  const name = `${type.toLowerCase()}_${widgetCounters[type]}`;
  return {
    id: uuid(),
    type,
    name,
    parentId,
    x,
    y,
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    props: { ...spec.defaultProps },
    locked: false,
    bindings: {},
  };
}
