"use client";

import type { ReactNode } from "react";

export function Panel({ title, subtitle, children, className = "", action }: { title?: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`lab-panel ${className}`}>
      {title ? (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--lab-ink)]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[0.72rem] leading-snug text-[var(--lab-ink-2)]">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-4 flex items-center justify-between gap-2 first:mt-0">
      <h3 className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[var(--lab-ink-2)]">{children}</h3>
      {right}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
  disabled,
  reference,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
  disabled?: boolean;
  /** A reference value shown as a tick (e.g. the WEO assumption). */
  reference?: number;
}) {
  const shown = format ? format(value) : String(value);
  const pct = ((value - min) / (max - min)) * 100;
  const refPct = reference === undefined ? null : ((reference - min) / (max - min)) * 100;
  return (
    <label className={`lab-field ${disabled ? "opacity-50" : ""}`}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[0.78rem] font-medium text-[var(--lab-ink)]">{label}</span>
        <span className="font-mono text-[0.78rem] tabular-nums text-[var(--lab-ink)]">{shown}</span>
      </span>
      <span className="relative mt-1 block">
        {refPct !== null ? <span aria-hidden="true" className="lab-ref-tick" style={{ left: `calc(${Math.max(0, Math.min(100, refPct))}% - 1px)` }} /> : null}
        <input
          type="range"
          className="lab-range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ["--pct" as string]: `${pct}%` }}
          aria-label={label}
        />
      </span>
      {hint ? <span className="mt-0.5 block text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">{hint}</span> : null}
    </label>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size = "sm", ariaLabel }: { options: { value: T; label: string; title?: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md"; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`lab-segmented ${size === "md" ? "lab-segmented-md" : ""}`}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.title} onClick={() => onChange(o.value)} className={value === o.value ? "is-active" : ""}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="lab-field flex cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="block text-[0.78rem] font-medium text-[var(--lab-ink)]">{label}</span>
        {hint ? <span className="mt-0.5 block text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">{hint}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span aria-hidden="true" className="lab-toggle" />
      </span>
    </label>
  );
}

export function Btn({ children, onClick, variant = "ghost", size = "sm", disabled, title, type = "button", className = "", ariaPressed }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "soft"; size?: "sm" | "xs" | "md"; disabled?: boolean; title?: string; type?: "button" | "submit"; className?: string; ariaPressed?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} aria-pressed={ariaPressed} className={`lab-btn lab-btn-${variant} lab-btn-${size} ${className}`}>
      {children}
    </button>
  );
}

export function Chip({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info"; className?: string }) {
  return <span className={`lab-chip lab-chip-${tone} ${className}`}>{children}</span>;
}

export function Select<T extends string | number>({ value, onChange, options, ariaLabel, className = "" }: { value: T; onChange: (v: string) => void; options: { value: T; label: string }[]; ariaLabel: string; className?: string }) {
  return (
    <select aria-label={ariaLabel} className={`lab-select ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function NumberInput({ value, onChange, step, min, max, ariaLabel, className = "" }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; ariaLabel: string; className?: string }) {
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      className={`lab-input ${className}`}
      value={Number.isFinite(value) ? value : ""}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
    />
  );
}

export function StatusDot({ tone }: { tone: "good" | "warn" | "bad" | "neutral" | "info" }) {
  return <span aria-hidden="true" className={`lab-dot lab-dot-${tone}`} />;
}
