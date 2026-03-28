import { describe, expect, it } from "vitest";

import { isAuthorizedSyncRequest, parseBearerToken } from "@/lib/sync-route-auth";

describe("parseBearerToken", () => {
  it("parses bearer headers and rejects invalid formats", () => {
    expect(parseBearerToken("Bearer secret-token")).toBe("secret-token");
    expect(parseBearerToken("bearer secret-token")).toBe("secret-token");
    expect(parseBearerToken("Token secret-token")).toBeNull();
    expect(parseBearerToken(null)).toBeNull();
  });
});

describe("isAuthorizedSyncRequest", () => {
  it("matches the expected sync secret", () => {
    expect(isAuthorizedSyncRequest("Bearer sync-secret", "sync-secret")).toBe(true);
    expect(isAuthorizedSyncRequest("Bearer wrong-secret", "sync-secret")).toBe(false);
    expect(isAuthorizedSyncRequest(undefined, "sync-secret")).toBe(false);
  });
});
