import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebaseService';
import { useAuth } from '@/contexts/AuthContext';
import {
  CurrencyCode,
  CurrencyMeta,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
} from '@/constants/Currencies';

const ASYNC_STORAGE_KEY = 'cc.currency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurrencyContextType {
  currency: CurrencyCode;
  meta: CurrencyMeta;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  /** Full locale-formatted amount, e.g. "$1,234.56", "¥1,235", "1.234,56 €" */
  formatAmount: (value: number) => string;
  /** Compact stat format, e.g. "$1.2k", "¥1.2k", "€1.2k" */
  formatAmountCompact: (value: number) => string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, userDoc } = useAuth();

  // Resolve starting currency: userDoc > AsyncStorage fallback handled in effect
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  // On mount / auth change: read from userDoc first, then AsyncStorage
  useEffect(() => {
    const load = async () => {
      // 1. Prefer Firestore value if it came through userDoc
      const docCurrency = (userDoc as any)?.currency as CurrencyCode | undefined;
      if (docCurrency && SUPPORTED_CURRENCIES[docCurrency]) {
        setCurrencyState(docCurrency);
        return;
      }
      // 2. Fall back to locally cached preference
      try {
        const stored = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (stored && SUPPORTED_CURRENCIES[stored as CurrencyCode]) {
          setCurrencyState(stored as CurrencyCode);
        }
      } catch {
        // ignore storage errors — stay on default
      }
    };
    load();
  }, [userDoc]);

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyState(code);
    // Persist locally immediately (works offline)
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, code);
    } catch {
      // ignore
    }
    // Sync to Firestore if signed in
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { currency: code });
      } catch {
        // Offline or permission failure — AsyncStorage copy is the source of truth
      }
    }
  }, [user]);

  const meta = SUPPORTED_CURRENCIES[currency];

  const formatAmount = useCallback((value: number): string => {
    try {
      return new Intl.NumberFormat(meta.locale, {
        style: 'currency',
        currency: meta.code,
        minimumFractionDigits: meta.decimals,
        maximumFractionDigits: meta.decimals,
      }).format(value);
    } catch {
      // Fallback for environments with limited Intl support
      return `${meta.symbol}${value.toFixed(meta.decimals)}`;
    }
  }, [meta]);

  const formatAmountCompact = useCallback((value: number): string => {
    const absValue = Math.abs(value);
    let formatted: string;
    if (absValue >= 1_000_000) {
      formatted = `${meta.symbol}${parseFloat((absValue / 1_000_000).toFixed(1))}M`;
    } else if (absValue >= 1_000) {
      formatted = `${meta.symbol}${parseFloat((absValue / 1_000).toFixed(1))}k`;
    } else {
      formatted = `${meta.symbol}${absValue.toFixed(meta.decimals)}`;
    }
    return formatted;
  }, [meta]);

  return (
    <CurrencyContext.Provider value={{ currency, meta, setCurrency, formatAmount, formatAmountCompact }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
