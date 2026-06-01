/**
 * Tests for app/api/rates/fetch/route.ts
 * Covers Story 4 acceptance criteria (endpoint auth, response shape, DB write).
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Stub admin client and fetchRates before importing the route
vi.mock("../lib/supabase-admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("../lib/rates", () => ({
  fetchRates: vi.fn(),
}));

const MOCK_SECRET = "test-secret-abc";

function makeRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/rates/fetch", {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("Story 4 — POST /api/rates/fetch", () => {
  test("AC-4: returns 401 when Authorization header is missing", async () => {
    vi.stubEnv("RATES_API_SECRET", MOCK_SECRET);

    const { POST } = await import("../app/api/rates/fetch/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  test("AC-4: returns 403 when bearer token is wrong", async () => {
    vi.stubEnv("RATES_API_SECRET", MOCK_SECRET);

    const { POST } = await import("../app/api/rates/fetch/route");
    const res = await POST(makeRequest("Bearer wrong-token"));
    expect(res.status).toBe(403);
  });

  test("AC-4: returns 500 when RATES_API_SECRET env var is not set", async () => {
    vi.stubEnv("RATES_API_SECRET", "");

    const { POST } = await import("../app/api/rates/fetch/route");
    const res = await POST(makeRequest(`Bearer ${MOCK_SECRET}`));
    expect(res.status).toBe(500);
  });

  test("AC-1 & AC-3: valid token triggers fetchRates and returns success payload", async () => {
    vi.stubEnv("RATES_API_SECRET", MOCK_SECRET);

    const { fetchRates } = await import("../lib/rates");
    const { createAdminClient } = await import("../lib/supabase-admin");

    (fetchRates as ReturnType<typeof vi.fn>).mockResolvedValue({
      usdToGbp: { spot_rate: 0.7701, base_currency: "USD", target_currency: "GBP", timestamp: new Date().toISOString() },
      gbpToUsd: { spot_rate: 1.2986, base_currency: "GBP", target_currency: "USD", timestamp: new Date().toISOString() },
      fetchedAt: new Date().toISOString(),
    });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: "org-1" }, { id: "org-2" }], error: null }),
        upsert: upsertMock,
      }),
    });

    const { POST } = await import("../app/api/rates/fetch/route");
    const res = await POST(makeRequest(`Bearer ${MOCK_SECRET}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body).toHaveProperty("gbp_to_usd_rate");
    expect(body).toHaveProperty("usd_to_gbp_rate");
    expect(body).toHaveProperty("orgs_updated");
    expect(body).toHaveProperty("timestamp");
  });

  test("AC-2: stores gbp_to_usd (inverted rate, £1 = $X) not the raw usd→gbp rate", async () => {
    vi.stubEnv("RATES_API_SECRET", MOCK_SECRET);

    const { fetchRates } = await import("../lib/rates");
    const { createAdminClient } = await import("../lib/supabase-admin");

    (fetchRates as ReturnType<typeof vi.fn>).mockResolvedValue({
      usdToGbp: { spot_rate: 0.7701, base_currency: "USD", target_currency: "GBP", timestamp: "" },
      gbpToUsd: { spot_rate: 1.2986, base_currency: "GBP", target_currency: "USD", timestamp: "" },
      fetchedAt: "",
    });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: "org-1" }], error: null }),
      upsert: upsertMock,
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const { POST } = await import("../app/api/rates/fetch/route");
    await POST(makeRequest(`Bearer ${MOCK_SECRET}`));

    const upsertCall = upsertMock.mock.calls[0][0];
    // The upserted row should contain gbp_to_usd = 1.2986 (GBP→USD rate, £1 = $1.2986)
    // NOT 0.7701 (the USD→GBP rate)
    expect(upsertCall[0].gbp_to_usd).toBe(1.2986);
  });

  test("AC-3: returns orgs_updated count matching number of organisations", async () => {
    vi.stubEnv("RATES_API_SECRET", MOCK_SECRET);

    const { fetchRates } = await import("../lib/rates");
    const { createAdminClient } = await import("../lib/supabase-admin");

    (fetchRates as ReturnType<typeof vi.fn>).mockResolvedValue({
      usdToGbp: { spot_rate: 0.77, base_currency: "USD", target_currency: "GBP", timestamp: "" },
      gbpToUsd: { spot_rate: 1.2987, base_currency: "GBP", target_currency: "USD", timestamp: "" },
      fetchedAt: "",
    });

    const orgs = [{ id: "org-a" }, { id: "org-b" }, { id: "org-c" }];
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: orgs, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { POST } = await import("../app/api/rates/fetch/route");
    const res = await POST(makeRequest(`Bearer ${MOCK_SECRET}`));
    const body = await res.json();

    expect(body.orgs_updated).toBe(3);
  });

  test("AC-5: route file does not import createClient (browser client) — server only", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      new URL("../app/api/rates/fetch/route.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(content).not.toContain("from \"@/lib/supabase\"");
    expect(content).not.toContain("from '../lib/supabase'");
    expect(content).toContain("createAdminClient");
  });

  test("AC-1: returns 502 when both rate providers fail", async () => {
    vi.stubEnv("RATES_API_SECRET", MOCK_SECRET);

    const { fetchRates } = await import("../lib/rates");
    (fetchRates as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Both rate providers failed — no rate available")
    );

    const { POST } = await import("../app/api/rates/fetch/route");
    const res = await POST(makeRequest(`Bearer ${MOCK_SECRET}`));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Both rate providers failed");
  });
});
