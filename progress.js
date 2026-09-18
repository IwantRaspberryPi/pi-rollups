export const PROGRESS_KEY = 'pi-rollups.progress.v1';
export const LEVEL_KEYS = ['beginner-1', 'beginner-2', 'beginner-3', 'intermediate-1', 'intermediate-2', 'intermediate-3', 'advanced-1', 'advanced-2', 'advanced-3'];
export const MEDALS = [
  { name: 'Bronze', id: 'bronze', wins: 1 },
  { name: 'Silver', id: 'silver', wins: 5 },
  { name: 'Gold', id: 'gold', wins: 10 },
  { name: 'Platinum', id: 'platinum', wins: 30 },
];
const keys = [...LEVEL_KEYS, 'chaos'];
export function normalizeProgress(value) {
  const counts = {};
  for (const key of keys) {
    const count = value?.version === 1 ? value.counts?.[key] : 0;
    counts[key] = Number.isSafeInteger(count) && count >= 0 ? count : 0;
  }
  return { version: 1, counts };
}
export function medalFor(wins) {
  return MEDALS.findLast(medal => wins >= medal.wins) || null;
}
export function nextMedal(wins) {
  return MEDALS.find(medal => wins < medal.wins) || null;
}
export function createProgressStore(storage) {
  let memory = normalizeProgress(null), volatile = false;
  function read() {
    if (!volatile) {
      try {
        const raw = storage.getItem(PROGRESS_KEY);
        try { memory = normalizeProgress(JSON.parse(raw)); }
        catch { memory = normalizeProgress(null); }
      } catch { volatile = true; }
    }
    return normalizeProgress(memory);
  }
  return {
    read,
    get saved() { return !volatile; },
    recordWin(key) {
      if (!keys.includes(key)) throw new RangeError('Unknown level');
      memory = read();
      memory.counts[key] = Math.min(Number.MAX_SAFE_INTEGER, memory.counts[key] + 1);
      try { storage.setItem(PROGRESS_KEY, JSON.stringify(memory)); }
      catch { volatile = true; }
      return normalizeProgress(memory);
    },
  };
}
