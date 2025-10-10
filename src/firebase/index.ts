import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseClientProvider } from './client-provider';
import { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, getFirebase, getFirebaseApp, getAuth as getFirebaseAuth, getFirestore as getFirebaseFirestore } from './provider';
import { useCollection } from './firestore/use-collection';

function initializeFirebase() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { app, auth, firestore };
}

// These hooks can be used in client components
export {
  FirebaseClientProvider,
  FirebaseProvider,
  useFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  initializeFirebase,
  getFirebase,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  useCollection
};

// These types can be used for type-checking
export type { FirebaseApp, Auth, Firestore };
