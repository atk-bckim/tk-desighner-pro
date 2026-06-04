import { useDraggable } from "@dnd-kit/core";
import type { WidgetType } from "../types/widgets";

const WIDGET_GROUPS: { label: string; types: WidgetType[]; icons: Record<string, string> }[] = [
  {
    label: "Container",
    types: ["Frame", "LabelFrame", "Notebook", "Toplevel"],
    icons: { Frame: " Frm ", LabelFrame: " LFr ", Notebook: " Tab ", Toplevel: " Win " },
  },
  {
    label: "Display",
    types: ["Label", "Button", "Checkbutton", "Radiobutton", "Progressbar"],
    icons: { Label: " Aa ", Button: " Btn ", Checkbutton: " Chk ", Radiobutton: " Rad ", Progressbar: " Prg " },
  },
  {
    label: "Input",
    types: ["Entry", "Text", "Spinbox", "OptionMenu", "Combobox"],
    icons: { Entry: " Ent ", Text: " Txt ", Spinbox: " Spn ", OptionMenu: " Opt ", Combobox: " Cmb " },
  },
  {
    label: "Advanced",
    types: ["Listbox", "Scale", "Scrollbar", "Separator", "Treeview", "Menubutton", "Message", "Sizegrip"],
    icons: { Listbox: " Lst ", Scale: " Scl ", Scrollbar: " Bar ", Separator: " — ", Treeview: " Trv ", Menubutton: " Mnu ", Message: " Msg ", Sizegrip: " SzG " },
  },
];

function WidgetItem({ type, icon }: { type: WidgetType; icon: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { fromToolbox: true, widgetType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Drag to add ${type} widget`}
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-grab text-xs transition-colors duration-150 ${
        isDragging ? "opacity-40" : "text-[#8888a8] hover:text-[#d4d4e8] hover:bg-[#2d2d42]"
      }`}
    >
      <span className="text-[10px] bg-[#1e1e2e] text-[#06b6d4] px-1 py-0.5 rounded font-mono w-9 text-center shrink-0">{icon}</span>
      <span className="truncate">{type}</span>
    </div>
  );
}

export function Toolbox() {
  return (
    <div className="w-44 bg-[#1e1e2e] border-r border-[#3c3c52] py-2 overflow-y-auto shrink-0">
      <h2 className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wider px-3 mb-2">Widgets</h2>
      {WIDGET_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <h3 className="text-[10px] text-[#5a5a72] uppercase tracking-wider px-3 mb-0.5">{group.label}</h3>
          <div className="flex flex-col gap-0.5 px-1">
            {group.types.map((type) => (
              <WidgetItem key={type} type={type} icon={group.icons[type] || type} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
