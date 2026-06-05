import type { ComponentType, SVGProps } from "react";
import {
  ChartIcon,
  CheckIcon,
  FormIcon,
  InfoIcon,
  KeyIcon,
  ListIcon,
  MessageIcon,
  SettingsIcon,
  TabsIcon,
} from "./icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const TEMPLATE_ICONS: Record<string, IconComponent> = {
  login_form: KeyIcon,
  settings_panel: SettingsIcon,
  simple_list: ListIcon,
  empty_form: FormIcon,
  data_entry: ChartIcon,
  tabbed_ui: TabsIcon,
  menu_app: ListIcon,
  dialog_ok_cancel: CheckIcon,
  dialog_yes_no: MessageIcon,
  dialog_input: FormIcon,
  dialog_about: InfoIcon,
};

export function TemplateIcon({
  className = "h-4 w-4",
  templateKey,
}: {
  className?: string;
  templateKey: string;
}) {
  const Icon = TEMPLATE_ICONS[templateKey] ?? FormIcon;
  return <Icon className={className} />;
}
