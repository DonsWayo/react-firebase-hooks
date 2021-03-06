import firebase from 'firebase/app';
import { useEffect, useMemo } from 'react';
import { snapshotToData } from './helpers';
import {
  CollectionHook,
  CollectionDataHook,
  Data,
  DataOptions,
  OnceOptions,
  OnceDataOptions,
  Options,
} from './types';
import { useIsEqualRef, useLoadingValue } from '../util';

export const useCollection = <T = firebase.firestore.DocumentData>(
  query?: firebase.firestore.Query<T> | null,
  options?: Options
): CollectionHook<T> => {
  return useCollectionInternal(true, query, options);
};

export const useCollectionOnce = <T = firebase.firestore.DocumentData>(
  query?: firebase.firestore.Query<T> | null,
  options?: OnceOptions
): CollectionHook<T> => {
  return useCollectionInternal(false, query, options);
};

export const useCollectionData = <
  T = firebase.firestore.DocumentData,
  IDField extends string = '',
  RefField extends string = ''
>(
  query?: firebase.firestore.Query<T> | null,
  options?: DataOptions
): CollectionDataHook<T, IDField, RefField> => {
  return useCollectionDataInternal(true, query, options);
};

export const useCollectionDataOnce = <
  T = firebase.firestore.DocumentData,
  IDField extends string = '',
  RefField extends string = ''
>(
  query?: firebase.firestore.Query<T> | null,
  options?: OnceDataOptions
): CollectionDataHook<T, IDField, RefField> => {
  return useCollectionDataInternal(false, query, options);
};

const useCollectionInternal = <T = firebase.firestore.DocumentData>(
  listen: boolean,
  query?: firebase.firestore.Query<T> | null,
  options?: Options & OnceOptions
) => {
  const { error, loading, reset, setError, setValue, value } = useLoadingValue<
    firebase.firestore.QuerySnapshot,
    firebase.FirebaseError
  >();
  const ref = useIsEqualRef(query, reset);

  useEffect(() => {
    if (!ref.current) {
      setValue(undefined);
      return;
    }
    if (listen) {
      const listener =
        options && options.snapshotListenOptions
          ? ref.current.onSnapshot(
              options.snapshotListenOptions,
              setValue,
              setError
            )
          : ref.current.onSnapshot(setValue, setError);

      return () => {
        listener();
      };
    } else {
      ref.current
        .get(options ? options.getOptions : undefined)
        .then(setValue)
        .catch(setError);
    }
  }, [ref.current]);

  const resArray: CollectionHook<T> = [
    value as firebase.firestore.QuerySnapshot<T>,
    loading,
    error,
  ];
  return useMemo(() => resArray, resArray);
};

const useCollectionDataInternal = <
  T = firebase.firestore.DocumentData,
  IDField extends string = '',
  RefField extends string = ''
>(
  listen: boolean,
  query?: firebase.firestore.Query<T> | null,
  options?: DataOptions & OnceDataOptions
): CollectionDataHook<T, IDField, RefField> => {
  const idField = options ? options.idField : undefined;
  const refField = options ? options.refField : undefined;
  const snapshotOptions = options ? options.snapshotOptions : undefined;
  const [snapshots, loading, error] = useCollectionInternal<T>(
    listen,
    query,
    options
  );
  const values = useMemo(
    () =>
      (snapshots
        ? snapshots.docs.map((doc) =>
            snapshotToData(doc, snapshotOptions, idField, refField)
          )
        : undefined) as Data<T, IDField, RefField>[],
    [snapshots, idField, refField]
  );

  const resArray: CollectionDataHook<T, IDField, RefField> = [
    values,
    loading,
    error,
  ];
  return useMemo(() => resArray, resArray);
};
