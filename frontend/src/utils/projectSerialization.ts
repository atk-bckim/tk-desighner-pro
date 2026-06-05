import type {
  MenuBarData,
  MenuData,
  MenuItemData,
  NonVisualComponent,
  NonVisualType,
  Project,
  ProjectResource,
  TkVariable,
  TkVarType,
  WidgetInstance,
  WidgetType,
} from "../types/widgets";
import { WIDGET_TYPES } from "../types/widgets";

export const PROJECT_SCHEMA_VERSION = 1;

const DEFAULT_PROJECT = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  name: "Untitled",
  canvasWidth: 800,
  canvasHeight: 600,
  widgets: [] as WidgetInstance[],
  menuBar: null as MenuBarData | null,
  rootBg: "",
  rootResizable: true,
  tkTheme: "default",
  variables: [] as TkVariable[],
  nonVisuals: [] as NonVisualComponent[],
  resources: [] as ProjectResource[],
};

const TK_VAR_TYPES: TkVarType[] = ["StringVar", "IntVar", "DoubleVar", "BooleanVar"];
const NON_VISUAL_TYPES: NonVisualType[] = ["Timer", "FileDialog", "ColorChooser", "MessageBox"];

export function serializeProject(project: Project): string {
  return JSON.stringify(normalizeProject(project), null, 2);
}

export function parseProjectJson(json: string): Project {
  return normalizeProject(JSON.parse(json));
}

export function normalizeProject(project: Partial<Project> | unknown): Project {
  if (!isRecord(project)) {
    throw new Error("Project must be a JSON object.");
  }

  const canvasWidth = readNumber(project, "canvasWidth", DEFAULT_PROJECT.canvasWidth, "canvas_width");
  const canvasHeight = readNumber(project, "canvasHeight", DEFAULT_PROJECT.canvasHeight, "canvas_height");
  const rootResizable = readValue(project, "rootResizable", "root_resizable");

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    name: readString(project.name, DEFAULT_PROJECT.name),
    canvasWidth,
    canvasHeight,
    widgets: readArray(project.widgets).map(normalizeWidget).filter(isPresent),
    menuBar: normalizeMenuBar(readValue(project, "menuBar", "menu_bar")),
    rootBg: readString(readValue(project, "rootBg", "root_bg"), DEFAULT_PROJECT.rootBg),
    rootResizable: typeof rootResizable === "boolean" ? rootResizable : DEFAULT_PROJECT.rootResizable,
    tkTheme: readNonEmptyString(readValue(project, "tkTheme", "tk_theme"), DEFAULT_PROJECT.tkTheme),
    variables: readArray(project.variables).map(normalizeVariable).filter(isPresent),
    nonVisuals: readArray(readValue(project, "nonVisuals", "non_visuals")).map(normalizeNonVisual).filter(isPresent),
    resources: readArray(project.resources).map(normalizeResource).filter(isPresent),
  };
}

function normalizeWidget(value: unknown, index: number): WidgetInstance | null {
  if (!isRecord(value) || !isWidgetType(value.type)) return null;
  const parentId = readValue(value, "parentId", "parent_id");
  const layoutManager = readValue(value, "layoutManager", "layout_manager");

  return {
    id: readNonEmptyString(value.id, `widget-${index + 1}`),
    type: value.type,
    name: readNonEmptyString(value.name, `${value.type.toLowerCase()}_${index + 1}`),
    parentId: typeof parentId === "string" ? parentId : null,
    x: readNumber(value, "x", 0),
    y: readNumber(value, "y", 0),
    width: Math.max(1, readNumber(value, "width", 100)),
    height: Math.max(1, readNumber(value, "height", 32)),
    props: isRecord(value.props) ? { ...value.props } : {},
    locked: typeof value.locked === "boolean" ? value.locked : false,
    bindings: normalizeBindings(value.bindings),
    events: normalizeEvents(value.events),
    layoutManager: layoutManager === "grid" ? "grid" : layoutManager === "place" ? "place" : undefined,
    gridRow: optionalNumber(readValue(value, "gridRow", "grid_row")),
    gridCol: optionalNumber(readValue(value, "gridCol", "grid_col")),
    gridRowSpan: optionalNumber(readValue(value, "gridRowSpan", "grid_row_span")),
    gridColSpan: optionalNumber(readValue(value, "gridColSpan", "grid_col_span")),
    gridSticky: readOptionalString(readValue(value, "gridSticky", "grid_sticky")),
    gridPadX: optionalNumber(readValue(value, "gridPadX", "grid_pad_x")),
    gridPadY: optionalNumber(readValue(value, "gridPadY", "grid_pad_y")),
  };
}

function normalizeBindings(value: unknown): WidgetInstance["bindings"] {
  if (!isRecord(value)) return undefined;
  const bindings: NonNullable<WidgetInstance["bindings"]> = {};
  if (typeof value.xscrollcommand === "string") bindings.xscrollcommand = value.xscrollcommand;
  if (typeof value.yscrollcommand === "string") bindings.yscrollcommand = value.yscrollcommand;
  if (typeof value.command === "string") bindings.command = value.command;
  return Object.keys(bindings).length > 0 ? bindings : undefined;
}

function normalizeEvents(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const events = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return Object.keys(events).length > 0 ? events : undefined;
}

function normalizeMenuBar(value: unknown): MenuBarData | null {
  if (!isRecord(value)) return null;
  const menus = readArray(value.menus).map(normalizeMenu).filter(isPresent);
  return { menus };
}

function normalizeMenu(value: unknown, index: number): MenuData | null {
  if (!isRecord(value)) return null;
  return {
    id: readNonEmptyString(value.id, `menu-${index + 1}`),
    label: readString(value.label, `Menu ${index + 1}`),
    items: readArray(value.items).map(normalizeMenuItem).filter(isPresent),
  };
}

function normalizeMenuItem(value: unknown, index: number): MenuItemData | null {
  if (!isRecord(value)) return null;
  return {
    id: readNonEmptyString(value.id, `menu-item-${index + 1}`),
    label: readString(value.label, `Item ${index + 1}`),
    accelerator: typeof value.accelerator === "string" ? value.accelerator : undefined,
    separator: typeof value.separator === "boolean" ? value.separator : undefined,
  };
}

function normalizeVariable(value: unknown, index: number): TkVariable | null {
  if (!isRecord(value)) return null;
  const varType = readValue(value, "varType", "var_type");

  return {
    id: readNonEmptyString(value.id, `variable-${index + 1}`),
    name: readNonEmptyString(value.name, `variable_${index + 1}`),
    varType: isTkVarType(varType) ? varType : "StringVar",
    defaultValue: readString(readValue(value, "defaultValue", "default_value"), ""),
  };
}

function normalizeNonVisual(value: unknown, index: number): NonVisualComponent | null {
  if (!isRecord(value) || !isNonVisualType(value.type)) return null;
  return {
    id: readNonEmptyString(value.id, `non-visual-${index + 1}`),
    type: value.type,
    name: readNonEmptyString(value.name, `${value.type.toLowerCase()}_${index + 1}`),
    props: isRecord(value.props) ? { ...value.props } : {},
  };
}

function normalizeResource(value: unknown, index: number): ProjectResource | null {
  if (!isRecord(value)) return null;
  return {
    id: readNonEmptyString(value.id, `resource-${index + 1}`),
    name: readNonEmptyString(value.name, `image_${index + 1}`),
    type: "image",
    dataUrl: readString(readValue(value, "dataUrl", "data_url"), ""),
  };
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(record: Record<string, unknown>, key: string, fallback: number, legacyKey?: string): number {
  const value = record[key] ?? (legacyKey ? record[legacyKey] : undefined);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readValue(record: Record<string, unknown>, key: string, legacyKey: string): unknown {
  return record[key] ?? record[legacyKey];
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === "string" && WIDGET_TYPES.includes(value as WidgetType);
}

function isTkVarType(value: unknown): value is TkVarType {
  return typeof value === "string" && TK_VAR_TYPES.includes(value as TkVarType);
}

function isNonVisualType(value: unknown): value is NonVisualType {
  return typeof value === "string" && NON_VISUAL_TYPES.includes(value as NonVisualType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
