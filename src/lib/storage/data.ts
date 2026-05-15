'use server';

import type { MatchRecord, SessionRecord, User } from './definitions';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, query, where, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getCollectionName, getMatchesCollectionName, getSessionsCollectionName } from './queries';

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

function getMatchesCollection(firestore: Awaited<ReturnType<typeof getFirestoreInstance>>) {
  return collection(firestore, getMatchesCollectionName());
}

function getMatchDoc(firestore: Awaited<ReturnType<typeof getFirestoreInstance>>, id: string) {
  return doc(firestore, getMatchesCollectionName(), id);
}

function getSessionsCollection(firestore: Awaited<ReturnType<typeof getFirestoreInstance>>) {
  return collection(firestore, getSessionsCollectionName());
}

function getSessionDoc(firestore: Awaited<ReturnType<typeof getFirestoreInstance>>, id: string) {
  return doc(firestore, getSessionsCollectionName(), id);
}

export async function getUsers(): Promise<User[]> {
  const firestore = await getFirestoreInstance();
  const usersCollection = getUsersCollection(firestore);
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
}

export async function getUserById(id: string): Promise<User | undefined> {
  const firestore = await getFirestoreInstance();
  const docRef = getUserDoc(firestore, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : undefined;
}

export async function getUserByName(name: string): Promise<User | undefined> {
  const firestore = await getFirestoreInstance();
  const usersCollection = getUsersCollection(firestore);
  const q = query(usersCollection, where('name', '==', name));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return undefined;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as User;
}

export async function userExistsByName(name: string): Promise<boolean> {
  const firestore = await getFirestoreInstance();
  const usersCollection = getUsersCollection(firestore);
  const q = query(usersCollection, where('name', '==', name));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function addUser(name: string): Promise<User> {
  const firestore = await getFirestoreInstance();
  const newUserDoc = { name, avatarUrl: '' };
  const usersCollection = getUsersCollection(firestore);
  const docRef = await addDoc(usersCollection, newUserDoc);
  return { id: docRef.id, ...newUserDoc };
}

export async function deleteUserById(id: string): Promise<boolean> {
  const firestore = await getFirestoreInstance();
  const docRef = getUserDoc(firestore, id);
  await deleteDoc(docRef);

  const matchesCollection = getMatchesCollection(firestore);
  const q = query(matchesCollection, where('userId', '==', id));
  const snapshot = await getDocs(q);

  // Collect affected sessionIds before deleting the match docs
  const affectedSessionIds = new Set(
    snapshot.docs.map(d => d.data().sessionId as string).filter(Boolean)
  );

  await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));

  // For each affected session, delete the session doc if no matches remain
  for (const sessionId of affectedSessionIds) {
    const remaining = await getDocs(query(matchesCollection, where('sessionId', '==', sessionId)));
    if (remaining.empty) {
      await deleteDoc(getSessionDoc(firestore, sessionId));
    }
  }

  return true;
}

export async function updateUserAvatar(id: string, avatarUrl: string): Promise<User | null> {
  const firestore = await getFirestoreInstance();
  const docRef = getUserDoc(firestore, id);
  await updateDoc(docRef, { avatarUrl });
  const updatedDoc = await getDoc(docRef);
  return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as User : null;
}

export async function updateUserName(id: string, name: string): Promise<User | null> {
  const firestore = await getFirestoreInstance();
  const docRef = getUserDoc(firestore, id);
  await updateDoc(docRef, { name });

  const matchesCollection = getMatchesCollection(firestore);
  const q = query(matchesCollection, where('userId', '==', id));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map(d => updateDoc(d.ref, { name })));

  const updatedDoc = await getDoc(docRef);
  return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as User : null;
}

export async function updateUserManualAchievements(
  id: string,
  manualAchievementIds: string[]
): Promise<User | null> {
  const firestore = await getFirestoreInstance();
  const docRef = getUserDoc(firestore, id);
  await updateDoc(docRef, { manualAchievementIds });
  const updatedDoc = await getDoc(docRef);
  return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as User : null;
}

// Session functions

export async function addSession(
  sessionId: string,
  mapIndex: number,
  date?: string
): Promise<SessionRecord> {
  const firestore = await getFirestoreInstance();
  const sessionDocRef = getSessionDoc(firestore, sessionId);
  const resolvedDate = date ? Timestamp.fromDate(new Date(date)) : serverTimestamp();
  // serverTimestamp() sentinels must not be reused — create separate calls
  const sessionData = date
    ? { mapIndex, date: resolvedDate, createdAt: serverTimestamp() }
    : { mapIndex, date: serverTimestamp(), createdAt: serverTimestamp() };
  await setDoc(sessionDocRef, sessionData);
  return { id: sessionId, ...sessionData } as unknown as SessionRecord;
}

export async function updateSessionFields(
  sessionId: string,
  fields: { mapIndex?: number; date?: string }
): Promise<void> {
  const firestore = await getFirestoreInstance();
  const sessionDocRef = getSessionDoc(firestore, sessionId);
  const update: Record<string, unknown> = {};
  if (fields.mapIndex !== undefined) update.mapIndex = fields.mapIndex;
  if (fields.date !== undefined) update.date = Timestamp.fromDate(new Date(fields.date));
  if (Object.keys(update).length > 0) {
    await updateDoc(sessionDocRef, update);
  }
  if (fields.date !== undefined) {
    const newDate = Timestamp.fromDate(new Date(fields.date));
    const matchesCollection = getMatchesCollection(firestore);
    const q = query(matchesCollection, where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => updateDoc(d.ref, { date: newDate })));
  }
}

// Match record functions

export async function addMatchRecord(
  userId: string,
  name: string,
  stats: { kills: number; deaths: number; damage: number; won: boolean; date?: string; sessionId: string }
): Promise<MatchRecord> {
  const firestore = await getFirestoreInstance();
  const matchesCollection = getMatchesCollection(firestore);
  const date = stats.date
    ? Timestamp.fromDate(new Date(stats.date))
    : serverTimestamp();
  const { date: _date, ...restStats } = stats;
  const newMatch = { userId, name, ...restStats, date, createdAt: serverTimestamp() };
  const docRef = await addDoc(matchesCollection, newMatch);
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...docSnap.data() } as MatchRecord;
}

export async function updateMatchRecord(
  matchId: string,
  data: Partial<Pick<MatchRecord, 'kills' | 'deaths' | 'damage' | 'won'>>
): Promise<void> {
  const firestore = await getFirestoreInstance();
  const docRef = getMatchDoc(firestore, matchId);
  await updateDoc(docRef, data);
}

export async function deleteMatchRecord(matchId: string): Promise<void> {
  const firestore = await getFirestoreInstance();
  const docRef = getMatchDoc(firestore, matchId);

  // Read the sessionId before deleting
  const docSnap = await getDoc(docRef);
  const sessionId = docSnap.exists() ? (docSnap.data().sessionId as string | undefined) : undefined;

  await deleteDoc(docRef);

  // If this was the last match in the session, remove the session doc too
  if (sessionId) {
    const matchesCollection = getMatchesCollection(firestore);
    const remaining = await getDocs(query(matchesCollection, where('sessionId', '==', sessionId)));
    if (remaining.empty) {
      await deleteDoc(getSessionDoc(firestore, sessionId));
    }
  }
}

export async function deleteSessionWithMatches(sessionId: string): Promise<void> {
  const firestore = await getFirestoreInstance();
  const matchesCollection = getMatchesCollection(firestore);
  const q = query(matchesCollection, where('sessionId', '==', sessionId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(getSessionDoc(firestore, sessionId));
}

export async function getMatchesByUserId(userId: string): Promise<MatchRecord[]> {
  const firestore = await getFirestoreInstance();
  const matchesCollection = getMatchesCollection(firestore);
  const q = query(matchesCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));
}
