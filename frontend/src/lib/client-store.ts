/**
 * Client-side persistence layer for the Tasks and Calendar modules.
 *
 * The Django REST endpoints for tasks/events exist (see backend/tasks and
 * backend/events) but the app has no real frontend<->backend authentication
 * yet — auth is currently a localStorage simulation (see lib/auth.tsx).
 * Until token/session auth lands, records are persisted to localStorage,
 * scoped per signed-in user, through the same async CRUD signatures a real
 * API client would expose. Swapping this file's internals for fetch calls
 * is a drop-in change; no consuming component needs to know.
 */

interface Persisted {
  id: string
  createdAt: string
  updatedAt: string
}

function storageKey(resource: string, userEmail: string): string {
  return `zenflow:${resource}:${userEmail}`
}

function readAll<T extends Persisted>(resource: string, userEmail: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey(resource, userEmail))
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    throw new Error('Stored data is corrupted and could not be read.')
  }
}

function writeAll<T extends Persisted>(resource: string, userEmail: string, records: T[]): void {
  localStorage.setItem(storageKey(resource, userEmail), JSON.stringify(records))
}

export function createClientStore<TInput, TRecord extends Persisted>(resource: string) {
  return {
    async list(userEmail: string): Promise<TRecord[]> {
      return readAll<TRecord>(resource, userEmail)
    },

    async create(userEmail: string, input: TInput): Promise<TRecord> {
      const now = new Date().toISOString()
      const record = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as unknown as TRecord
      const all = readAll<TRecord>(resource, userEmail)
      writeAll(resource, userEmail, [...all, record])
      return record
    },

    async update(userEmail: string, id: string, patch: Partial<TInput>): Promise<TRecord> {
      const all = readAll<TRecord>(resource, userEmail)
      const index = all.findIndex((r) => r.id === id)
      if (index === -1) throw new Error('Record not found.')
      const updated = { ...all[index], ...patch, updatedAt: new Date().toISOString() }
      const next = [...all]
      next[index] = updated
      writeAll(resource, userEmail, next)
      return updated
    },

    async remove(userEmail: string, id: string): Promise<void> {
      const all = readAll<TRecord>(resource, userEmail)
      writeAll(
        resource,
        userEmail,
        all.filter((r) => r.id !== id),
      )
    },
  }
}
