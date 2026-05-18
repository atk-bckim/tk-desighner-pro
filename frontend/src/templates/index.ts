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
  data_entry: {
    label: "Data Entry",
    icon: "\u{1F4CA}",
    create: () => {
      const frame = w("LabelFrame", "data_frame", 30, 20, 500, 420, { text: "Data Entry Form", bd: 2 });
      return [
        frame,
        w("Label", "name_label", 20, 20, 80, 25, { text: "Name:" }, frame.id),
        w("Entry", "name_entry", 110, 20, 200, 25, {}, frame.id),
        w("Label", "email_label", 20, 55, 80, 25, { text: "Email:" }, frame.id),
        w("Entry", "email_entry", 110, 55, 200, 25, {}, frame.id),
        w("Label", "role_label", 20, 90, 80, 25, { text: "Role:" }, frame.id),
        w("Combobox", "role_combo", 110, 90, 200, 25, { values: "Developer,Designer,Manager,QA" }, frame.id),
        w("Label", "exp_label", 20, 130, 100, 25, { text: "Experience:" }, frame.id),
        w("Spinbox", "exp_spin", 130, 130, 80, 25, { from_: 0, to: 30, increment: 1 }, frame.id),
        w("Label", "notes_label", 20, 170, 80, 25, { text: "Notes:" }, frame.id),
        w("Text", "notes_text", 110, 170, 280, 80, {}, frame.id),
        w("Checkbutton", "remote_check", 20, 270, 150, 25, { text: "Remote work" }, frame.id),
        w("Checkbutton", "fulltime_check", 20, 300, 150, 25, { text: "Full-time" }, frame.id),
        w("Label", "satisfaction_label", 20, 340, 80, 25, { text: "Satisfaction:" }, frame.id),
        w("Scale", "satisfaction_scale", 110, 340, 200, 30, { from_: 1, to: 10, orient: "horizontal" }, frame.id),
        w("Button", "save_btn", 200, 380, 100, 30, { text: "Save", bg: "#4CAF50", fg: "white" }, frame.id),
        w("Button", "cancel_btn", 310, 380, 100, 30, { text: "Cancel", bg: "#f44336", fg: "white" }, frame.id),
      ];
    },
  },
  tabbed_ui: {
    label: "Tabbed UI",
    icon: "\u{1F5C2}",
    create: () => {
      const notebook = w("Notebook", "main_notebook", 20, 20, 560, 400, { activeTab: 0 });
      const tab1 = w("Frame", "tab_general", 0, 0, 0, 0, { text: "General" }, notebook.id);
      const tab2 = w("Frame", "tab_advanced", 0, 0, 0, 0, { text: "Advanced" }, notebook.id);
      return [
        notebook, tab1, tab2,
        w("Label", "title_label", 20, 20, 80, 25, { text: "Title:" }, tab1.id),
        w("Entry", "title_entry", 110, 20, 200, 25, {}, tab1.id),
        w("Label", "desc_label", 20, 55, 80, 25, { text: "Description:" }, tab1.id),
        w("Text", "desc_text", 110, 55, 300, 80, {}, tab1.id),
        w("Checkbutton", "enabled_check", 20, 150, 150, 25, { text: "Enabled" }, tab1.id),
        w("Button", "apply_btn", 200, 200, 100, 30, { text: "Apply", bg: "#2196F3", fg: "white" }, tab1.id),
        w("Label", "timeout_label", 20, 20, 80, 25, { text: "Timeout:" }, tab2.id),
        w("Spinbox", "timeout_spin", 110, 20, 80, 25, { from_: 1, to: 120, increment: 5 }, tab2.id),
        w("Label", "log_label", 20, 55, 80, 25, { text: "Log level:" }, tab2.id),
        w("Combobox", "log_combo", 110, 55, 150, 25, { values: "DEBUG,INFO,WARNING,ERROR" }, tab2.id),
        w("Label", "progress_label", 20, 100, 80, 25, { text: "Progress:" }, tab2.id),
        w("Progressbar", "progress_bar", 110, 105, 250, 20, { orient: "horizontal", mode: "determinate" }, tab2.id),
      ];
    },
  },
  menu_app: {
    label: "Menu App",
    icon: "\u{1F4CB}",
    create: () => {
      const frame = w("Frame", "content_frame", 50, 40, 500, 350, { bg: "#f0f0f0" });
      return [
        frame,
        w("Label", "title_label", 20, 20, 300, 30, { text: "Welcome to the App", font: '("Helvetica", 16, "bold")', bg: "#f0f0f0" }, frame.id),
        w("Separator", "sep1", 20, 60, 460, 4, { orient: "horizontal" }, frame.id),
        w("Label", "body_label", 20, 80, 460, 80, { text: "This application was built with Tkinter Designer.\nUse the menu bar to explore features.", bg: "#f0f0f0", justify: "left" }, frame.id),
        w("Button", "action_btn", 180, 200, 140, 35, { text: "Get Started", bg: "#2196F3", fg: "white" }, frame.id),
        w("Progressbar", "loading_bar", 100, 280, 300, 15, { orient: "horizontal", mode: "determinate" }, frame.id),
      ];
    },
  },
  dialog_ok_cancel: {
    label: "Dialog OK/Cancel",
    icon: "\u2714",
    create: () => {
      const frame = w("LabelFrame", "dlg_frame", 50, 30, 400, 180, { text: "Confirm", bd: 2 });
      return [
        frame,
        w("Label", "dlg_message", 20, 20, 350, 60, { text: "Are you sure you want to proceed?", wraplength: 340 }, frame.id),
        w("Button", "dlg_ok", 100, 110, 80, 30, { text: "OK", bg: "#4CAF50", fg: "white" }, frame.id),
        w("Button", "dlg_cancel", 200, 110, 80, 30, { text: "Cancel" }, frame.id),
      ];
    },
  },
  dialog_yes_no: {
    label: "Dialog Yes/No",
    icon: "\u2753",
    create: () => {
      const frame = w("LabelFrame", "dlg_frame", 50, 30, 400, 180, { text: "Question", bd: 2 });
      return [
        frame,
        w("Label", "dlg_message", 20, 20, 350, 60, { text: "Do you want to save changes?", wraplength: 340 }, frame.id),
        w("Button", "dlg_yes", 100, 110, 80, 30, { text: "Yes", bg: "#2196F3", fg: "white" }, frame.id),
        w("Button", "dlg_no", 200, 110, 80, 30, { text: "No", bg: "#f44336", fg: "white" }, frame.id),
      ];
    },
  },
  dialog_input: {
    label: "Dialog Input",
    icon: "\u270F",
    create: () => {
      const frame = w("LabelFrame", "dlg_frame", 50, 30, 400, 200, { text: "Input", bd: 2 });
      return [
        frame,
        w("Label", "dlg_prompt", 20, 20, 350, 25, { text: "Enter value:" }, frame.id),
        w("Entry", "dlg_entry", 20, 50, 340, 25, {}, frame.id),
        w("Button", "dlg_ok", 100, 130, 80, 30, { text: "OK", bg: "#4CAF50", fg: "white" }, frame.id),
        w("Button", "dlg_cancel", 200, 130, 80, 30, { text: "Cancel" }, frame.id),
      ];
    },
  },
  dialog_about: {
    label: "About Dialog",
    icon: "\u2139",
    create: () => {
      const win = w("Toplevel", "about_win", 100, 60, 350, 200, { title: "About", bg: "#f0f0f0" });
      return [
        win,
        w("Label", "about_title", 20, 15, 300, 30, { text: "My Application", font: '("Helvetica", 14, "bold")' }, win.id),
        w("Label", "about_version", 20, 50, 300, 25, { text: "Version 1.0.0" }, win.id),
        w("Separator", "about_sep", 20, 85, 300, 4, { orient: "horizontal" }, win.id),
        w("Label", "about_info", 20, 95, 300, 40, { text: "Built with Tkinter Designer", wraplength: 280 }, win.id),
        w("Button", "about_ok", 130, 145, 80, 30, { text: "OK", bg: "#2196F3", fg: "white" }, win.id),
      ];
    },
  },
};
