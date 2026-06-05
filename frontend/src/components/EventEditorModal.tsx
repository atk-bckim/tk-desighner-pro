import { lazy, Suspense, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useDesignerStore } from "../store/designerStore";
import { WIDGET_EVENTS, GENERIC_EVENTS } from "../utils/widgetDefaults";

const PythonCodeEditor = lazy(() => import("./PythonCodeEditor"));

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
  const [activeEvent, setActiveEvent] = useState<string | null>(() =>
    widget ? buildAllEvents(widget.type, widget.events ?? {})[0]?.event ?? null : null
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const codeMapRef = useRef(codeMap);

  const allEvents = useMemo(
    () => (widget ? buildAllEvents(widget.type, codeMap) : []),
    [widget, codeMap]
  );

  // Which generic events can still be added (not already present)
  const addableGenericEvents = useMemo(
    () => GENERIC_EVENTS.filter((ge) => !allEvents.some((e) => e.event === ge.event)),
    [allEvents]
  );

  const currentCode = activeEvent ? codeMap[activeEvent] ?? existingEvents[activeEvent] ?? "" : "";

  useEffect(() => {
    codeMapRef.current = codeMap;
  }, [codeMap]);

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
    const code = codeMapRef.current[activeEvent] ?? existingEvents[activeEvent] ?? "";
    if (code === (existingEvents[activeEvent] ?? "")) return;
    snapshot();
    updateWidgetEvent(widgetId, activeEvent, code);
  }, [activeEvent, existingEvents, widgetId, snapshot, updateWidgetEvent]);

  const handleCodeChange = useCallback((code: string) => {
    if (!activeEvent) return;
    setCodeMap((prev) => {
      if (prev[activeEvent] === code) return prev;
      const next = { ...prev, [activeEvent]: code };
      codeMapRef.current = next;
      return next;
    });
  }, [activeEvent]);

  const handleDelete = useCallback(() => {
    if (!activeEvent) return;
    snapshot();
    removeWidgetEvent(widgetId, activeEvent);
    setCodeMap((prev) => {
      const next = { ...prev };
      delete next[activeEvent];
      codeMapRef.current = next;
      return next;
    });
    // Switch to another tab if available
    const remaining = allEvents.filter((e) => e.event !== activeEvent);
    setActiveEvent(remaining.length > 0 ? remaining[0].event : null);
  }, [activeEvent, widgetId, snapshot, removeWidgetEvent, allEvents]);

  const handleAddGenericEvent = useCallback(
    (event: string) => {
      setShowAddDropdown(false);
      setCodeMap((prev) => {
        const next = { ...prev, [event]: "" };
        codeMapRef.current = next;
        return next;
      });
      setActiveEvent(event);
    },
    []
  );

  if (!widget) return null;

  const activeEventDef = allEvents.find((e) => e.event === activeEvent);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-[680px] flex-col rounded-lg border border-[var(--td-border)] bg-[var(--td-panel)] shadow-[var(--td-shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--td-border)] px-4 py-3">
          <div>
            <h3 className="text-xs font-semibold text-[var(--td-text)]">Event Editor</h3>
            <p className="mt-0.5 text-[10px] text-[var(--td-text-subtle)]">
              {widget.name} <span className="text-[var(--td-text-muted)]">({widget.type})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-0.5 text-[10px] text-[var(--td-text-muted)] transition-colors hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        {allEvents.length > 0 ? (
          <div className="relative flex shrink-0 items-center gap-2 overflow-visible border-b border-[var(--td-border)] px-4 py-4">
            {allEvents.map((ev) => {
              const isActive = activeEvent === ev.event;
              const hasCode = !!(existingEvents[ev.event] ?? codeMap[ev.event])?.trim();
              return (
                <button
                  key={ev.event}
                  type="button"
                  onClick={() => setActiveEvent(ev.event)}
                  className={`text-sm px-5 py-2.5 rounded transition-colors whitespace-nowrap ${
                    isActive
                      ? "border border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100"
                      : "bg-transparent text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
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
                  type="button"
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  aria-expanded={showAddDropdown}
                  aria-haspopup="menu"
                  aria-label="Add event"
                  className="rounded px-2 py-1 text-xs text-cyan-100 transition-colors hover:bg-[var(--td-panel-soft)]"
                >
                  +
                </button>
                {showAddDropdown && (
                  <div className="absolute left-0 top-full z-[100] mt-1 min-w-[160px] rounded border border-[var(--td-border)] bg-[var(--td-panel-raised)] shadow-[var(--td-shadow-panel)]">
                    {addableGenericEvents.map((ge) => (
                      <button
                        key={ge.event}
                        type="button"
                        onClick={() => handleAddGenericEvent(ge.event)}
                        className="block w-full px-3 py-1.5 text-left text-[10px] text-[var(--td-text)] transition-colors hover:bg-[var(--td-accent-soft)]"
                      >
                        {ge.label}
                        <span className="ml-1.5 text-[var(--td-text-subtle)]">{ge.event}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-[var(--td-border)] px-4 py-3">
            <p className="text-[10px] text-[var(--td-text-subtle)]">No events available for this widget type.</p>
            {addableGenericEvents.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  aria-expanded={showAddDropdown}
                  aria-haspopup="menu"
                  className="rounded border border-[var(--td-border)] bg-[var(--td-panel-raised)] px-2 py-0.5 text-[10px] text-cyan-100 transition-colors hover:border-[var(--td-accent-border)] hover:bg-[var(--td-panel-soft)]"
                >
                  + Add Event
                </button>
                {showAddDropdown && (
                  <div className="absolute right-0 top-full z-[100] mt-1 min-w-[160px] rounded border border-[var(--td-border)] bg-[var(--td-panel-raised)] shadow-[var(--td-shadow-panel)]">
                    {addableGenericEvents.map((ge) => (
                      <button
                        key={ge.event}
                        type="button"
                        onClick={() => handleAddGenericEvent(ge.event)}
                        className="block w-full px-3 py-1.5 text-left text-[10px] text-[var(--td-text)] transition-colors hover:bg-[var(--td-accent-soft)]"
                      >
                        {ge.label}
                        <span className="ml-1.5 text-[var(--td-text-subtle)]">{ge.event}</span>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--td-text-subtle)]">
                {activeEventDef?.label ?? activeEvent}
                <span className="ml-1.5 font-normal normal-case text-[var(--td-text-subtle)]">{activeEvent}</span>
              </p>
            </div>
            <div className="mx-4 mb-1 flex min-h-[240px] flex-1 overflow-hidden rounded border border-[var(--td-border)] bg-[var(--td-bg)]">
              <Suspense
                fallback={
                  <div className="flex flex-1 items-center justify-center text-[11px] text-[var(--td-text-subtle)]">
                    Loading...
                  </div>
                }
              >
                <PythonCodeEditor
                  key={activeEvent}
                  value={currentCode}
                  onChange={handleCodeChange}
                  onEscape={onClose}
                  onModEnter={handleSave}
                  theme="dark"
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--td-border)] px-4 py-2">
          <div className="flex gap-1">
            {activeEvent && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded px-2 py-0.5 text-[10px] text-[var(--td-danger)] transition-colors hover:bg-red-500/15"
              >
                Delete Handler
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--td-border)] bg-[var(--td-panel-raised)] px-3 py-1 text-[10px] text-[var(--td-text-muted)] transition-colors hover:border-[var(--td-accent-border)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!activeEvent}
              className="rounded border border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] px-3 py-1 text-[10px] text-cyan-100 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Save
            </button>
          </div>
          <span className="text-[9px] text-[var(--td-text-subtle)]">Ctrl+Enter to save, Esc to close</span>
        </div>
      </div>
    </div>
  );
}
