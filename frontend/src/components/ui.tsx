import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--td-text-muted)] transition-colors hover:border-[var(--td-border-strong)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)] disabled:opacity-35 ${className}`}
      {...props}
    >
      <span className="h-4 w-4">{children}</span>
    </button>
  );
}

export function TextButton({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "primary" | "success" | "warning" | "danger" }) {
  const variants = {
    ghost: "border-[var(--td-border)] bg-[var(--td-panel)] text-[var(--td-text-muted)] hover:border-[var(--td-border-strong)] hover:bg-[var(--td-panel-soft)] hover:text-[var(--td-text)]",
    primary: "border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100 hover:bg-cyan-400/20",
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    danger: "border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25",
  };
  return <button className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors disabled:opacity-35 ${variants[variant]} ${className}`} {...props} />;
}

export function PanelHeader({ title, detail, actions }: { title: string; detail?: string; actions?: ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-[var(--td-border)] px-3">
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase text-[var(--td-text)]">{title}</div>
        {detail && <div className="truncate text-[10px] text-[var(--td-text-subtle)]">{detail}</div>}
      </div>
      {actions && <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--td-border)] px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase text-[var(--td-text-subtle)]">{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-[var(--td-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-7 w-full rounded-md border border-[var(--td-border)] bg-[var(--td-bg)] px-2 text-[11px] text-[var(--td-text)] placeholder:text-[var(--td-text-subtle)] focus:border-[var(--td-accent)] focus:outline-none" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-7 w-full rounded-md border border-[var(--td-border)] bg-[var(--td-bg)] px-2 text-[11px] text-[var(--td-text)] focus:border-[var(--td-accent)] focus:outline-none" {...props} />;
}

export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "border-[var(--td-border)] bg-[var(--td-panel)] text-[var(--td-text-muted)]",
    accent: "border-[var(--td-accent-border)] bg-[var(--td-accent-soft)] text-cyan-100",
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    danger: "border-red-400/40 bg-red-500/15 text-red-100",
  };
  return <span className={`inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--td-border)] bg-[var(--td-panel)] px-4 py-5 text-center">
      <div className="text-[12px] font-semibold text-[var(--td-text)]">{title}</div>
      <p className="mt-1 max-w-56 text-[11px] leading-5 text-[var(--td-text-muted)]">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
