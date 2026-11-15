import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from '../state/queryClient';

export interface UseQueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  refetch: () => Promise<T | undefined>;
}

export function useQuery<T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {},
): UseQueryResult<T> {
  const { enabled = true, staleTime, initialData } = options;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const initialEntry = queryClient.getEntry<T>(key);
  const [, setTick] = useState(0);

  const refetch = useCallback(
    async (force: boolean = true) => {
      if (!enabled) return undefined;
      try {
        const result = await queryClient.fetchQuery(key, () => fetcherRef.current(), {
          force,
          staleTime,
        });
        optionsRef.current.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        optionsRef.current.onError?.(normalized);
        return undefined;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(key), enabled, staleTime],
  );

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to query client updates
    const unsubscribe = queryClient.subscribe(key, () => {
      const entry = queryClient.getEntry<T>(key);
      if (entry.isStale && entry.status !== 'loading') {
        refetch(true);
      } else {
        setTick((t) => t + 1);
      }
    });

    const entry = queryClient.getEntry<T>(key);
    if (entry.isStale || entry.status === 'idle') {
      refetch(false);
    }

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(key), enabled, refetch]);

  const currentEntry = queryClient.getEntry<T>(key);
  const data = currentEntry.data !== undefined ? currentEntry.data : initialData;
  const isLoading = currentEntry.status === 'loading' && data === undefined;
  const isFetching = currentEntry.status === 'loading';
  const isError = currentEntry.status === 'error';
  const isSuccess = currentEntry.status === 'success' || data !== undefined;

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error: currentEntry.error,
    isSuccess,
    refetch: () => refetch(true),
  };
}
