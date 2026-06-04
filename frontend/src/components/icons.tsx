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
