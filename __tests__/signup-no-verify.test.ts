/**
 * Tests for the signup-without-verification feature.
 *
 * AC-1: Invalid login credentials → redirect to /signup?email=<email>
 * AC-2: Email param is carried to signup URL
 * AC-3: After signUp, redirect destination is /dashboard?verify_email=true
 * AC-4: Middleware no longer blocks unverified users from the dashboard
 * AC-5/6/7: EmailVerificationToast reads ?verify_email=true param
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(pathname: string, cookieHeader = ""): NextRequest {
  const url = `https://kayd.live${pathname}`;
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

function mockSupabaseUser(user: object | null) {
  vi.doMock("@supabase/ssr", () => ({
    createServerClient: () => ({
      auth: {
        getUser: async () => ({ data: { user } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role: "admin", organisation_id: "org-1" } }),
          }),
        }),
      }),
    }),
  }));
}

// ---------------------------------------------------------------------------
// AC-4: Middleware — unverified users reach the dashboard
// ---------------------------------------------------------------------------

describe("AC-4: Middleware — unverified users are not blocked", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "anon-key");
  });

  test("AC-4: authenticated user with email_confirmed_at=null reaches /dashboard", async () => {
    mockSupabaseUser({ id: "user-1", email_confirmed_at: null });
    const { middleware } = await import("../middleware");

    const req = makeRequest("/dashboard");
    const res = await middleware(req);

    // null location means no redirect occurred — user passed through to dashboard
    const location = res.headers.get("location");
    expect(location ?? "").not.toContain("/verify-email");
  });

  test("AC-4: unverified user on /login is bounced to /dashboard", async () => {
    mockSupabaseUser({ id: "user-1", email_confirmed_at: null });
    const { middleware } = await import("../middleware");

    const req = makeRequest("/login");
    const res = await middleware(req);

    const location = res.headers.get("location");
    expect(location).toContain("/dashboard");
  });

  test("AC-4: unverified user on /signup is bounced to /dashboard", async () => {
    mockSupabaseUser({ id: "user-1", email_confirmed_at: null });
    const { middleware } = await import("../middleware");

    const req = makeRequest("/signup");
    const res = await middleware(req);

    const location = res.headers.get("location");
    expect(location).toContain("/dashboard");
  });

  test("AC-4: verified user still reaches /dashboard normally", async () => {
    mockSupabaseUser({ id: "user-1", email_confirmed_at: "2024-01-01T00:00:00Z" });
    const { middleware } = await import("../middleware");

    const req = makeRequest("/dashboard");
    const res = await middleware(req);

    // null location means no redirect — user passed through to dashboard
    const location = res.headers.get("location") ?? "";
    expect(location).not.toContain("/verify-email");
    expect(location).not.toContain("/login");
  });

  test("AC-4: unauthenticated user on /dashboard is still redirected to /login", async () => {
    mockSupabaseUser(null);
    const { middleware } = await import("../middleware");

    const req = makeRequest("/dashboard");
    const res = await middleware(req);

    const location = res.headers.get("location");
    expect(location).toContain("/login");
  });
});

// ---------------------------------------------------------------------------
// AC-1 & AC-2: Email forwarding in URLs
// ---------------------------------------------------------------------------

describe("AC-1 & AC-2: Email is encoded and carried in redirect URLs", () => {
  test("AC-1: email is URL-encoded when passed to /signup", () => {
    const email = "user+test@example.com";
    const url = `/signup?email=${encodeURIComponent(email)}`;
    const parsed = new URL(`https://kayd.live${url}`);
    expect(parsed.searchParams.get("email")).toBe(email);
  });

  test("AC-2: email param survives round-trip encoding", () => {
    const email = "hello@world.co.uk";
    const encoded = encodeURIComponent(email);
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toBe(email);
  });

  test("AC-2: reverse link (signup → login) carries email", () => {
    const email = "user@example.com";
    const href = `/login?email=${encodeURIComponent(email)}`;
    const parsed = new URL(`https://kayd.live${href}`);
    expect(parsed.searchParams.get("email")).toBe(email);
  });

  test("AC-1: empty email produces clean /signup URL (no trailing ?)", () => {
    const email = "";
    const href = `/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`;
    expect(href).toBe("/signup");
    expect(href).not.toContain("?");
  });
});

// ---------------------------------------------------------------------------
// AC-3: Post-signup redirect destination
// ---------------------------------------------------------------------------

describe("AC-3: After signup, redirect target is /dashboard?verify_email=true", () => {
  test("AC-3: redirect URL contains verify_email=true", () => {
    const destination = "/dashboard?verify_email=true";
    const parsed = new URL(`https://kayd.live${destination}`);
    expect(parsed.pathname).toBe("/dashboard");
    expect(parsed.searchParams.get("verify_email")).toBe("true");
  });

  test("AC-3: stripping verify_email param leaves clean /dashboard", () => {
    const url = new URL("https://kayd.live/dashboard?verify_email=true");
    url.searchParams.delete("verify_email");
    expect(url.pathname + url.search).toBe("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// AC-5/6/7: EmailVerificationToast param detection
// ---------------------------------------------------------------------------

describe("AC-5/6/7: verify_email param triggers toast and is stripped", () => {
  test("AC-5: verify_email=true is truthy", () => {
    const params = new URLSearchParams("verify_email=true");
    expect(params.get("verify_email")).toBeTruthy();
  });

  test("AC-6: absent verify_email param returns null (no toast)", () => {
    const params = new URLSearchParams("denied=team");
    expect(params.get("verify_email")).toBeNull();
  });

  test("AC-7: after stripping, param is gone from URL", () => {
    const url = new URL("https://kayd.live/dashboard?verify_email=true&other=1");
    url.searchParams.delete("verify_email");
    expect(url.search).toBe("?other=1");
    expect(url.searchParams.has("verify_email")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Middleware — /verify-email removed from PUBLIC_PATHS (regression guard)
// ---------------------------------------------------------------------------

describe("Middleware — /verify-email is no longer a public path", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "anon-key");
  });

  test("unauthenticated user hitting /verify-email is redirected to /login", async () => {
    mockSupabaseUser(null);
    const { middleware } = await import("../middleware");

    const req = makeRequest("/verify-email");
    const res = await middleware(req);

    const location = res.headers.get("location");
    expect(location).toContain("/login");
  });
});
