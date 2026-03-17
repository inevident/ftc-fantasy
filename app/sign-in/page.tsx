import Link from "next/link";

import { EmailSignInForm } from "@/components/email-sign-in-form";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="page-shell">
      <div className="grid min-h-[82vh] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard className="flex flex-col justify-between">
          <div className="space-y-6">
            <StatusPill tone="accent">Email magic-link auth</StatusPill>
            <div className="space-y-4">
              <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.05em] text-white">
                Enter the Worlds fantasy control room.
              </h1>
              <p className="max-w-lg text-lg leading-8 text-white/68">
                Sign in with email, create a private invite-code league, and build
                a 12-team roster before official divisions drop.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="eyebrow">League flow</p>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  One active entry per league, with shared live leaderboard scoring
                  from official FTC results.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="eyebrow">Roster rule</p>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  Two teams per division across all six provisional groups, plus a
                  champion pick for tiebreaks.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 text-sm text-white/56">
            <Link className="underline decoration-white/20 underline-offset-4" href="/">
              Back to the landing page
            </Link>
          </div>
        </SectionCard>

        <SectionCard className="flex items-center">
          <div className="w-full space-y-5">
            <div>
              <p className="eyebrow">Sign in</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Send the login link</h2>
            </div>
            <EmailSignInForm next={next} />
            {error ? (
              <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                {error}
              </div>
            ) : null}
            <p className="text-sm leading-7 text-white/52">
              Supabase Auth handles the session. The callback route exchanges the
              code, refreshes the profile row, and returns you to the draft flow.
            </p>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}

