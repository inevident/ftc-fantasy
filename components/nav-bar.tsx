"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Trophy,
  User,
} from "lucide-react";

import { signOutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

type NavBarProps = {
  leagueCode?: string | null;
  leagueName?: string | null;
  pageTitle?: string | null;
  userEmail?: string | null;
  userName?: string | null;
};

function Crumb({
  children,
  href,
  isLast = false,
}: {
  children: React.ReactNode;
  href?: string;
  isLast?: boolean;
}) {
  const content = href ? (
    <Link
      className="transition-colors hover:text-white"
      href={href}
    >
      {children}
    </Link>
  ) : (
    <span className="text-white font-medium">{children}</span>
  );

  return (
    <>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/24" />
      <span className={cn("truncate", isLast ? "text-white" : "text-white/50")}>
        {content}
      </span>
    </>
  );
}

export function NavBar({
  leagueCode,
  leagueName,
  pageTitle,
  userEmail,
  userName,
}: NavBarProps) {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  const isLeague = pathname.startsWith("/leagues/");
  const isEntry = pathname.startsWith("/entries/");

  const displayName = userName ?? userEmail?.split("@")[0] ?? null;
  const initial = (displayName ?? "U")[0].toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(10,10,28,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Logo + breadcrumbs */}
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            className="group flex shrink-0 items-center gap-2 transition-colors hover:text-white"
            href="/dashboard"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_12px_rgba(124,58,237,0.3)]">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="hidden font-semibold text-white/80 group-hover:text-white sm:inline">
              FTC Fantasy
            </span>
          </Link>

          {/* Breadcrumbs */}
          <div className="flex min-w-0 items-center gap-1.5">
            {isDashboard && <Crumb isLast>Dashboard</Crumb>}

            {isLeague && (
              <>
                <Crumb href="/dashboard">Dashboard</Crumb>
                <Crumb isLast>{leagueName ?? "League"}</Crumb>
              </>
            )}

            {isEntry && (
              <>
                <Crumb href="/dashboard">Dashboard</Crumb>
                {leagueCode && leagueName ? (
                  <Crumb href={`/leagues/${leagueCode}`}>{leagueName}</Crumb>
                ) : null}
                <Crumb isLast>{pageTitle ?? "Entry"}</Crumb>
              </>
            )}
          </div>
        </div>

        {/* Right: User + sign-out */}
        <div className="flex shrink-0 items-center gap-2">
          {displayName ? (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/60 to-cyan-400/60 text-xs font-bold text-white">
                {initial}
              </div>
              <span className="max-w-[140px] truncate text-sm text-white/60">
                {displayName}
              </span>
            </div>
          ) : null}

          <form action={signOutAction}>
            <button
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:bg-white/8 hover:text-white/80"
              type="submit"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile back link for deep pages */}
      {(isLeague || isEntry) && (
        <div className="border-t border-white/6 px-4 py-2 sm:hidden">
          <Link
            className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/80"
            href={
              isEntry && leagueCode
                ? `/leagues/${leagueCode}`
                : "/dashboard"
            }
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isEntry && leagueName
              ? `Back to ${leagueName}`
              : "Back to dashboard"}
          </Link>
        </div>
      )}
    </nav>
  );
}
