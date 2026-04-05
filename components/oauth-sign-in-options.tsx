import Link from "next/link";

import { oauthProviders } from "@/lib/auth/oauth";

function ProviderBadge() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white text-xs font-bold text-slate-950">
      G
    </span>
  );
}

export function OAuthSignInOptions({ next = "/dashboard" }: { next?: string }) {
  const encodedNext = encodeURIComponent(next);

  return (
    <div className="space-y-3">
      {oauthProviders.map((provider) => (
        <Link
          className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.04]"
          href={`/auth/oauth?provider=${provider.id}&next=${encodedNext}`}
          key={provider.id}
        >
          <span className="flex items-center gap-3">
            <ProviderBadge />
            <span className="text-sm font-medium">{provider.label}</span>
          </span>
          <span className="text-xs uppercase tracking-[0.18em] text-white/42">
            Google
          </span>
        </Link>
      ))}
    </div>
  );
}
