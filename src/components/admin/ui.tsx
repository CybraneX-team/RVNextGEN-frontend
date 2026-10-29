"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Shared building blocks for the admin panel so every page looks and behaves the same:
 * a page header, cards, labelled fields with hints, buttons, badges, an on/off switch and a dialog.
 */

/** Loads `fn` once per token/dependency change; returns {data, error, loading, reload}. */
export function useAsync<T>(fn: (token: string) => Promise<T>, token: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!token) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: reset state before the request
    setLoading(true); setError(null);
    fn(token).then((result) => { if (live) setData(result); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tick, ...deps]);
  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

export const Loading = () => <p className="text-[13px] text-white/40">Loading…</p>;
export const ErrorLine = ({ text }: { text: string }) => <p role="alert" className="text-[13px] text-[#ff8f8f]">{text}</p>;

/** Payment status as a coloured badge (statuses arrive in either case). */
export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "SUCCEEDED" || s === "PAID") return <Badge tone="good">Paid</Badge>;
  if (s === "PENDING" || s === "CREATED") return <Badge tone="warn">Pending</Badge>;
  if (s === "FAILED" || s === "CANCELLED" || s === "CANCELED") return <Badge tone="bad">{s === "FAILED" ? "Failed" : "Cancelled"}</Badge>;
  if (s === "REFUNDED") return <Badge tone="info">Refunded</Badge>;
  return <Badge>{status}</Badge>;
}

export const inputClass = "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[#7fc4a3]/60 disabled:opacity-50";
export const thClass = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white/40";
export const tdClass = "px-3 py-2.5 text-[13px] text-white/80";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-[min(100%,18rem)] flex-1">
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-white">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[14px] leading-6 text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = "" }: { title?: string; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/8 bg-white/[0.02] p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="min-w-[min(100%,16rem)] flex-1">
            {title && <h2 className="text-[16px] font-semibold text-white">{title}</h2>}
            {description && <p className="mt-1 text-[13px] leading-5 text-white/45">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type ButtonTone = "primary" | "secondary" | "danger" | "ghost";
const buttonTones: Record<ButtonTone, string> = {
  primary: "bg-[#2f7d5b] text-white hover:bg-[#2a704f]",
  secondary: "border border-white/15 text-white/85 hover:bg-white/8",
  danger: "border border-[#8f2f2f]/60 text-[#ff9f9f] hover:bg-[#8f2f2f]/20",
  ghost: "text-white/60 hover:bg-white/5 hover:text-white",
};

export function Button({ tone = "secondary", size = "md", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "h-8 px-3 text-[12px]" : "h-10 px-4 text-[13px]";
  return <button type="button" {...props} className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${buttonTones[tone]} ${className}`} />;
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[12px] font-medium text-white/65">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-4 text-white/40">{hint}</span>}
    </label>
  );
}

type BadgeTone = "neutral" | "good" | "warn" | "bad" | "info";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-white/8 text-white/60",
  good: "bg-[#2f7d5b]/20 text-[#9fe0bd]",
  warn: "bg-[#c08a2e]/20 text-[#f0c98a]",
  bad: "bg-[#8f2f2f]/25 text-[#ff9f9f]",
  info: "bg-[#2e6fc0]/20 text-[#9fc3f0]",
};
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeTones[tone]}`}>{children}</span>;
}

/** Accessible on/off switch; `label` is read by screen readers. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-[#2f7d5b]" : "bg-white/15"}`}>
      <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = tone === "error" ? "border-[#8f2f2f]/50 bg-[#8f2f2f]/15 text-[#ffb3b3]" : tone === "success" ? "border-[#2f7d5b]/50 bg-[#2f7d5b]/15 text-[#a9e8c6]" : "border-white/10 bg-white/[0.03] text-white/60";
  return <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-[13px] leading-5 ${styles}`}>{children}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="p-6 text-center text-[13px] text-white/40">{children}</p>;
}

export function Dialog({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`mt-12 w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-white/10 bg-[#121415] p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-white/50">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Segmented control for a small set of choices (filters, add/remove). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-white/12 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${value === o.value ? "bg-white text-[#0e0d0f]" : "text-white/60 hover:text-white"}`}>{o.label}</button>
      ))}
    </div>
  );
}
