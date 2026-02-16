import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  User,
} from 'firebase/auth';
// getReactNativePersistence is exported at runtime via Metro's react-native
// condition but is absent from firebase/auth's TypeScript types in SDK 12.
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeFirestore,
  persistentLocalCache,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ---------------------------------------------------------------------------
// Firebase config — values come from environment variables.
// Set these in frontend/.env.local before running:
//   EXPO_PUBLIC_FIREBASE_API_KEY=...
//   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
//   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
//   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
//   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
//   EXPO_PUBLIC_FIREBASE_APP_ID=...
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate initialization in dev hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase Functions instance
const firebaseFunctions = getFunctions(app);

// Auth — explicitly configured with AsyncStorage persistence so auth state
// survives app restarts. Required for React Native (in-memory is the default).
// initializeAuth throws if called twice (e.g. hot-reload) — fall back to getAuth.
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

// Firestore — enable offline persistence with the modular localCache API
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

// ---------------------------------------------------------------------------
// User document helpers
// ---------------------------------------------------------------------------

/** Create the /users/{uid} document on first sign-in. */
export async function createUserDocument(user: User, displayName?: string): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return;

  await setDoc(userRef, {
    displayName: displayName ?? user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? null,
    createdAt: serverTimestamp(),
    tier: 'free',
  });
}

// ---------------------------------------------------------------------------
// Email / Password
// ---------------------------------------------------------------------------

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await sendEmailVerification(user);
  await createUserDocument(user, name);
  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ---------------------------------------------------------------------------
// Google Sign-In
// Uses Firebase credential built from an ID token obtained via expo-auth-session.
// Pass the idToken returned by the Google OAuth flow.
// ---------------------------------------------------------------------------

export async function signInWithGoogleCredential(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  if ((result as any).additionalUserInfo?.isNewUser) {
    await createUserDocument(result.user);
  }
  return result.user;
}

// ---------------------------------------------------------------------------
// Apple Sign-In
// Pass the identityToken returned by expo-apple-authentication.
// The optional fullName is only available on the first Apple sign-in.
// ---------------------------------------------------------------------------

export async function signInWithAppleCredential(
  identityToken: string,
  fullName?: string | null,
): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken });
  const result = await signInWithCredential(auth, credential);

  if ((result as any).additionalUserInfo?.isNewUser) {
    // Apple only returns the full name on first sign-in — store it immediately
    if (fullName) {
      await updateProfile(result.user, { displayName: fullName });
    }
    await createUserDocument(result.user, fullName ?? undefined);
  }

  return result.user;
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}

// ---------------------------------------------------------------------------
// Profile management
// ---------------------------------------------------------------------------

/**
 * Update display name in Firebase Auth profile and Firestore user document.
 */
export async function updateDisplayName(name: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  await updateProfile(currentUser, { displayName: name });
  await updateDoc(doc(db, 'users', currentUser.uid), { displayName: name });
}

/**
 * Send a verification email to the new address. The email in Firebase Auth
 * and Firestore is only updated after the user clicks the verification link.
 * Uses verifyBeforeUpdateEmail (updateEmail is deprecated in SDK v12+).
 * May throw auth/requires-recent-login if the session is too old.
 */
export async function updateUserEmail(newEmail: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  await verifyBeforeUpdateEmail(currentUser, newEmail);
  // NOTE: Do NOT update Firestore here — email only changes after verification.
}

/**
 * Change the current user's password.
 * May throw auth/requires-recent-login if the session is too old.
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  await updatePassword(currentUser, newPassword);
}

/**
 * Re-authenticate the current user with email + password.
 * Call this before sensitive operations (email change, password change, delete).
 */
export async function reauthenticateUser(email: string, password: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(currentUser, credential);
}

/**
 * Resend the email verification message to the current user.
 */
export async function resendEmailVerification(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  await sendEmailVerification(currentUser);
}

/**
 * Delete the current Firebase Auth user.
 * Firestore data deletion is handled by the deleteUserData Cloud Function.
 */
export async function deleteCurrentUser(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  await deleteUser(currentUser);
}

// ---------------------------------------------------------------------------
// Cloud Functions
// ---------------------------------------------------------------------------

/**
 * Call the deleteUserData Cloud Function which recursively deletes all
 * Firestore data under /users/{uid} and then deletes the Auth user.
 *
 * TODO Phase 1B: Deploy the Cloud Function (see functions/src/index.ts)
 * before calling this in production.
 */
export async function callDeleteUserData(): Promise<void> {
  const deleteUserData = httpsCallable(firebaseFunctions, 'deleteUserData');
  await deleteUserData({});
}
