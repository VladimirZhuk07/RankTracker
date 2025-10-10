'use server';

import type { User, UserStatsData } from './definitions';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, query, where, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';

async function getFirestoreInstance() {
  const { initializeFirebase } = await import('@/firebase/server');
  const { firestore } = initializeFirebase();
  return firestore;
}

export async function seedInitialData() {
  const firestore = await getFirestoreInstance();
  const usersCollection = collection(firestore, 'users');
  const snapshot = await getDocs(usersCollection);

  if (snapshot.empty) {
    console.log('No users found in Firestore. Seeding initial data...');
    const initialUsers = [
        { id: '1', name: 'PlayerOne', totalMaps: 10, totalKills: 150, totalDeaths: 120, totalDamage: 18000, avatarUrl: '' },
        { id: '2', name: 'S1mple', totalMaps: 25, totalKills: 550, totalDeaths: 400, totalDamage: 52000, avatarUrl: '' },
        { id: '3', name: 'ZywOo', totalMaps: 22, totalKills: 510, totalDeaths: 380, totalDamage: 48000, avatarUrl: '' },
        { id: '4', name: 'dev1ce', totalMaps: 30, totalKills: 600, totalDeaths: 450, totalDamage: 55000, avatarUrl: '' },
        { id: '5', name: 'NiKo', totalMaps: 28, totalKills: 580, totalDeaths: 480, totalDamage: 56000, avatarUrl: '' },
    ];
    const batch = writeBatch(firestore);
    initialUsers.forEach(user => {
      const docRef = doc(usersCollection); // Let Firestore generate the ID
      batch.set(docRef, {
          name: user.name,
          totalMaps: user.totalMaps,
          totalKills: user.totalKills,
          totalDeaths: user.totalDeaths,
          totalDamage: user.totalDamage,
          avatarUrl: user.avatarUrl
      });
    });
    await batch.commit();
    console.log('Initial data seeded successfully.');
  }
}


export async function getUsers(): Promise<User[]> {
  const firestore = await getFirestoreInstance();
  const usersCollection = collection(firestore, 'users');
  const snapshot = await getDocs(usersCollection);
  if (snapshot.empty) {
    await seedInitialData();
    const seededSnapshot = await getDocs(usersCollection);
    return seededSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function getUserById(id: string): Promise<User | undefined> {
  const firestore = await getFirestoreInstance();
  const docRef = doc(firestore, 'users', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : undefined;
}

export async function userExistsByName(name: string): Promise<boolean> {
    const firestore = await getFirestoreInstance();
    const usersCollection = collection(firestore, 'users');
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
  const usersCollection = collection(firestore, 'users');
  const docRef = await addDoc(usersCollection, newUserDoc);
  return { id: docRef.id, ...newUserDoc };
}

export async function deleteUserById(id: string): Promise<boolean> {
    const firestore = await getFirestoreInstance();
    const docRef = doc(firestore, 'users', id);
    await deleteDoc(docRef);
    return true;
}

export async function updateUserStats(identifier: string, newStats: UserStatsData, byId: boolean = false, accumulate: boolean = false): Promise<User | null> {
    const firestore = await getFirestoreInstance();
    const usersCollection = collection(firestore, 'users');
    
    let userDoc;
    if (byId) {
        userDoc = doc(firestore, 'users', identifier);
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
    const docRef = doc(firestore, 'users', id);
    const dataToWrite = { avatarUrl };
    await updateDoc(docRef, dataToWrite);
    const updatedDoc = await getDoc(docRef);
    return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as User : null;
}
