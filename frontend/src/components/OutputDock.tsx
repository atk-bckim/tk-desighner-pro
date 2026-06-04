import { useMemo, useState } from "react";
import { CodePreview } from "./CodePreview";
import { PanelHeader, StatusChip, TextButton } from "./ui";
import type { OutputRecord, OutputTone } from "../types/output";

interface OutputDockProps {
  records: OutputRecord[];
  onClear: () => void;
}

type TabId = "code" | "validation" | "logs" | "export";

const TABS: { id: TabId; label: string }[] = [
  { id: "code", label: "Code" },
  { id: "validation", label: "Validation" },
  { id: "logs", label: "Logs" },
  { id: "export", label: "Export Preview" },
];

const toneToChipTone: Record<OutputTone, "neutral" | "success" | "warning" | "danger"> = {
  info: "neutral",
  success: "success",
  warning: "warning",
  error: "danger",
};

const emptyText: Record<Exclude<TabId, "code">, string> = {
  validation: "No validation results yet.",
  logs: "No logs yet.",
  export: "No export records yet.",
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function RecordList({ records, empty }: { records: OutputRecord[]; empty: string }) {
  if (records.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[var(--td-text-subtle)]">
        {empty}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {records.map((record) => (
        <article
          key={record.id}
          className="rounded-md border border-[var(--td-border)] bg-[var(--td-panel-soft)] px-3 py-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <StatusChip tone={toneToChipTone[record.tone]}>{record.tone}</StatusChip>
              <div className="min-w-0 truncate text-[12px] font-semibold text-[var(--td-text)]">{record.title}</div>
            </div>
            <time className="shrink-0 text-[10px] text-[var(--td-text-subtle)]">
              {formatTime(record.createdAt)}
            </time>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[var(--td-text-muted)]">{record.message}</p>
          {record.details && record.details.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-[var(--td-border)] pt-2">
              {record.details.map((detail, index) => (
                <li key={`${record.id}-${index}`} className="text-[11px] leading-5 text-[var(--td-text-muted)]">
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

export function OutputDock({ records, onClear }: OutputDockProps) {
  const [activeTab, setActiveTab] = useState<TabId>("code");
  const filteredRecords = useMemo(() => {
    if (activeTab === "validation") return records.filter((record) => record.kind === "validation");
    if (activeTab === "export") return records.filter((record) => record.kind === "export");
    if (activeTab === "logs") return records.filter((record) => record.kind !== "validation");
    return [];
  }, [activeTab, records]);

  return (
    <section className="h-56 shrink-0 border-t border-[var(--td-border)] bg-[var(--td-panel)]">
      <PanelHeader
        title="Output"
        detail={`${records.length} records`}
        actions={<TextButton onClick={onClear} disabled={records.length === 0}>Clear</TextButton>}
      />
      <div className="flex h-[calc(100%-2.5rem)] min-h-0">
        <div className="w-40 shrink-0 border-r border-[var(--td-border)] bg-[var(--td-panel)] p-2">
          <div className="space-y-1" role="tablist" aria-label="Output tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-7 w-full items-center rounded-md px-2 text-left text-[11px] transition-colors ${
                  activeTab === tab.id
                    ? "bg-[var(--td-accent-soft)] text-cyan-100"
                    : "text-[var(--td-text-muted)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden bg-[var(--td-panel)]">
          {activeTab === "code" ? (
            <CodePreview docked />
          ) : (
            <div className="h-full overflow-auto">
              <RecordList records={filteredRecords} empty={emptyText[activeTab]} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
