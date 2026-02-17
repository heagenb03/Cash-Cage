import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  PurchasesOfferings,
  CustomerInfo,
} from 'react-native-purchases';

// ---------------------------------------------------------------------------
// RevenueCat configuration
// Set these in frontend/.env.local:
//   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
//   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
// ---------------------------------------------------------------------------

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '';

// Entitlement identifier as created in the RevenueCat dashboard
export const PRO_ENTITLEMENT_ID = 'pro';

// Product identifiers (must match App Store Connect / Google Play Console)
export const PRODUCT_IDS = {
  monthly: 'cashcage_pro_monthly',
  annual: 'cashcage_pro_annual',
  lifetime: 'cashcage_pro_lifetime',
} as const;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the RevenueCat SDK. Call once on app start before any other RC
 * calls. Safe to call even if the API key is not yet configured (no-op in that
 * case so development without RC credentials does not crash).
 */
export function initializePurchases(): void {
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;

  if (!apiKey) {
    if (__DEV__) {
      console.warn('[RevenueCat] API key not configured — purchases are disabled.');
    }
    return;
  }

  try {
    Purchases.configure({ apiKey });
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
  } catch (err) {
    console.error('[RevenueCat] Failed to configure SDK:', err);
  }
}

/**
 * Link a Firebase UID to RevenueCat. Call after sign-in.
 * RevenueCat uses this as the App User ID so purchase history is tied to
 * the Firebase account, not the device.
 */
export async function loginPurchases(uid: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await Purchases.logIn(uid);
  } catch (err) {
    console.error('[RevenueCat] logIn failed:', err);
  }
}

/**
 * Disconnect the current user from RevenueCat. Call on sign-out.
 * Note: this does NOT cancel any active subscription.
 */
export async function logoutPurchases(): Promise<void> {
  if (!isConfigured()) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    // Suppress — logOut can throw if already anonymous
  }
}

// ---------------------------------------------------------------------------
// Entitlement checks
// ---------------------------------------------------------------------------

/**
 * Returns true if the current user has an active "pro" entitlement.
 * Returns false if RevenueCat is not configured (graceful degradation).
 */
export async function getIsPro(): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
  } catch (err) {
    console.error('[RevenueCat] getCustomerInfo failed:', err);
    return false;
  }
}

/**
 * Returns the full CustomerInfo object, or null on error / if not configured.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error('[RevenueCat] getCustomerInfo failed:', err);
    return null;
  }
}

/**
 * Returns the subscription management URL for the current platform.
 * Opens the App Store or Play Store subscription management page.
 */
export async function getCustomerManagementURL(): Promise<string> {
  if (isConfigured()) {
    try {
      const info = await Purchases.getCustomerInfo();
      if (info.managementURL) {
        return info.managementURL;
      }
    } catch {
      // Fall through to platform default
    }
  }
  // Fallback: platform-specific subscription management URL
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}

// ---------------------------------------------------------------------------
// Paywall / Offerings
// ---------------------------------------------------------------------------

/**
 * Fetch the current RevenueCat offerings. Returns null if not configured
 * or on error.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isConfigured()) return null;
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.error('[RevenueCat] getOfferings failed:', err);
    return null;
  }
}

/**
 * Trigger the purchase flow for a specific package.
 * Returns the updated CustomerInfo on success, or null on user cancellation.
 * Throws on unrecoverable errors.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (!isConfigured()) {
    throw new Error('RevenueCat is not configured. Please try again later.');
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err: any) {
    // User cancelled — not an error
    if (err?.userCancelled === true) return null;
    throw err;
  }
}

/**
 * Restore previous purchases (e.g., reinstall, new device).
 * Returns the updated CustomerInfo, or null on error.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isConfigured()) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.error('[RevenueCat] restorePurchases failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isConfigured(): boolean {
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  return !!apiKey;
}
