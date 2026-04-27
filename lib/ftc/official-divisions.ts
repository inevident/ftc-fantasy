import type { FtcEvent } from "@/lib/types";

export function getOfficialDivisionCode(event: Pick<FtcEvent, "name">, fallbackIndex: number) {
  const divisionName = event.name?.match(/-\s*([^-]+?)\s+Division$/i)?.[1];

  if (divisionName) {
    return divisionName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return `division-${String.fromCharCode(97 + fallbackIndex)}`;
}

export function getOfficialDivisionName(event: Pick<FtcEvent, "name">, fallbackIndex: number) {
  const divisionName = event.name?.match(/-\s*([^-]+?\s+Division)$/i)?.[1];
  return divisionName?.trim() ?? event.name ?? `Official Division ${fallbackIndex + 1}`;
}
