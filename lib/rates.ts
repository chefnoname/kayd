// Configurable TTL — set to a lower value (e.g. 60_000) when testing locally.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface RateResult {
  timestamp: string;
  base_currency: string;
  target_currency: string;
  spot_rate: number;
}

export interface RatesPayload {
  usdToGbp: RateResult;
  gbpToUsd: RateResult;
  fetchedAt: string;
}

// Module-level cache. In serverless environments each function instance
// maintains its own cache, so this primarily guards against duplicate calls
// within a single invocation burst rather than across days.
type CacheEntry = { payload: RatesPayload; fetchedAt: number };
let cache: CacheEntry | null = null;

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildPayload(usdToGbpRate: number, now: string): RatesPayload {
  const usdToGbp = parseFloat(usdToGbpRate.toFixed(4));
  const gbpToUsd = parseFloat((1 / usdToGbpRate).toFixed(4));
  return {
    usdToGbp: {
      timestamp: now,
      base_currency: "USD",
      target_currency: "GBP",
      spot_rate: usdToGbp,
    },
    gbpToUsd: {
      timestamp: now,
      base_currency: "GBP",
      target_currency: "USD",
      spot_rate: gbpToUsd,
    },
    fetchedAt: now,
  };
}

async function fetchFromPrimary(): Promise<number> {
  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (!key) throw new Error("EXCHANGE_RATE_API_KEY not set");

  const res = await fetchWithTimeout(
    `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
  );
  if (!res.ok) throw new Error(`Primary responded ${res.status}`);

  const data = await res.json();
  const rate = data?.conversion_rates?.GBP;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Primary: invalid GBP rate in payload");
  }
  return rate as number;
}

async function fetchFromFallback(): Promise<number> {
  const key = process.env.OPEN_EXCHANGE_RATES_KEY;
  if (!key) throw new Error("OPEN_EXCHANGE_RATES_KEY not set");

  const res = await fetchWithTimeout(
    `https://openexchangerates.org/api/latest.json?app_id=${key}&base=USD`
  );
  if (!res.ok) throw new Error(`Fallback responded ${res.status}`);

  const data = await res.json();
  const rate = data?.rates?.GBP;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Fallback: invalid GBP rate in payload");
  }
  return rate as number;
}

export async function fetchRates(): Promise<RatesPayload> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.payload;
  }

  const now = new Date().toISOString();
  let usdToGbpRate: number;

  try {
    usdToGbpRate = await fetchFromPrimary();
  } catch (primaryErr) {
    console.warn("[WARN] Primary rate provider failed:", (primaryErr as Error).message);
    try {
      usdToGbpRate = await fetchFromFallback();
    } catch (fallbackErr) {
      console.error("[ERR] Fallback rate provider also failed:", (fallbackErr as Error).message);
      throw new Error("Both rate providers failed — no rate available");
    }
  }

  const payload = buildPayload(usdToGbpRate, now);
  cache = { payload, fetchedAt: Date.now() };
  return payload;
}
