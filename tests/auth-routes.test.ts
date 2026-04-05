import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, ensureProfileForUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  ensureProfileForUser: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/profile", () => ({
  ensureProfileForUser,
}));

import { GET as callbackRoute } from "@/app/auth/callback/route";
import { GET as oauthRoute } from "@/app/auth/oauth/route";

describe("auth oauth route", () => {
  beforeEach(() => {
    createClient.mockReset();
    ensureProfileForUser.mockReset();
  });

  it("rejects unsupported providers", async () => {
    const response = await oauthRoute(
      new Request("https://ftc-fantasy.test/auth/oauth?provider=github&next=%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://ftc-fantasy.test/sign-in?next=%2Fdashboard&error=Unsupported+OAuth+provider.",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("starts the Google OAuth flow with the forwarded origin", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth?mock=1" },
      error: null,
    });

    createClient.mockResolvedValue({
      auth: {
        signInWithOAuth,
      },
    });

    const response = await oauthRoute(
      new Request("http://127.0.0.1:3000/auth/oauth?provider=google&next=%2Fentries%2Fabc", {
        headers: {
          "x-forwarded-host": "fantasy.example.com",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?mock=1",
    );
    expect(signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: "https://fantasy.example.com/auth/callback?next=%2Fentries%2Fabc",
        skipBrowserRedirect: true,
      },
      provider: "google",
    });
  });
});

describe("auth callback route", () => {
  beforeEach(() => {
    createClient.mockReset();
    ensureProfileForUser.mockReset();
  });

  it("redirects provider errors back to sign-in", async () => {
    const response = await callbackRoute(
      new Request(
        "https://ftc-fantasy.test/auth/callback?error_description=Access+denied&next=%2Fdashboard",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://ftc-fantasy.test/sign-in?next=%2Fdashboard&error=Access+denied",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("exchanges the code, ensures the profile, and redirects to the forwarded origin", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "driver@example.com",
          user_metadata: { display_name: "Driver" },
        },
      },
    });

    createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
        getUser,
      },
    });

    const response = await callbackRoute(
      new Request("http://127.0.0.1:3000/auth/callback?code=test-code&next=%2Fdashboard", {
        headers: {
          "x-forwarded-host": "fantasy.example.com",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(ensureProfileForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          exchangeCodeForSession,
          getUser,
        }),
      }),
      expect.objectContaining({
        email: "driver@example.com",
        id: "user-123",
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fantasy.example.com/dashboard");
  });

  it("returns to sign-in when profile setup fails", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "driver@example.com",
          user_metadata: {},
        },
      },
    });

    createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
        getUser,
      },
    });
    ensureProfileForUser.mockRejectedValue(new Error("Profile setup failed."));

    const response = await callbackRoute(
      new Request("https://ftc-fantasy.test/auth/callback?code=test-code&next=%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://ftc-fantasy.test/sign-in?next=%2Fdashboard&error=Profile+setup+failed.",
    );
  });
});
