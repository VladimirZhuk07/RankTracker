'use client';

import { useState, useEffect, useMemo } from 'react';
import type {
  Query,
  DocumentData,
  QuerySnapshot,
  FirestoreError,
  CollectionReference,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

export interface UseCollectionOptions {
  listen?: boolean;
}

const defaultOptions: UseCollectionOptions = {
  listen: true,
};

export function useCollection(
  targetRefOrQuery: CollectionReference | Query | null,
  options: UseCollectionOptions = defaultOptions
) {
  const memoizedTargetRefOrQuery = useMemo(
    () => targetRefOrQuery,
    [targetRefOrQuery]
  );
  const [data, setData] = useState<DocumentData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setLoading(false);
      return;
    }

    const handleSnapshot = (snapshot: QuerySnapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(docs);
      setLoading(false);
      setError(null);
    };

    const handleError = (err: FirestoreError) => {
      console.error(err);
      setError(err);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      handleSnapshot,
      handleError
    );

    return () => {
      unsubscribe();
    };
  }, [memoizedTargetRefOrQuery, options.listen]);

  return { data, loading, error };
}
