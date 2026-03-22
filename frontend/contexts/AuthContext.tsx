import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseSignOut } from '@/services/firebaseService';
import {
  initializePurchases,
  loginPurchases,
  logoutPurchases,
  getIsPro,
} from '@/services/revenueCatService';

// Initialize RevenueCat once when this module loads
initializePurchases();

// ---------------------------------------------------------------------------
// DEV OVERRIDE — remove this block once RevenueCat is fully integrated
// Set to true to bypass subscription checks during testing.
// ---------------------------------------------------------------------------
const DEV_FORCE_PRO = false;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = 'free' | 'pro';

interface UserDocument {
  displayName: string;
  email: string;
  photoURL: string | null;
  tier: Tier;
  totalGamesPlayed?: number;
  totalMoneyTracked?: number;
  totalPlayersHosted?: number;
  proSince?: Date | null;
}

interface AuthContextType {
  /** Firebase Auth user — null if signed out */
  user: User | null;
  /** Firestore user document (tier, displayName, etc.) */
  userDoc: UserDocument | null;
  /** True until onAuthStateChanged fires for the first time — show splash, not auth screens */
  isLoading: boolean;
  /** Whether the user has a Pro subscription (Firestore tier OR RevenueCat entitlement) */
  isPro: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch the Firestore user document (e.g., after tier changes) */
  refreshUserDoc: () => Promise<void>;
  /** Re-fetch RevenueCat entitlements (e.g., after a purchase or restore) */
  refreshEntitlements: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rcIsPro, setRcIsPro] = useState(false);

  const fetchUserDoc = async (uid: string, attempt = 0): Promise<void> => {
    try {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserDoc({
          ...data,
          proSince: data.proSince?.toDate?.() ?? data.proSince ?? null,
        } as UserDocument);
      } else {
        setUserDoc(null);
      }
    } catch (err: any) {
      // New users can briefly get permission-denied while Firebase propagates the
      // auth token to Firestore. Retry up to 4 times with exponential backoff.
      if (err?.code === 'permission-denied' && attempt < 4) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        return fetchUserDoc(uid, attempt + 1);
      }
      console.error('AuthContext: failed to fetch user doc', err);
      setUserDoc(null);
    }
  };

  const fetchRcEntitlements = async (): Promise<void> => {
    try {
      const proStatus = await getIsPro();
      setRcIsPro(proStatus);
    } catch (err) {
      console.error('AuthContext: failed to fetch RC entitlements', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch Firestore doc and RC entitlements in parallel
        await Promise.all([
          fetchUserDoc(firebaseUser.uid),
          (async () => {
            await loginPurchases(firebaseUser.uid);
            await fetchRcEntitlements();
          })(),
        ]);
      } else {
        setUserDoc(null);
        setRcIsPro(false);
        await logoutPurchases();
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSignOut = async (): Promise<void> => {
    await logoutPurchases();
    await firebaseSignOut();
    // State is cleared by the onAuthStateChanged listener above
  };

  const refreshUserDoc = async (): Promise<void> => {
    if (user) {
      await fetchUserDoc(user.uid);
    }
  };

  const refreshEntitlements = async (): Promise<void> => {
    await fetchRcEntitlements();
    // Also refresh the Firestore doc in case the webhook has already updated the tier
    if (user) {
      await fetchUserDoc(user.uid);
    }
  };

  // isPro is true if either Firestore tier is "pro" OR RevenueCat reports an active entitlement.
  // This handles the race between the webhook updating Firestore and the client knowing the truth.
  const isPro = DEV_FORCE_PRO || userDoc?.tier === 'pro' || rcIsPro;

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        isLoading,
        isPro,
        signOut: handleSignOut,
        refreshUserDoc,
        refreshEntitlements,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
