import { collection, orderBy, query, type Firestore } from 'firebase/firestore';

export function getCollectionName() {
  return 'users';
}

export function getMatchesCollectionName() {
  return `matches_${new Date().getFullYear()}`;
}

export function getSessionsCollectionName() {
  return 'sessions';
}

export function getUsersQuery(firestore: Firestore) {
  return query(collection(firestore, getCollectionName()));
}

export function getMatchesQuery(firestore: Firestore) {
  return query(collection(firestore, getMatchesCollectionName()), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
}

export function getSessionsQuery(firestore: Firestore) {
  return query(collection(firestore, getSessionsCollectionName()), orderBy('createdAt', 'desc'));
}
