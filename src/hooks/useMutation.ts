import { useState, useCallback } from 'react';
import { queryClient } from '../state/queryClient';

export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables) => void | Promise<void>;
  onSettled?: () => void | Promise<void>;
  invalidateQueries?: readonly (readonly unknown[])[];
}

export interface UseMutationResult<TData, TVariables> {
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {},
): UseMutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsError(false);
    setError(null);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      try {
        const result = await mutationFn(variables);
        if (options.invalidateQueries) {
          for (const prefix of options.invalidateQueries) {
            queryClient.invalidateQueries(prefix);
          }
        }
        await options.onSuccess?.(result, variables);
        return result;
      } catch (err: any) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setIsError(true);
        setError(normalized);
        await options.onError?.(normalized, variables);
        throw normalized;
      } finally {
        setIsLoading(false);
        await options.onSettled?.();
      }
    },
    [mutationFn, options],
  );

  return {
    mutateAsync,
    isLoading,
    isError,
    error,
    reset,
  };
}
