import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import {
  type Currency,
  type Building,
  getBaseCurrency,
  saveBaseCurrency,
} from "../utils/storage";
import { fetchExchangeRates, convertCurrency } from "../utils/exchangeRates";

/* ─── Types ─── */

interface CurrencyContextType {
  baseCurrency: Currency;
  setBaseCurrency: (c: Currency) => void;
  rates: Record<string, number>;
  ratesLoading: boolean;
  /** Format an amount in the given currency (defaults to base) */
  formatAmount: (amount: number, currency?: Currency) => string;
  /** Convert any amount to the base currency */
  convertToBase: (amount: number, fromCurrency: Currency) => number;
  /** Get the effective currency for a building (falls back to base) */
  getBuildingCurrency: (building: Building) => Currency;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CHF: "CHF",
  EUR: "EUR",
  USD: "USD",
  GBP: "GBP",
};

const LOCALE_FOR_CURRENCY: Record<Currency, string> = {
  CHF: "de-CH",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
};

/* ─── Context ─── */

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>(getBaseCurrency);
  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 0.94, USD: 1.08, GBP: 0.82 });
  const [ratesLoading, setRatesLoading] = useState(true);

  // Fetch exchange rates on mount
  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    fetchExchangeRates().then((cache) => {
      if (!cancelled) {
        setRates(cache.rates);
        setRatesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const setBaseCurrency = useCallback((c: Currency) => {
    setBaseCurrencyState(c);
    saveBaseCurrency(c);
  }, []);

  const formatAmount = useCallback(
    (amount: number, currency?: Currency): string => {
      const cur = currency ?? baseCurrency;
      const locale = LOCALE_FOR_CURRENCY[cur] ?? "de-CH";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 0,
      }).format(amount);
    },
    [baseCurrency]
  );

  const convertToBase = useCallback(
    (amount: number, fromCurrency: Currency): number => {
      return convertCurrency(amount, fromCurrency, baseCurrency, rates);
    },
    [baseCurrency, rates]
  );

  const getBuildingCurrency = useCallback(
    (building: Building): Currency => {
      return building.currency ?? baseCurrency;
    },
    [baseCurrency]
  );

  const value = useMemo(
    () => ({
      baseCurrency,
      setBaseCurrency,
      rates,
      ratesLoading,
      formatAmount,
      convertToBase,
      getBuildingCurrency,
    }),
    [baseCurrency, setBaseCurrency, rates, ratesLoading, formatAmount, convertToBase, getBuildingCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
