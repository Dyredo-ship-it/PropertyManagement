import {
  type Currency,
  type ExchangeRateCache,
  getExchangeRateCache,
  saveExchangeRateCache,
} from "./storage";

const FALLBACK_RATES: Record<string, number> = {
  CHF: 1,
  EUR: 0.94,
  USD: 1.08,
  GBP: 0.82,
};

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch exchange rates from frankfurter.app (free, no key, CORS-friendly).
 * Caches in localStorage for 24h. Falls back to hardcoded rates on failure.
 */
export async function fetchExchangeRates(): Promise<ExchangeRateCache> {
  const cached = getExchangeRateCache();
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_DURATION_MS) {
    return cached;
  }

  try {
    const resp = await fetch(
      "https://api.frankfurter.app/latest?from=CHF&to=EUR,USD,GBP"
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const cache: ExchangeRateCache = {
      base: "CHF",
      rates: { CHF: 1, ...data.rates },
      fetchedAt: new Date().toISOString(),
    };
    saveExchangeRateCache(cache);
    return cache;
  } catch {
    // Return cached even if stale, or fallback
    return (
      cached ?? {
        base: "CHF",
        rates: FALLBACK_RATES,
        fetchedAt: new Date().toISOString(),
      }
    );
  }
}

/**
 * Convert an amount between currencies.
 * All rates are relative to CHF (1 CHF = X target).
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<string, number>
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // Convert: amount in `from` → CHF → `to`
  const inCHF = amount / fromRate;
  return inCHF * toRate;
}
