'use client';

import { initializeFirebase } from './index';
import { FirebaseProvider, type FirebaseProviderProps } from './provider';

/**
 * Provides the Firebase app, auth, and firestore instances to the client.
 * This should be used at the root of the client-side application.
 */
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  const props: FirebaseProviderProps = {
    firebaseApp,
    auth,
    firestore,
    children,
  };

  return <FirebaseProvider {...props}>{children}</FirebaseProvider>;
}
