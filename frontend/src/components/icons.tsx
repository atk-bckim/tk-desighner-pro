import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${className ?? ""}`}
      {...props}
    >
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SaveIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 4.5h10.5L16 6v10H4z" /><path {...strokeProps} d="M7 4.5v4h7" /><path {...strokeProps} d="M7 16v-5h6v5" /></IconBase>;
}

export function UploadIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 15V5" /><path {...strokeProps} d="M6.5 8.5 10 5l3.5 3.5" /><path {...strokeProps} d="M4 15.5h12" /></IconBase>;
}

export function UndoIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M8 6H4v4" /><path {...strokeProps} d="M4 6l5.2 5.2A4.2 4.2 0 0 0 16 8.2" /></IconBase>;
}

export function RedoIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M12 6h4v4" /><path {...strokeProps} d="m16 6-5.2 5.2A4.2 4.2 0 0 1 4 8.2" /></IconBase>;
}

export function PlayIcon(props: IconProps) {
  return <IconBase {...props}><path fill="currentColor" d="M6.5 4.9v10.2c0 .7.8 1.1 1.4.7l7.4-5.1c.5-.4.5-1.1 0-1.4L7.9 4.2c-.6-.4-1.4 0-1.4.7Z" /></IconBase>;
}

export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="m4.5 10.4 3.2 3.2 7.8-8" /></IconBase>;
}

export function ExportIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 3.8v8.5" /><path {...strokeProps} d="M6.5 8.8 10 12.3l3.5-3.5" /><path {...strokeProps} d="M4.5 15.5h11" /></IconBase>;
}

export function PanelIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M3.5 4h13v12h-13z" /><path {...strokeProps} d="M7.2 4v12" /></IconBase>;
}

export function MoreIcon(props: IconProps) {
  return <IconBase {...props}><path fill="currentColor" d="M5 11.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM10 11.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM15 11.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" /></IconBase>;
}

export function TimerIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M8 3.5h4" /><path {...strokeProps} d="M10 6.5v4l2.5 1.5" /><path {...strokeProps} d="M10 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" /></IconBase>;
}

export function FolderOpenIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M3.5 6h5l1.5 2h6.5v1.8" /><path {...strokeProps} d="M4.2 15.5h11.1l1.2-7H6.1z" /></IconBase>;
}

export function PaletteIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10.1 3.8a6.5 6.5 0 0 0-6.6 6.4c0 3 2.4 5.5 5.4 5.5h1.2c.8 0 1.2-.9.7-1.5-.4-.5 0-1.3.7-1.3h1.2a3.9 3.9 0 0 0 3.8-4.2 6.4 6.4 0 0 0-6.4-4.9Z" /><path fill="currentColor" d="M7 10.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8ZM9.2 7.7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8ZM12.5 8.1a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" /></IconBase>;
}

export function MessageIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 5h12v9H8l-4 2.5z" /><path {...strokeProps} d="M7 8.5h6" /><path {...strokeProps} d="M7 11h4" /></IconBase>;
}

export function KeyIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M8.2 11.8a3.5 3.5 0 1 1 2-2" /><path {...strokeProps} d="m10.5 10.5 6 6" /><path {...strokeProps} d="m13.5 13.5 1.8-1.8" /><path {...strokeProps} d="m15.5 15.5 1.2-1.2" /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" /><path {...strokeProps} d="M10 3.5v2" /><path {...strokeProps} d="M10 14.5v2" /><path {...strokeProps} d="M4.4 6.2l1.7 1" /><path {...strokeProps} d="m13.9 12.8 1.7 1" /><path {...strokeProps} d="m4.4 13.8 1.7-1" /><path {...strokeProps} d="m13.9 7.2 1.7-1" /></IconBase>;
}

export function ListIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M7 5h10" /><path {...strokeProps} d="M7 10h10" /><path {...strokeProps} d="M7 15h10" /><path fill="currentColor" d="M4.5 5.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6ZM4.5 10.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6ZM4.5 15.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z" /></IconBase>;
}

export function FormIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4.5 3.8h11v12.4h-11z" /><path {...strokeProps} d="M7 7h6" /><path {...strokeProps} d="M7 10h6" /><path {...strokeProps} d="M7 13h3.5" /></IconBase>;
}

export function ChartIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 16h12" /><path {...strokeProps} d="M6 13V8" /><path {...strokeProps} d="M10 13V5" /><path {...strokeProps} d="M14 13v-3" /></IconBase>;
}

export function TabsIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 6.5h4.5l1 2H16v8H4z" /><path {...strokeProps} d="M4 6.5v-2h5l1 2" /></IconBase>;
}

export function InfoIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" /><path {...strokeProps} d="M10 9v4" /><path fill="currentColor" d="M10 7.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></IconBase>;
}

export function ChevronUpIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="m5.5 12 4.5-4.5 4.5 4.5" /></IconBase>;
}

export function ChevronDownIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="m5.5 8 4.5 4.5L14.5 8" /></IconBase>;
}

export function ResizeVerticalIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M10 3.5v13" /><path {...strokeProps} d="m7.5 6 2.5-2.5L12.5 6" /><path {...strokeProps} d="m7.5 14 2.5 2.5 2.5-2.5" /></IconBase>;
}

export function WidgetIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 4h6v6H4z" /><path {...strokeProps} d="M10 10h6v6h-6z" /><path {...strokeProps} d="M12.5 4H16v3.5" /><path {...strokeProps} d="M4 12.5V16h3.5" /></IconBase>;
}

export function LayersIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="m10 3.5 7 4-7 4-7-4z" /><path {...strokeProps} d="m3 11 7 4 7-4" /></IconBase>;
}

export function AssetIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 5h12v10H4z" /><path {...strokeProps} d="m6 13 3-3 2 2 2.5-3 2.5 4" /></IconBase>;
}

export function VariableIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M4 14c2.5-4.7 3.9-7.4 4.1-8 .2-.6.1-1.1-.3-1.4-.7-.6-2 .1-2.7 1" /><path {...strokeProps} d="M8 10c1.2 2.5 2.5 4 3.8 4 1 0 1.9-.7 2.8-2" /><path {...strokeProps} d="m13 7 3 3" /><path {...strokeProps} d="m16 7-3 3" /></IconBase>;
}

export function ComponentIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M7 4.5h6l3 5.5-3 5.5H7L4 10z" /><path {...strokeProps} d="M10 7v6" /><path {...strokeProps} d="M7 10h6" /></IconBase>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><path {...strokeProps} d="M9 14.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" /><path {...strokeProps} d="m13 13 3 3" /></IconBase>;
}
