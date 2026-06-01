/**
 * Tests for lib/rates.ts
 * Covers Stories 1, 2, 3 acceptance criteria.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Reset module cache between tests so the in-memory cache is cleared.
beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function mockFetchOnce(data: unknown, status = 200) {
  return vi.spyOn(global, "fetch").mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response);
}

function mockFetchWith(responses: Array<{ data: unknown; status?: number }>) {
  const spy = vi.spyOn(global, "fetch");
  for (const r of responses) {
    spy.mockResolvedValueOnce({
      ok: (r.status ?? 200) >= 200 && (r.status ?? 200) < 300,
      status: r.status ?? 200,
      json: async () => r.data,
    } as Response);
  }
  return spy;
}

// ---------------------------------------------------------------------------
// Story 1 — Core API integration
// ---------------------------------------------------------------------------

describe("Story 1 — fetchRates() core integration", () => {
  test("AC-1: returns both USD→GBP and GBP→USD directions", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    mockFetchOnce({ conversion_rates: { GBP: 0.7701 } });

    const { fetchRates } = await import("../lib/rates");
    const payload = await fetchRates();

    expect(payload.usdToGbp.base_currency).toBe("USD");
    expect(payload.usdToGbp.target_currency).toBe("GBP");
    expect(payload.gbpToUsd.base_currency).toBe("GBP");
    expect(payload.gbpToUsd.target_currency).toBe("USD");
  });

  test("AC-2: spot_rate is a valid 4-decimal-place float", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    mockFetchOnce({ conversion_rates: { GBP: 0.7701234 } });

    const { fetchRates } = await import("../lib/rates");
    const payload = await fetchRates();

    expect(payload.usdToGbp.spot_rate).toBe(0.7701);
    expect(payload.gbpToUsd.spot_rate).toBe(parseFloat((1 / 0.7701234).toFixed(4)));
    expect(String(payload.usdToGbp.spot_rate).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });

  test("AC-2: GBP→USD rate is mathematically inverted (1/usdToGbp)", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    const rawRate = 0.7701;
    mockFetchOnce({ conversion_rates: { GBP: rawRate } });

    const { fetchRates } = await import("../lib/rates");
    const payload = await fetchRates();

    const expected = parseFloat((1 / rawRate).toFixed(4));
    expect(payload.gbpToUsd.spot_rate).toBe(expected);
  });

  test("AC-3: payload includes timestamp, base_currency, target_currency, spot_rate", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    mockFetchOnce({ conversion_rates: { GBP: 0.7701 } });

    const { fetchRates } = await import("../lib/rates");
    const payload = await fetchRates();

    for (const result of [payload.usdToGbp, payload.gbpToUsd]) {
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("base_currency");
      expect(result).toHaveProperty("target_currency");
      expect(result).toHaveProperty("spot_rate");
      expect(typeof result.spot_rate).toBe("number");
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    }
  });

  test("AC-4: throws a structured error when both providers fail", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    vi.stubEnv("OPEN_EXCHANGE_RATES_KEY", "fallback-key");
    mockFetchWith([
      { data: { error: "quota exceeded" }, status: 429 },
      { data: { error: "service unavailable" }, status: 503 },
    ]);

    const { fetchRates } = await import("../lib/rates");
    await expect(fetchRates()).rejects.toThrow("Both rate providers failed");
  });
});

// ---------------------------------------------------------------------------
// Story 2 — Resilience
// ---------------------------------------------------------------------------

describe("Story 2 — Fallback and resilience", () => {
  test("AC-1: falls back to secondary provider when primary returns non-200", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    vi.stubEnv("OPEN_EXCHANGE_RATES_KEY", "fallback-key");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockFetchWith([
      { data: { error: "rate limited" }, status: 429 },
      { data: { rates: { GBP: 0.7750 } }, status: 200 },
    ]);

    const { fetchRates } = await import("../lib/rates");
    const payload = await fetchRates();

    expect(payload.usdToGbp.spot_rate).toBe(0.775);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[WARN] Primary rate provider failed:"),
      expect.any(String)
    );
  });

  test("AC-1: falls back when primary throws (network error / timeout)", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    vi.stubEnv("OPEN_EXCHANGE_RATES_KEY", "fallback-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const spy = vi.spyOn(global, "fetch");
    spy.mockRejectedValueOnce(new Error("Network error"));
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rates: { GBP: 0.7750 } }),
    } as Response);

    const { fetchRates } = await import("../lib/rates");
    const payload = await fetchRates();
    expect(payload.usdToGbp.spot_rate).toBe(0.775);
  });

  test("AC-2: rejects with structured error if both providers fail", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    vi.stubEnv("OPEN_EXCHANGE_RATES_KEY", "fallback-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetchWith([
      { data: {}, status: 500 },
      { data: {}, status: 500 },
    ]);

    const { fetchRates } = await import("../lib/rates");
    await expect(fetchRates()).rejects.toThrow();
  });

  test("AC-3: logs diagnostic warning naming which provider failed", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    vi.stubEnv("OPEN_EXCHANGE_RATES_KEY", "fallback-key");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockFetchWith([
      { data: {}, status: 500 },
      { data: { rates: { GBP: 0.77 } }, status: 200 },
    ]);

    const { fetchRates } = await import("../lib/rates");
    await fetchRates();

    expect(warnSpy).toHaveBeenCalledWith(
      "[WARN] Primary rate provider failed:",
      expect.any(String)
    );
  });

  test("AC-4: does not return a rate when payload has no valid GBP field", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    vi.stubEnv("OPEN_EXCHANGE_RATES_KEY", "fallback-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetchWith([
      { data: { conversion_rates: { GBP: null } }, status: 200 },
      { data: { rates: { GBP: "not-a-number" } }, status: 200 },
    ]);

    const { fetchRates } = await import("../lib/rates");
    await expect(fetchRates()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Story 3 — In-memory cache
// ---------------------------------------------------------------------------

describe("Story 3 — In-memory cache (TTL)", () => {
  test("AC-2: within TTL, returns cached payload without a second fetch", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    const fetchSpy = mockFetchOnce({ conversion_rates: { GBP: 0.7701 } });

    const { fetchRates } = await import("../lib/rates");
    await fetchRates();
    await fetchRates(); // second call — should hit cache

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("AC-1 & AC-2: first call fetches from API, subsequent uses cache", async () => {
    vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-key");
    const fetchSpy = mockFetchOnce({ conversion_rates: { GBP: 0.7701 } });

    const { fetchRates } = await import("../lib/rates");
    const first = await fetchRates();
    const second = await fetchRates();

    expect(first).toEqual(second);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
