"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  idleLabel: string;
  pendingLabel: string;
};

export function SubmitButton({
  className,
  disabled = false,
  idleLabel,
  pendingLabel,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-white/20 bg-[linear-gradient(135deg,#ffe06b,#ff8e3c)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60",
        className,
      )}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
