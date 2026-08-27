/**
 * In-memory session cache for ZenFlow client data.
 * Implements Stale-While-Revalidate (SWR) cache storage and pub/sub reactivity.
 * Data lives in browser memory for the session and clears automatically on tab close or logout.
 */

type CacheListener = () => void

class ClientMemoryCache {
  private cache = new Map<string, unknown>()
  private listeners = new Map<string, Set<CacheListener>>()

  /** Get cached data for a specific user-scoped key. */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  /** Check if a key exists in cache. */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /** Store data in cache and notify all active subscribers. */
  set<T>(key: string, data: T): void {
    this.cache.set(key, data)
    this.notify(key)
  }

  /** Delete a specific key from cache. */
  delete(key: string): void {
    this.cache.delete(key)
    this.notify(key)
  }

  /** Clear all cached data (called on logout). */
  clear(): void {
    this.cache.clear()
    this.listeners.forEach((subscribers) => {
      subscribers.forEach((listener) => {
        try {
          listener()
        } catch (err) {
          console.error('Cache clear listener error:', err)
        }
      })
    })
  }

  /** Subscribe to cache changes for a specific key. */
  subscribe(key: string, listener: CacheListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    const set = this.listeners.get(key)!
    set.add(listener)

    return () => {
      set.delete(listener)
      if (set.size === 0) {
        this.listeners.delete(key)
      }
    }
  }

  private notify(key: string): void {
    const subscribers = this.listeners.get(key)
    if (subscribers) {
      subscribers.forEach((listener) => {
        try {
          listener()
        } catch (err) {
          console.error('Cache notification error:', err)
        }
      })
    }
  }
}

export const clientCache = new ClientMemoryCache()
