import { NextResponse } from "next/server";

import { getSetupChecklist } from "@/lib/env";
import { runScoringSync } from "@/lib/ftc/sync";

function parseDryRun(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("dryRun") === "true";
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/sync/scoring",
    methods: ["POST"],
    notes: getSetupChecklist(),
  });
}

export async function POST(request: Request) {
  try {
    const result = await runScoringSync({ dryRun: parseDryRun(request) });

    return NextResponse.json({
      itemCount: result.itemCount,
      metadata: result.metadata,
      persisted: result.persisted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scoring sync failed.",
      },
      { status: 500 },
    );
  }
}
