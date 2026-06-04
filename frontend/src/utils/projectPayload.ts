import type { Project, WidgetInstance } from "../types/widgets";

function mapWidgetForApi(widget: WidgetInstance) {
  return {
    id: widget.id,
    type: widget.type,
    name: widget.name,
    parent_id: widget.parentId,
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
    props: widget.props,
    bindings: widget.bindings || {},
    events: widget.events || {},
    layout_manager: widget.layoutManager ?? "place",
    grid_row: widget.gridRow ?? null,
    grid_col: widget.gridCol ?? null,
    grid_row_span: widget.gridRowSpan ?? null,
    grid_col_span: widget.gridColSpan ?? null,
    grid_sticky: widget.gridSticky ?? null,
    grid_pad_x: widget.gridPadX ?? null,
    grid_pad_y: widget.gridPadY ?? null,
  };
}

export function projectToApiPayload(project: Project, tkTheme: string) {
  return {
    name: project.name,
    canvas_width: project.canvasWidth,
    canvas_height: project.canvasHeight,
    tk_theme: tkTheme,
    widgets: project.widgets.map(mapWidgetForApi),
    menu_bar: project.menuBar,
    root_bg: project.rootBg ?? "",
    root_resizable: project.rootResizable ?? true,
    variables: (project.variables ?? []).map((variable) => ({
      id: variable.id,
      name: variable.name,
      var_type: variable.varType,
      default_value: variable.defaultValue,
    })),
    non_visuals: project.nonVisuals ?? [],
    resources: (project.resources ?? []).map((resource) => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      data_url: resource.dataUrl,
    })),
  };
}
