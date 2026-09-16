export const TIERS = [
  { name: 'Beginner', limits: [20, 30, 50] },
  { name: 'Intermediate', limits: [100, 250, 325] },
  { name: 'Advanced', limits: [500, 750, 1000] },
];
export const DURATION = 14000;
export function randomPosition(max, random = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  const ceiling = Math.floor(4294967296 / max) * max;
  let value;
  do { value = random(); } while (value >= ceiling);
  return value % max + 1;
}
export function answerAt(pi, position) {
  if (!Number.isInteger(position) || position < 1 || position + 3 > pi.length) throw new RangeError('Invalid pi position');
  return pi.slice(position - 1, position + 3);
}
export function hintAt(pi, position) {
  answerAt(pi, position);
  const index = position - 1;
  // Never expose a target digit in the fixed prefix at positions 1–6.
  const before = index <= 14 ? '3.' + pi.slice(0, index) : '3.' + pi.slice(0, 6) + '…' + pi.slice(index - 4, index);
  return { before, after: pi.slice(index + 4, index + 8) };
}
export class Round {
  constructor(pi, position, chaos, now) {
    this.answer = answerAt(pi, position);
    this.position = position;
    this.chaos = chaos;
    this.deadline = now + DURATION;
    this.attempts = chaos ? 3 : 1;
    this.hinted = false;
    this.status = 'playing';
  }
  remaining(now) {
    const left = Math.max(0, this.deadline - now);
    if (left === 0 && this.status === 'playing') this.status = 'timeout';
    return left;
  }
  hint(now) {
    this.remaining(now);
    if (this.status !== 'playing' || this.chaos || this.hinted) return false;
    this.hinted = true;
    this.deadline -= 3000;
    this.remaining(now);
    return true;
  }
  submit(value, now) {
    this.remaining(now);
    if (this.status !== 'playing' || !/^\d{4}$/.test(value)) return 'ignored';
    this.attempts--;
    if (value === this.answer) this.status = 'won';
    else if (this.attempts === 0) this.status = 'lost';
    return this.status;
  }
}
