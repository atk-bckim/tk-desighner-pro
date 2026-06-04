import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useDesignerStore } from "../store/designerStore";
import { WIDGET_EVENTS, GENERIC_EVENTS } from "../utils/widgetDefaults";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";

interface EventEditorModalProps {
  widgetId: string;
  onClose: () => void;
}

function buildAllEvents(
  widgetType: string,
  existingEvents: Record<string, string>
) {
  const widgetEvents = WIDGET_EVENTS[widgetType] ?? [];
  const list = [...widgetEvents];
  for (const ge of GENERIC_EVENTS) {
    if (
      existingEvents[ge.event] !== undefined &&
      !list.some((e) => e.event === ge.event)
    ) {
      list.push(ge);
    }
  }
  return list;
}

export function EventEditorModal({ widgetId, onClose }: EventEditorModalProps) {
  const widget = useDesignerStore((s) => s.widgets.find((w) => w.id === widgetId));
  const { snapshot, updateWidgetEvent, removeWidgetEvent } = useDesignerStore();

  const existingEvents = useMemo(() => widget?.events ?? {}, [widget?.events]);

  const allEvents = useMemo(
    () => (widget ? buildAllEvents(widget.type, existingEvents) : []),
    [widget, existingEvents]
  );

  // Which generic events can still be added (not already present)
  const addableGenericEvents = useMemo(
    () => GENERIC_EVENTS.filter((ge) => !allEvents.some((e) => e.event === ge.event)),
    [allEvents]
  );

  const [activeEvent, setActiveEvent] = useState<string | null>(() =>
    allEvents.length > 0 ? allEvents[0].event : null
  );
  const [codeMap, setCodeMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (widget?.events) {
      for (const [key, val] of Object.entries(widget.events)) {
        map[key] = val;
      }
    }
    return map;
  });
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCode = activeEvent ? codeMap[activeEvent] ?? existingEvents[activeEvent] ?? "" : "";

  const handleCodeChange = useCallback(
    (value: string) => {
      if (!activeEvent) return;
      setCodeMap((prev) => ({ ...prev, [activeEvent]: value }));
    },
    [activeEvent]
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!showAddDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddDropdown]);

  // CodeMirror editor
  useEffect(() => {
    if (!editorContainerRef.current || !activeEvent) return;
    editorViewRef.current?.destroy();

    const state = EditorState.create({
      doc: currentCode,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
        python(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleCodeChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { fontSize: "12px", height: "100%" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { padding: "4px 0" },
        }),
      ],
    });
    editorViewRef.current = new EditorView({ state, parent: editorContainerRef.current });
    return () => { editorViewRef.current?.destroy(); editorViewRef.current = null; };
  }, [activeEvent, currentCode, handleCodeChange]);

  // Escape key to close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (!activeEvent) return;
    const code = codeMap[activeEvent] ?? "";
    snapshot();
    updateWidgetEvent(widgetId, activeEvent, code);
  }, [activeEvent, codeMap, widgetId, snapshot, updateWidgetEvent]);

  const handleDelete = useCallback(() => {
    if (!activeEvent) return;
    snapshot();
    removeWidgetEvent(widgetId, activeEvent);
    setCodeMap((prev) => {
      const next = { ...prev };
      delete next[activeEvent];
      return next;
    });
    // Switch to another tab if available
    const remaining = allEvents.filter((e) => e.event !== activeEvent);
    setActiveEvent(remaining.length > 0 ? remaining[0].event : null);
  }, [activeEvent, widgetId, snapshot, removeWidgetEvent, allEvents]);

  const handleAddGenericEvent = useCallback(
    (event: string) => {
      setShowAddDropdown(false);
      setCodeMap((prev) => ({ ...prev, [event]: "" }));
      setActiveEvent(event);
    },
    []
  );

  if (!widget) return null;

  const activeEventDef = allEvents.find((e) => e.event === activeEvent);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1e1e2e] border border-[#3c3c52] rounded-lg shadow-xl w-[680px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c52]">
          <div>
            <h3 className="text-xs font-semibold text-[#d4d4e8]">Event Editor</h3>
            <p className="text-[10px] text-[#5a5a72] mt-0.5">
              {widget.name} <span className="text-[#8888a8]">({widget.type})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5a5a72] hover:text-[#d4d4e8] text-sm leading-none transition-colors"
          >
            &#10005;
          </button>
        </div>

        {/* Tabs */}
        {allEvents.length > 0 ? (
          <div className="flex items-center gap-2 px-4 py-4 border-b border-[#3c3c52] shrink-0 relative overflow-visible">
            {allEvents.map((ev) => {
              const isActive = activeEvent === ev.event;
              const hasCode = !!(existingEvents[ev.event] ?? codeMap[ev.event])?.trim();
              return (
                <button
                  key={ev.event}
                  onClick={() => setActiveEvent(ev.event)}
                  className={`text-sm px-5 py-2.5 rounded transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-[#06b6d4] text-white"
                      : "bg-transparent text-[#8888a8] hover:text-[#d4d4e8] hover:bg-[#252536]"
                  }`}
                >
                  {ev.label}
                  {hasCode && <span className="ml-0.5 text-[#f59e0b]">*</span>}
                </button>
              );
            })}

            {/* Add generic event button */}
            {addableGenericEvents.length > 0 && (
              <div className="relative ml-1" ref={dropdownRef}>
                <button
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  className="text-xs px-2 py-1 rounded text-[#06b6d4] hover:bg-[#252536] transition-colors"
                >
                  +
                </button>
                {showAddDropdown && (
                  <div className="absolute left-0 top-full mt-1 bg-[#252536] border border-[#3c3c52] rounded shadow-lg z-[100] min-w-[160px]">
                    {addableGenericEvents.map((ge) => (
                      <button
                        key={ge.event}
                        onClick={() => handleAddGenericEvent(ge.event)}
                        className="block w-full text-left text-[10px] text-[#d4d4e8] hover:bg-[#06b6d4]/20 px-3 py-1.5 transition-colors"
                      >
                        {ge.label}
                        <span className="text-[#5a5a72] ml-1.5">{ge.event}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-[#3c3c52] flex items-center justify-between">
            <p className="text-[10px] text-[#5a5a72]">No events available for this widget type.</p>
            {addableGenericEvents.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#252536] border border-[#3c3c52] hover:border-[#06b6d4]/50 text-[#06b6d4] transition-colors"
                >
                  + Add Event
                </button>
                {showAddDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-[#252536] border border-[#3c3c52] rounded shadow-lg z-[100] min-w-[160px]">
                    {addableGenericEvents.map((ge) => (
                      <button
                        key={ge.event}
                        onClick={() => handleAddGenericEvent(ge.event)}
                        className="block w-full text-left text-[10px] text-[#d4d4e8] hover:bg-[#06b6d4]/20 px-3 py-1.5 transition-colors"
                      >
                        {ge.label}
                        <span className="text-[#5a5a72] ml-1.5">{ge.event}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Code editor area */}
        {activeEvent && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] font-semibold text-[#5a5a72] uppercase tracking-wider">
                {activeEventDef?.label ?? activeEvent}
                <span className="ml-1.5 font-normal normal-case text-[#5a5a72]">{activeEvent}</span>
              </p>
            </div>
            <div className="flex flex-1 mx-4 mb-1 border border-[#3c3c52] rounded overflow-hidden min-h-[240px]">
              <div ref={editorContainerRef} className="flex-1 overflow-hidden" />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#3c3c52] shrink-0">
          <div className="flex gap-1">
            {activeEvent && (
              <button
                onClick={handleDelete}
                className="text-[10px] text-[#ef4444] hover:text-[#f87171] px-2 py-0.5 rounded transition-colors"
              >
                Delete Handler
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onClose}
              className="text-[10px] bg-[#252536] border border-[#3c3c52] hover:bg-[#2d2d42] hover:border-[#06b6d4]/50 text-[#8888a8] hover:text-[#d4d4e8] px-3 py-1 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!activeEvent}
              className="text-[10px] bg-[#06b6d4] hover:bg-[#22d3ee] disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1 rounded transition-colors"
            >
              Save
            </button>
          </div>
          <span className="text-[9px] text-[#5a5a72]">Ctrl+Enter to save, Esc to close</span>
        </div>
      </div>
    </div>
  );
}
