'use client';

import React, { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export interface FirebaseProviderProps {
  children: React.ReactNode;
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const FirebaseContext = createContext<
  | {
      firebaseApp: FirebaseApp;
      auth: Auth;
      firestore: Firestore;
    }
  | undefined
>(undefined);

export function FirebaseProvider({
  children,
  firebaseApp,
  auth,
firestore,
}: FirebaseProviderProps) {
  return (
    <FirebaseContext.Provider value={{ firebaseApp, auth, firestore }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().firebaseApp;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().firestore;
}

// These are for use in server components
let serverFirebaseApp: FirebaseApp | null = null;
let serverAuth: Auth | null = null;
let serverFirestore: Firestore | null = null;

export function getFirebase() {
  if (!serverFirebaseApp || !serverAuth || !serverFirestore) {
    throw new Error('Firebase has not been initialized on the server.');
  }
  return { firebaseApp: serverFirebaseApp, auth: serverAuth, firestore: serverFirestore };
}

export function getFirebaseApp() {
    return getFirebase().firebaseApp;
}
export function getAuth() {
    return getFirebase().auth;
}
export function getFirestore() {
    return getFirebase().firestore;
}
