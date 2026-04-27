export function normalizeTournamentLevel(level?: string | null) {
  const normalized = (level ?? "").trim().toLowerCase();

  if (["qual", "qualification", "qualifications", "quals"].includes(normalized)) {
    return "qual";
  }

  if (normalized.includes("qual")) {
    return "qual";
  }

  if (normalized.includes("playoff") || normalized.includes("semi") || normalized.includes("final")) {
    return "playoff";
  }

  return normalized;
}

export function isQualificationLevel(level?: string | null) {
  return normalizeTournamentLevel(level) === "qual";
}
