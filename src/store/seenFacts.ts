import Storage from 'expo-sqlite/kv-store';

// Remembers (on this device) which facts you've already seen, so they don't come back
// until you've been through all of them.
const KEY = 'seenFacts.v1';

let seen: Set<string> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load(): Set<string> {
  if (seen) return seen;
  try {
    const raw = Storage.getItemSync(KEY);
    seen = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    seen = new Set();
  }
  return seen;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    Storage.setItemAsync(KEY, JSON.stringify([...load()])).catch(() => {});
  }, 1500);
}

export function hasSeenFact(id: string): boolean {
  return load().has(id);
}

export function markFactSeen(id: string) {
  const s = load();
  if (s.has(id)) return;
  s.add(id);
  scheduleSave();
}

/** Start over once (almost) everything has been seen. */
export function resetSeenFacts() {
  seen = new Set();
  scheduleSave();
}

export function seenCount(): number {
  return load().size;
}
