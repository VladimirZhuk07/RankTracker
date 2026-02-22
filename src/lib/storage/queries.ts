import { collection, query, type Firestore } from 'firebase/firestore';

export function getCollectionName() {
  return `users_${new Date().getFullYear()}`;
}

export function getUsersQuery(firestore: Firestore) {
  return query(collection(firestore, getCollectionName()));
}
