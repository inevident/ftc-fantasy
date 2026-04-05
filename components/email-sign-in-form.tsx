"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState = { status: "idle" as const };

export function EmailSignInForm({ next = "/dashboard" }: { next?: string }) {
  const [state, action] = useActionState(requestMagicLinkAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <input name="next" type="hidden" value={next} />
      <label className="block space-y-2">
        <span className="text-sm text-white/72">Email address</span>
        <input
          className="w-full rounded-2xl border border-white/14 bg-white/6 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-white/35 focus:border-cyan-300/50"
          name="email"
          placeholder="you@teammail.com"
          required
          type="email"
        />
      </label>
      <SubmitButton className="w-full" idleLabel="Send email link" pendingLabel="Sending email link" />
      {state.message ? (
        <p className={state.status === "error" ? "text-sm text-amber-200" : "text-sm text-emerald-200"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
