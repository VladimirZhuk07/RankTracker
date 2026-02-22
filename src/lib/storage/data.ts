'use server';

import type { User, UserStatsData } from './definitions';
import { collection, getDocs, doc, getDoc, addDoc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { getCollectionName } from './queries';

async function getFirestoreInstance() {
  const { initializeFirebase } = await import('@/firebase/server');
  const { firestore } = initializeFirebase();
  return firestore;
}

function getUsersCollection(firestore: Awaited<ReturnType<typeof getFirestoreInstance>>) {
  return collection(firestore, getCollectionName());
}

function getUserDoc(firestore: Awaited<ReturnType<typeof getFirestoreInstance>>, id: string) {
  return doc(firestore, getCollectionName(), id);
}

export async function getUsers(): Promise<User[]> {
  const firestore = await getFirestoreInstance();
  const usersCollection = getUsersCollection(firestore);
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function getUserById(id: string): Promise<User | undefined> {
  const firestore = await getFirestoreInstance();
  const docRef = getUserDoc(firestore, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : undefined;
}

export async function userExistsByName(name: string): Promise<boolean> {
    const firestore = await getFirestoreInstance();
    const usersCollection = getUsersCollection(firestore);
    const q = query(usersCollection, where("name", "==", name));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

export async function addUser(name: string, stats: UserStatsData): Promise<User> {
  const firestore = await getFirestoreInstance();
  const newUserDoc = {
    name,
    ...stats,
    avatarUrl: '',
  };
  const usersCollection = getUsersCollection(firestore);
  const docRef = await addDoc(usersCollection, newUserDoc);
  return { id: docRef.id, ...newUserDoc };
}

export async function deleteUserById(id: string): Promise<boolean> {
    const firestore = await getFirestoreInstance();
    const docRef = getUserDoc(firestore, id);
    await deleteDoc(docRef);
    return true;
}

export async function updateUserStats(identifier: string, newStats: UserStatsData, byId: boolean = false, accumulate: boolean = false): Promise<User | null> {
    const firestore = await getFirestoreInstance();
    const usersCollection = getUsersCollection(firestore);
    
    let userDoc;
    if (byId) {
        userDoc = getUserDoc(firestore, identifier);
        const userSnap = await getDoc(userDoc);
        if (!userSnap.exists()) return null;
    } else {
        const q = query(usersCollection, where("name", "==", identifier));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return addUser(identifier, newStats);
        }
        userDoc = snapshot.docs[0].ref;
    }
    
    const userSnap = await getDoc(userDoc);
    const existingData = userSnap.data() as User;
    
    let dataToWrite: UserStatsData;
    if (accumulate) {
      dataToWrite = {
        totalMaps: (existingData.totalMaps || 0) + newStats.totalMaps,
        totalKills: (existingData.totalKills || 0) + newStats.totalKills,
        totalDeaths: (existingData.totalDeaths || 0) + newStats.totalDeaths,
        totalDamage: (existingData.totalDamage || 0) + newStats.totalDamage,
      };
    } else {
      dataToWrite = newStats;
    }

    await updateDoc(userDoc, dataToWrite);

    const updatedDoc = await getDoc(userDoc);
    return { id: updatedDoc.id, ...updatedDoc.data() } as User;
}

export async function updateUserAvatar(id: string, avatarUrl: string): Promise<User | null> {
    const firestore = await getFirestoreInstance();
    const docRef = getUserDoc(firestore, id);
    const dataToWrite = { avatarUrl };
    await updateDoc(docRef, dataToWrite);
    const updatedDoc = await getDoc(docRef);
    return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as User : null;
}
