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
    this.deadline = chaos ? Infinity : now + DURATION;
    this.guesses = [];
    this.attempts = chaos ? 3 : 1;
    this.hinted = false;
    this.status = 'playing';
  }
  remaining(now) {
    if (this.chaos) return Infinity;
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
    if (this.chaos) this.guesses.push({ value, marks: scoreGuess(this.answer, value) });
    this.attempts--;
    if (value === this.answer) this.status = 'won';
    else if (this.attempts === 0) this.status = 'lost';
    return this.status;
  }
}

export function scoreGuess(answer, guess) {
  if (!/^\d{4}$/.test(answer) || !/^\d{4}$/.test(guess)) throw new TypeError('Expected four digits');
  const marks = Array(4).fill('absent'), remaining = {};
  // Reserve exact matches before distributing remaining digit occurrences.
  for (let i = 0; i < 4; i++) {
    if (answer[i] === guess[i]) marks[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < 4; i++) {
    if (marks[i] !== 'correct' && remaining[guess[i]] > 0) {
      marks[i] = 'present'; remaining[guess[i]]--;
    }
  }
  return marks;
}
