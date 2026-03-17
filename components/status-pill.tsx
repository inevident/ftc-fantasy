import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "accent" | "muted" | "success" | "warning";
};

export function StatusPill({ children, tone = "muted" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em]",
        tone === "accent" && "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
        tone === "muted" && "border-white/12 bg-white/6 text-white/70",
        tone === "success" && "border-emerald-400/35 bg-emerald-400/12 text-emerald-100",
        tone === "warning" && "border-amber-400/35 bg-amber-400/12 text-amber-100",
      )}
    >
      {children}
    </span>
  );
}

