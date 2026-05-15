import type { WidgetInstance } from "../types/widgets";
import { v4 as uuid } from "uuid";

function w(type: string, name: string, x: number, y: number, width: number, height: number, props: Record<string, unknown>, parentId: string | null = null, locked = false): WidgetInstance {
  return { id: uuid(), type: type as WidgetInstance["type"], name, parentId, x, y, width, height, props, locked };
}

export const TEMPLATES: Record<string, { label: string; icon: string; create: () => WidgetInstance[] }> = {
  login_form: {
    label: "Login Form",
    icon: "\u{1F511}",
    create: () => {
      const frame = w("Frame", "login_frame", 100, 50, 300, 220, { bg: "#f0f0f0", relief: "groove", bd: 2 });
      return [
        frame,
        w("Label", "title_label", 70, 15, 160, 30, { text: "Sign In", font: '("Helvetica", 14, "bold")', fg: "#333" }, frame.id),
        w("Label", "user_label", 20, 55, 80, 25, { text: "Username:" }, frame.id),
        w("Entry", "user_entry", 110, 55, 160, 25, {}, frame.id),
        w("Label", "pass_label", 20, 90, 80, 25, { text: "Password:" }, frame.id),
        w("Entry", "pass_entry", 110, 90, 160, 25, { show: "*" }, frame.id),
        w("Button", "login_btn", 90, 140, 120, 35, { text: "Login", bg: "#4CAF50", fg: "white", relief: "raised" }, frame.id),
      ];
    },
  },
  settings_panel: {
    label: "Settings Panel",
    icon: "\u2699",
    create: () => {
      const frame = w("LabelFrame", "settings_frame", 50, 30, 450, 350, { text: "Settings", bd: 2 });
      return [
        frame,
        w("Label", "theme_label", 20, 20, 100, 25, { text: "Theme:" }, frame.id),
        w("OptionMenu", "theme_menu", 130, 20, 180, 25, { values: "Light,Dark,System" }, frame.id),
        w("Checkbutton", "notif_check", 20, 60, 200, 25, { text: "Enable notifications" }, frame.id),
        w("Checkbutton", "auto_check", 20, 90, 200, 25, { text: "Auto-save" }, frame.id),
        w("Label", "font_label", 20, 130, 100, 25, { text: "Font size:" }, frame.id),
        w("Spinbox", "font_spin", 130, 130, 80, 25, { from_: 8, to: 36, increment: 1 }, frame.id),
        w("Scale", "volume_scale", 20, 175, 280, 30, { from_: 0, to: 100, orient: "horizontal" }, frame.id),
        w("Button", "save_btn", 120, 260, 100, 30, { text: "Save", bg: "#2196F3", fg: "white" }, frame.id),
        w("Button", "cancel_btn", 230, 260, 100, 30, { text: "Cancel" }, frame.id),
      ];
    },
  },
  simple_list: {
    label: "List + Detail",
    icon: "\u{1F4CB}",
    create: () => {
      return [
        w("Label", "header", 20, 10, 300, 30, { text: "Items", font: '("Helvetica", 14, "bold")' }),
        w("Listbox", "item_list", 20, 50, 200, 300, {}),
        w("LabelFrame", "detail_frame", 240, 50, 300, 300, { text: "Details", bd: 1 }),
      ];
    },
  },
  empty_form: {
    label: "Empty Form",
    icon: "\u{1F4DD}",
    create: () => {
      const frame = w("LabelFrame", "form_frame", 50, 30, 400, 300, { text: "Form", bd: 2 });
      return [
        frame,
        w("Label", "field1_label", 20, 20, 100, 25, { text: "Field 1:" }, frame.id),
        w("Entry", "field1_entry", 130, 20, 230, 25, {}, frame.id),
        w("Label", "field2_label", 20, 55, 100, 25, { text: "Field 2:" }, frame.id),
        w("Entry", "field2_entry", 130, 55, 230, 25, {}, frame.id),
        w("Label", "field3_label", 20, 90, 100, 25, { text: "Field 3:" }, frame.id),
        w("Text", "field3_text", 130, 90, 230, 100, {}, frame.id),
        w("Button", "submit_btn", 150, 220, 100, 30, { text: "Submit", bg: "#4CAF50", fg: "white" }, frame.id),
      ];
    },
  },
};
