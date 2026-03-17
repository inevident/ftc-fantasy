import { NextResponse } from "next/server";

import { getSetupChecklist } from "@/lib/env";
import { runRosterSync } from "@/lib/ftc/sync";

function parseDryRun(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("dryRun") === "true";
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/sync/roster",
    methods: ["POST"],
    notes: getSetupChecklist(),
  });
}

export async function POST(request: Request) {
  try {
    const result = await runRosterSync({ dryRun: parseDryRun(request) });

    return NextResponse.json({
      divisionStatus: result.metadata.divisionStatus,
      itemCount: result.itemCount,
      persisted: result.persisted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Roster sync failed.",
      },
      { status: 500 },
    );
  }
}

