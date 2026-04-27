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
  const crypto = globalThis.crypto;

  if (!crypto?.getRandomValues) {
    throw new Error("Secure random number generation is unavailable.");
  }

  const getRandomIndex = () => {
    const values = new Uint32Array(1);
    const maxUnbiasedValue = Math.floor(0xffffffff / alphabet.length) * alphabet.length;

    do {
      crypto.getRandomValues(values);
    } while (values[0] >= maxUnbiasedValue);

    return values[0] % alphabet.length;
  };

  return Array.from({ length }, () => alphabet[getRandomIndex()]).join("");
}

export function normalizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }

  try {
    const parsed = new URL(value, "https://ftc-fantasy.local");

    if (parsed.origin !== "https://ftc-fantasy.local") {
      return "/dashboard";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function normalizeInviteCode(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized.slice(0, 16);
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
