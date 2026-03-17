import "server-only";

import { seasonConfig } from "@/lib/constants";
import { getFtcApiEnv } from "@/lib/env";
import type { FtcEvent, FtcMatch, FtcRanking, FtcTeam } from "@/lib/types";

const FTC_API_ROOT = "https://ftc-api.firstinspires.org/v2.0";

type FtcEventResponse = {
  events?: FtcEvent[] | null;
};

type FtcMatchResponse = {
  matches?: FtcMatch[] | null;
};

type FtcRankingResponse = {
  rankings?: FtcRanking[] | null;
};

type FtcTeamResponse = {
  pageCurrent: number;
  pageTotal: number;
  teams?: FtcTeam[] | null;
};

function createBasicAuthHeader() {
  const env = getFtcApiEnv();

  if (!env) {
    throw new Error("FTC API credentials are missing.");
  }

  return `Basic ${Buffer.from(`${env.username}:${env.token}`).toString("base64")}`;
}

async function fetchFtcJson<T>(
  path: string,
  searchParams?: Record<string, boolean | number | string | undefined>,
) {
  const url = new URL(`${FTC_API_ROOT}${path}`);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: createBasicAuthHeader(),
      Accept: "application/json",
    },
    next: {
      revalidate: 0,
    },
  });

  if (!response.ok) {
    throw new Error(`FTC API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchChampionshipTeams(eventCode: string = seasonConfig.eventCode) {
  const teams: FtcTeam[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await fetchFtcJson<FtcTeamResponse>(`/${seasonConfig.apiSeason}/teams`, {
      eventCode,
      excludeNonCompeting: true,
      page,
    });

    teams.push(...(payload.teams ?? []));
    totalPages = payload.pageTotal || page;
    page += 1;
  }

  return teams;
}

export async function fetchSeasonEvents() {
  const payload = await fetchFtcJson<FtcEventResponse>(`/${seasonConfig.apiSeason}/events`);
  return payload.events ?? [];
}

export async function fetchEventRankings(eventCode: string) {
  const payload = await fetchFtcJson<FtcRankingResponse>(
    `/${seasonConfig.apiSeason}/rankings/${eventCode}`,
  );

  return payload.rankings ?? [];
}

export async function fetchEventMatches(eventCode: string) {
  const payload = await fetchFtcJson<FtcMatchResponse>(
    `/${seasonConfig.apiSeason}/matches/${eventCode}`,
  );

  return payload.matches ?? [];
}
