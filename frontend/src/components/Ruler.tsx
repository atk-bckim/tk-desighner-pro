interface RulerProps {
  length: number;
  direction: "horizontal" | "vertical";
  zoom: number;
}

export function Ruler({ length, direction, zoom }: RulerProps) {
  const isH = direction === "horizontal";
  const ticks: { pos: number; label?: string }[] = [];
  for (let i = 0; i <= length; i += 50) {
    ticks.push({ pos: i, label: i % 100 === 0 ? String(i) : undefined });
  }

  return (
    <div
      className="bg-gray-800 shrink-0 relative overflow-hidden"
      style={{
        [isH ? "width" : "height"]: `${length * zoom}px`,
        [isH ? "height" : "width"]: "20px",
      }}
    >
      {ticks.map(t => (
        <div key={t.pos} className="absolute text-gray-500" style={{
          [isH ? "left" : "top"]: `${t.pos * zoom}px`,
          [isH ? "top" : "left"]: 0,
          [isH ? "width" : "height"]: "1px",
          [isH ? "height" : "width"]: t.label ? "12px" : "6px",
          backgroundColor: "currentColor",
        }}>
          {t.label && (
            <span className="text-[7px] absolute whitespace-nowrap" style={{ [isH ? "left" : "top"]: "2px", [isH ? "top" : "left"]: t.label ? "12px" : "6px" }}>
              {t.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
