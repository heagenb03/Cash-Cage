import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NetworkContextType {
  /** True when the device has an active internet connection. Defaults to true
   *  until the first NetInfo event resolves, to avoid spurious offline banners
   *  on app startup. */
  isOnline: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Default to true so the banner never flashes on startup before NetInfo resolves
  const [isOnline, setIsOnline] = useState(true);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // Prefer isInternetReachable when available; fall back to isConnected
      const reachable =
        state.isInternetReachable !== null && state.isInternetReachable !== undefined
          ? state.isInternetReachable
          : (state.isConnected ?? true);

      resolvedRef.current = true;
      // React bails out of re-renders when the state value is unchanged (boolean),
      // so unconditional setIsOnline is safe and avoids a stale-closure bug.
      setIsOnline(reachable);
    });

    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
