from pydantic import BaseModel
from typing import Literal

WidgetType = Literal[
    "Button", "Label", "Entry", "Text",
    "Checkbutton", "Radiobutton", "Listbox", "Scale", "Frame",
    "LabelFrame", "OptionMenu", "Spinbox", "Scrollbar", "Separator",
    "Notebook", "Toplevel", "Progressbar", "Combobox", "Treeview",
    "Sizegrip", "Menubutton", "Message",
]


class WidgetBindings(BaseModel):
    xscrollcommand: str | None = None
    yscrollcommand: str | None = None
    command: str | None = None


class WidgetInstance(BaseModel):
    id: str
    type: str  # Use str instead of Literal to be flexible
    name: str = ""
    parent_id: str | None = None
    x: float
    y: float
    width: float
    height: float
    props: dict[str, object] = {}
    bindings: WidgetBindings | None = None
    events: dict[str, str] = {}
    layout_manager: str = "place"
    grid_row: int | None = None
    grid_col: int | None = None
    grid_row_span: int | None = None
    grid_col_span: int | None = None
    grid_sticky: str | None = None
    grid_pad_x: int | None = None
    grid_pad_y: int | None = None


class MenuItemData(BaseModel):
    id: str
    label: str = ""
    accelerator: str | None = None
    separator: bool = False


class MenuData(BaseModel):
    id: str
    label: str = ""
    items: list[MenuItemData] = []


class MenuBarData(BaseModel):
    menus: list[MenuData] = []


class TkVariable(BaseModel):
    id: str
    name: str
    var_type: str = "StringVar"
    default_value: str = ""


class NonVisualComponent(BaseModel):
    id: str
    type: str
    name: str
    props: dict[str, object] = {}


class Project(BaseModel):
    name: str = "Untitled"
    canvas_width: int = 800
    canvas_height: int = 600
    tk_theme: str = "default"
    widgets: list[WidgetInstance]
    menu_bar: MenuBarData | None = None
    root_bg: str = ""
    root_resizable: bool = True
    variables: list[TkVariable] = []
    non_visuals: list[NonVisualComponent] = []
