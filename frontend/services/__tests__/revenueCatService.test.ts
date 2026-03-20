// Set env var BEFORE module import so isConfigured() returns true.
// The service captures API keys at module load time as top-level constants.
process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_test_key';

import { logoutPurchases } from '../revenueCatService';
import Purchases from 'react-native-purchases';

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock react-native-purchases
jest.mock('react-native-purchases', () => {
  const mock = {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    logIn: jest.fn().mockResolvedValue(undefined),
    logOut: jest.fn().mockResolvedValue(undefined),
    isAnonymous: jest.fn().mockResolvedValue(false),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  };
  return {
    __esModule: true,
    default: mock,
    LOG_LEVEL: { DEBUG: 'DEBUG' },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// logoutPurchases
// ---------------------------------------------------------------------------

describe('logoutPurchases', () => {
  it('does NOT call Purchases.logOut() when user is anonymous', async () => {
    (Purchases.isAnonymous as jest.Mock).mockResolvedValue(true);

    await logoutPurchases();

    expect(Purchases.isAnonymous).toHaveBeenCalled();
    expect(Purchases.logOut).not.toHaveBeenCalled();
  });

  it('calls Purchases.logOut() when user is NOT anonymous', async () => {
    (Purchases.isAnonymous as jest.Mock).mockResolvedValue(false);

    await logoutPurchases();

    expect(Purchases.isAnonymous).toHaveBeenCalled();
    expect(Purchases.logOut).toHaveBeenCalled();
  });

  it('suppresses errors from Purchases.isAnonymous()', async () => {
    (Purchases.isAnonymous as jest.Mock).mockRejectedValue(
      new Error('SDK not initialized')
    );

    // Should not throw
    await expect(logoutPurchases()).resolves.toBeUndefined();
    expect(Purchases.logOut).not.toHaveBeenCalled();
  });

  it('suppresses errors from Purchases.logOut()', async () => {
    (Purchases.isAnonymous as jest.Mock).mockResolvedValue(false);
    (Purchases.logOut as jest.Mock).mockRejectedValue(
      new Error('logOut failed')
    );

    // Should not throw
    await expect(logoutPurchases()).resolves.toBeUndefined();
  });
});
