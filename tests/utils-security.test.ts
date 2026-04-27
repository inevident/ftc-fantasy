import { describe, expect, it } from "vitest";

import { buildInviteCode, normalizeInviteCode, normalizeNextPath } from "@/lib/utils";

describe("security utility validation", () => {
  it("rejects external or malformed next paths", () => {
    expect(normalizeNextPath("https://evil.test/dashboard")).toBe("/dashboard");
    expect(normalizeNextPath("//evil.test/dashboard")).toBe("/dashboard");
    expect(normalizeNextPath("/\\evil")).toBe("/dashboard");
    expect(normalizeNextPath("/dashboard?tab=1")).toBe("/dashboard?tab=1");
  });

  it("normalizes invite codes to safe path characters", () => {
    expect(normalizeInviteCode(" ab12-cd34 ")).toBe("AB12CD34");
    expect(normalizeInviteCode("../AB12<script>")).toBe("AB12SCRIPT");
  });

  it("generates invite codes with the safe alphabet", () => {
    expect(buildInviteCode()).toMatch(/^[A-Z2-9]{8}$/);
  });
});
