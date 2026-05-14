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
    ],
  },
  Entry: {
    defaultWidth: 200,
    defaultHeight: 30,
    defaultProps: {},
    editableProps: [
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "show", label: "Show char", type: "text" },
    ],
  },
  Text: {
    defaultWidth: 250,
    defaultHeight: 120,
    defaultProps: {},
    editableProps: [
      { key: "width", label: "Width (chars)", type: "number" },
      { key: "height", label: "Height (lines)", type: "number" },
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
    ],
  },
  Listbox: {
    defaultWidth: 200,
    defaultHeight: 120,
    defaultProps: {},
    editableProps: [
      { key: "height", label: "Height (items)", type: "number" },
      { key: "selectmode", label: "Select mode", type: "select", options: ["browse", "single", "multiple", "extended"] },
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
};

export function getSpec(type: WidgetType): WidgetSpec {
  return SPECS[type];
}

export function getEditableProps(type: WidgetType): PropSpec[] {
  return SPECS[type].editableProps;
}

export function createWidget(
  type: WidgetType,
  x: number,
  y: number,
): WidgetInstance {
  const spec = SPECS[type];
  return {
    id: uuid(),
    type,
    x,
    y,
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    props: { ...spec.defaultProps },
  };
}
