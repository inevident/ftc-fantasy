import clsx from "clsx";

import type { QualifiedTeam } from "@/lib/types";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function formatTeamLabel(team: Pick<QualifiedTeam, "nameShort" | "teamNumber">) {
  return `${team.teamNumber} ${team.nameShort ?? "Worlds qualifier"}`;
}

export function formatLocation(team: Pick<QualifiedTeam, "city" | "country" | "stateProv">) {
  return [team.city, team.stateProv, team.country].filter(Boolean).join(", ") || "Location pending";
}

export function buildInviteCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from({ length }, () => {
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }).join("");
}

export function normalizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

export function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function slugToTitle(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}

