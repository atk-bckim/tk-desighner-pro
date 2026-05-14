from pydantic import BaseModel
from typing import Literal

WidgetType = Literal[
    "Button", "Label", "Entry", "Text",
    "Checkbutton", "Radiobutton", "Listbox", "Scale", "Frame",
]


class WidgetInstance(BaseModel):
    id: str
    type: WidgetType
    x: float
    y: float
    width: float
    height: float
    props: dict[str, object] = {}


class Project(BaseModel):
    name: str = "Untitled"
    canvas_width: int = 800
    canvas_height: int = 600
    widgets: list[WidgetInstance]
