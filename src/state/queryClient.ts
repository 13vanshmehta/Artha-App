/**
 * Lightweight, typed Server State Manager
 * Provides query caching, in-flight deduplication, reactive subscriptions,
 * and prefix-based query invalidation.
 */

type QueryKey = readonly unknown[];

function serializeKey(key: QueryKey): string {
  return JSON.stringify(key);
}

interface CacheEntry<T> {
  data: T | undefined;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  updatedAt: number;
  isStale: boolean;
  promise?: Promise<T>;
}

type Listener = () => void;

class ServerStateQueryClient {
  private cache = new Map<string, CacheEntry<unknown>>();
  private listeners = new Map<string, Set<Listener>>();
  private activeQueries = new Set<string>();

  getQueryData<T>(key: QueryKey): T | undefined {
    const sKey = serializeKey(key);
    const entry = this.cache.get(sKey);
    return entry?.data as T | undefined;
  }

  setQueryData<T>(key: QueryKey, dataOrUpdater: T | ((prev: T | undefined) => T)): void {
    const sKey = serializeKey(key);
    const existing = this.cache.get(sKey);
    const newData =
      typeof dataOrUpdater === 'function'
        ? (dataOrUpdater as (prev: T | undefined) => T)(existing?.data as T | undefined)
        : dataOrUpdater;

    this.cache.set(sKey, {
      data: newData,
      error: null,
      status: 'success',
      updatedAt: Date.now(),
      isStale: false,
    });
    this.notify(sKey);
  }

  getEntry<T>(key: QueryKey): CacheEntry<T> {
    const sKey = serializeKey(key);
    let entry = this.cache.get(sKey);
    if (!entry) {
      entry = {
        data: undefined,
        error: null,
        status: 'idle',
        updatedAt: 0,
        isStale: true,
      };
      this.cache.set(sKey, entry);
    }
    return entry as CacheEntry<T>;
  }

  subscribe(key: QueryKey, listener: Listener): () => void {
    const sKey = serializeKey(key);
    if (!this.listeners.has(sKey)) {
      this.listeners.set(sKey, new Set());
    }
    this.listeners.get(sKey)!.add(listener);
    this.activeQueries.add(sKey);

    return () => {
      const set = this.listeners.get(sKey);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(sKey);
          this.activeQueries.delete(sKey);
        }
      }
    };
  }

  private notify(sKey: string): void {
    const set = this.listeners.get(sKey);
    if (set) {
      set.forEach((listener) => {
        try {
          listener();
        } catch {}
      });
    }
  }

  async fetchQuery<T>(
    key: QueryKey,
    fetcher: () => Promise<T>,
    options: { staleTime?: number; force?: boolean } = {},
  ): Promise<T> {
    const sKey = serializeKey(key);
    const entry = this.getEntry<T>(key);
    const staleTime = options.staleTime ?? 30_000;
    const isStillFresh =
      !options.force &&
      !entry.isStale &&
      entry.status === 'success' &&
      Date.now() - entry.updatedAt < staleTime;

    if (isStillFresh && entry.data !== undefined) {
      return entry.data;
    }

    // In-flight deduplication
    if (entry.promise) {
      return entry.promise;
    }

    entry.status = 'loading';
    this.notify(sKey);

    const promise = (async () => {
      try {
        const data = await fetcher();
        entry.data = data;
        entry.error = null;
        entry.status = 'success';
        entry.updatedAt = Date.now();
        entry.isStale = false;
        return data;
      } catch (err: any) {
        entry.error = err instanceof Error ? err : new Error(String(err));
        entry.status = 'error';
        throw entry.error;
      } finally {
        entry.promise = undefined;
        this.notify(sKey);
      }
    })();

    entry.promise = promise;
    return promise;
  }

  invalidateQueries(prefix: QueryKey): void {
    const prefixStr = JSON.stringify(prefix).slice(0, -1); // e.g. ["transactions"
    for (const [sKey, entry] of this.cache.entries()) {
      if (sKey.startsWith(prefixStr)) {
        entry.isStale = true;
        this.notify(sKey);
      }
    }

    // Immediately trigger background refetch for actively subscribed queries
    for (const sKey of this.activeQueries) {
      if (sKey.startsWith(prefixStr)) {
        this.notify(sKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    for (const sKey of this.listeners.keys()) {
      this.notify(sKey);
    }
  }
}

export const queryClient = new ServerStateQueryClient();
