import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

export function Badge({
  children,
  color = "slate",
  className = "",
}: {
  children: ReactNode;
  color?: "slate" | "gold" | "green" | "red" | "sky";
  className?: string;
}) {
  const colors = {
    slate: "bg-white/5 text-slate-300 border-line",
    gold: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    red: "bg-red-400/10 text-red-300 border-red-400/30",
    sky: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium border rounded-full ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-surface-2 border border-line rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/60 focus:outline-none transition-colors ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full bg-surface-2 border border-line rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-sky-500/60 focus:outline-none transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full bg-gradient-to-r from-sky-500 to-gold transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function TeamCrest({
  short,
  color,
  size = 40,
  className = "",
}: {
  short: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.32,
        border: "2px solid rgba(255,255,255,0.25)",
      }}
      aria-hidden="true"
    >
      {short}
    </span>
  );
}
