import { useState, useMemo } from "react";

const TKINTER_FONTS = [
  "Helvetica", "Times", "Courier", "Arial", "Verdana", "TkDefaultFont",
  "TkTextFont", "TkFixedFont", "TkMenuFont", "TkHeadingFont",
  "TkCaptionFont", "TkSmallCaptionFont", "TkIconFont", "TkTooltipFont",
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

interface FontPickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

function parseTkFont(s: string) {
  const defaults = { family: "Helvetica", size: 12, bold: false, italic: false };
  try {
    const cleaned = s.replace(/[()"]/g, "");
    const parts = cleaned.split(",").map(p => p.trim());
    return {
      family: parts[0] || defaults.family,
      size: parseInt(parts[1]) || defaults.size,
      bold: parts.some(p => p.toLowerCase().includes("bold")),
      italic: parts.some(p => p.toLowerCase().includes("italic")),
    };
  } catch { return defaults; }
}

function toTkFont(f: { family: string; size: number; bold: boolean; italic: boolean }): string {
  const styles: string[] = [];
  if (f.bold) styles.push("bold");
  if (f.italic) styles.push("italic");
  const styleStr = styles.length > 0 ? `, "${styles.join(" ")}"` : "";
  return `("${f.family}", ${f.size}${styleStr})`;
}

export function FontPicker({ value, onChange, onClose }: FontPickerProps) {
  const parsed = useMemo(() => parseTkFont(value), [value]);
  const [family, setFamily] = useState(parsed.family);
  const [size, setSize] = useState(parsed.size);
  const [bold, setBold] = useState(parsed.bold);
  const [italic, setItalic] = useState(parsed.italic);
  const result = toTkFont({ family, size, bold, italic });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-4 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-3">Font Picker</h3>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-gray-400">Font Family
            <select className="block w-full bg-gray-700 rounded px-2 py-1 text-white mt-0.5" value={family} onChange={(e) => setFamily(e.target.value)}>
              {TKINTER_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Size
            <select className="block w-full bg-gray-700 rounded px-2 py-1 text-white mt-0.5" value={size} onChange={(e) => setSize(parseInt(e.target.value))}>
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setBold(!bold)} className={`px-3 py-1 rounded text-sm font-bold ${bold ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400"}`}>B</button>
            <button onClick={() => setItalic(!italic)} className={`px-3 py-1 rounded text-sm italic ${italic ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400"}`}>I</button>
          </div>
          <div className="bg-white rounded p-2 mt-1">
            <span className="text-gray-800" style={{ fontFamily: family, fontSize: `${size}px`, fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal" }}>AaBbCc 123</span>
          </div>
          <code className="text-xs text-green-400 bg-gray-900 rounded p-1.5">{result}</code>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-300">Cancel</button>
          <button onClick={() => { onChange(result); onClose(); }} className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white">Apply</button>
        </div>
      </div>
    </div>
  );
}
