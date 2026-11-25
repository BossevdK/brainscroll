import Storage from 'expo-sqlite/kv-store';

/** Read a JSON value saved on this device (or the fallback). */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function loadJSONArray<T>(key: string): T[] {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, unknown>();

/** Save a JSON value; writes are bundled (max once per second per key). */
export function saveJSON(key: string, value: unknown) {
  pending.set(key, value);
  if (timers.has(key)) return;
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      const v = pending.get(key);
      pending.delete(key);
      Storage.setItemAsync(key, JSON.stringify(v)).catch(() => {});
    }, 1000),
  );
}

export function removeKey(key: string) {
  Storage.removeItemAsync(key).catch(() => {});
}
