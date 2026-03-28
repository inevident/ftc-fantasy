import { NextResponse } from "next/server";

import { getSetupChecklist, getSyncRouteSecretEnv } from "@/lib/env";
import { runScoringSync } from "@/lib/ftc/sync";
import { isAuthorizedSyncRequest } from "@/lib/sync-route-auth";

function parseDryRun(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("dryRun") === "true";
}

export async function GET() {
  return NextResponse.json({
    authorization: "Bearer <SYNC_ROUTE_SECRET>",
    endpoint: "/api/sync/scoring",
    methods: ["POST"],
    notes: getSetupChecklist(),
  });
}

export async function POST(request: Request) {
  const syncSecret = getSyncRouteSecretEnv();
  if (!syncSecret) {
    return NextResponse.json(
      {
        error: "SYNC_ROUTE_SECRET is required before the scoring sync can run.",
      },
      { status: 500 },
    );
  }

  if (!isAuthorizedSyncRequest(request.headers.get("authorization"), syncSecret.secret)) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

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
