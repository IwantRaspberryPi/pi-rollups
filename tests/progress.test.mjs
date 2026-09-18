import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESS_KEY, LEVEL_KEYS, normalizeProgress, medalFor, nextMedal, createProgressStore } from '../progress.js';
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
test('medals change only at 1, 5, 10, and 30 wins', () => {
  for (const [wins, medal, next] of [[0,null,'Bronze'],[1,'Bronze','Silver'],[4,'Bronze','Silver'],[5,'Silver','Gold'],[9,'Silver','Gold'],[10,'Gold','Platinum'],[29,'Gold','Platinum'],[30,'Platinum',null],[100,'Platinum',null]]) {
    assert.equal(medalFor(wins)?.name ?? null, medal);
    assert.equal(nextMedal(wins)?.name ?? null, next);
  }
});
test('all nine levels and Chaos retain independent counts across reloads', () => {
  const storage = memoryStorage(), store = createProgressStore(storage);
  for (const key of [...LEVEL_KEYS, 'chaos']) store.recordWin(key);
  store.recordWin('chaos'); store.recordWin('beginner-1');
  const restored = createProgressStore(storage).read();
  assert.equal(restored.counts.chaos, 2);
  assert.equal(restored.counts['beginner-1'], 2);
  for (const key of LEVEL_KEYS.slice(1)) assert.equal(restored.counts[key], 1);
  assert.throws(() => store.recordWin('unknown'), RangeError);
});
test('bad data recovers without accepting negative, fractional, or unsafe counts', () => {
  const storage = memoryStorage(); storage.setItem(PROGRESS_KEY, '{bad json');
  const store = createProgressStore(storage);
  assert.equal(store.recordWin('chaos').counts.chaos, 1);
  const clean = normalizeProgress({version:1,counts:{chaos:-1,'beginner-1':1.5,'beginner-2':Number.MAX_SAFE_INTEGER+1,'beginner-3':5}});
  assert.equal(clean.counts.chaos, 0); assert.equal(clean.counts['beginner-1'], 0);
  assert.equal(clean.counts['beginner-2'], 0); assert.equal(clean.counts['beginner-3'], 5);
  assert.equal(normalizeProgress({version:2,counts:{chaos:30}}).counts.chaos, 0);
});
test('unavailable or full storage keeps wins for the current visit', () => {
  for (const storage of [
    {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},
    {getItem(){return null;},setItem(){throw Error('full');}},
  ]) {
    const store = createProgressStore(storage);
    store.recordWin('chaos'); store.recordWin('chaos');
    assert.equal(store.read().counts.chaos, 2); assert.equal(store.saved, false);
  }
});
test('sequential wins in separate tabs merge and external clearing is respected', () => {
  const storage = memoryStorage(), a = createProgressStore(storage), b = createProgressStore(storage);
  a.read(); b.read(); a.recordWin('chaos'); b.recordWin('beginner-1'); b.recordWin('chaos');
  assert.equal(a.read().counts.chaos, 2); assert.equal(a.read().counts['beginner-1'], 1);
  storage.removeItem(PROGRESS_KEY); assert.equal(a.read().counts.chaos, 0);
});
