import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "accent" | "muted" | "success" | "warning";
};

export function StatusPill({ children, tone = "muted" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]",
        tone === "accent" && "border-violet-400/40 bg-violet-500/12 text-violet-200",
        tone === "muted" && "border-white/12 bg-white/6 text-white/70",
        tone === "success" && "border-emerald-400/35 bg-emerald-500/12 text-emerald-200",
        tone === "warning" && "border-rose-400/35 bg-rose-500/12 text-rose-200",
      )}
    >
      {children}
    </span>
  );
}
