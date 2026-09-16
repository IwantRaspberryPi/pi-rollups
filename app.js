import { TIERS, Round, randomPosition, hintAt, DURATION } from './game.js';
const $ = id => document.getElementById(id);
let pi = '', tier = 0, level = 0, chaos = false, phase = 'loading', round = null;
let animation = 0, spinFrame = 0, spinEnd = 0, soundEnabled = true, audio;
const roman = ['I', 'II', 'III'];
const clock = () => performance.now();
function tone(frequency, duration = .08, type = 'sine', volume = .035, delay = 0) {
  if (!soundEnabled || !audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + delay;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .005);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(start); oscillator.stop(start + duration + .01);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function unlockAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch { /* Gameplay remains available without audio. */ }
}
function renderReels(position = null) {
  const digits = position === null ? '------' : String(position).padStart(chaos ? 7 : 6, '0');
  $('reels').replaceChildren(...[...digits].map(digit => {
    const reel = document.createElement('div'); reel.className = 'reel';
    const track = document.createElement('div'); track.className = 'reel-track';
    [digit === '-' ? '0' : (Number(digit) + 9) % 10, digit, digit === '-' ? '0' : (Number(digit) + 1) % 10].forEach(n => { const el = document.createElement('div'); el.className = 'reel-digit'; el.textContent = n; track.append(el); });
    reel.append(track); return reel;
  }));
}
function selection() {
  document.body.classList.toggle('chaos', chaos);
  $('mode-tag').textContent = chaos ? 'CHAOS MODE' : `${TIERS[tier].name.toUpperCase()} ${roman[level]}`;
  $('range-label').textContent = `DIGITS 1—${(chaos ? 1000000 : TIERS[tier].limits[level]).toLocaleString('en-US')}`;
  document.querySelectorAll('.level-button').forEach(b => b.setAttribute('aria-pressed', String(!chaos && Number(b.dataset.tier) === tier && Number(b.dataset.level) === level)));
  $('chaos').setAttribute('aria-pressed', String(chaos));
  $('hint').hidden = chaos;
  $('attempts').textContent = chaos ? '● ● ●   3 guesses · no hints' : '1 guess per round';
  $('keyboard-note').textContent = chaos ? '1,000,000 positions · 3 guesses · pure luck' : '14 seconds · 4 consecutive digits · a little nerve';
}
function reset() {
  cancelAnimationFrame(animation); clearInterval(spinFrame); clearTimeout(spinEnd);
  round = null; phase = pi ? 'ready' : 'loading';
  $('tumbler').classList.remove('spinning'); $('tumbler').setAttribute('aria-label', 'Tumbler ready');
  $('game-panel')?.classList.remove('result-won', 'result-lost', 'result-timeout');
  document.querySelector('.game-panel').classList.remove('result-won', 'result-lost', 'result-timeout');
  $('answer').value = ''; $('answer').disabled = true; $('hint').disabled = true;
  $('hint-box').hidden = true; $('hint-box').replaceChildren();
  $('check').hidden = true; $('spin').hidden = false; $('spin').disabled = !pi;
  $('spin-text').textContent = pi ? 'Spin the tumbler' : 'Loading pi…';
  $('machine-caption').textContent = 'LET THE NUMBERS FALL INTO PLACE';
  $('position-label').textContent = 'YOUR STARTING POSITION';
  $('task-label').textContent = 'Ready when you are.';
  $('feedback').textContent = chaos ? 'Three guesses. No hints. Good luck.' : 'Spin the tumbler. Trust your memory.';
  renderReels(); updateTimer(DURATION); selection(); lockSelection(!pi);
}
function lockSelection(locked) {
  document.querySelectorAll('.level-button, #chaos, #help').forEach(b => { b.disabled = locked; });
}
TIERS.forEach((item, ti) => {
  const section = document.createElement('div'); section.className = 'tier';
  const heading = document.createElement('div'); heading.className = 'tier-head';
  const name = document.createElement('span'); name.className = 'tier-name'; name.textContent = item.name;
  const rank = document.createElement('span'); rank.className = 'tier-rank'; rank.textContent = '▰'.repeat(ti + 1) + '▱'.repeat(2 - ti);
  heading.append(name, rank);
  const options = document.createElement('div'); options.className = 'level-options';
  item.limits.forEach((max, li) => {
    const b = document.createElement('button'); b.className = 'level-button';
    b.dataset.tier = ti; b.dataset.level = li; b.setAttribute('aria-label', `${item.name} ${roman[li]}: ${max} digits`);
    const strong = document.createElement('strong'); strong.textContent = roman[li];
    const small = document.createElement('small'); small.textContent = max.toLocaleString('en-US'); b.append(strong, small);
    b.addEventListener('click', () => { if (phase === 'playing' || phase === 'spinning') return; tier = ti; level = li; chaos = false; reset(); });
    options.append(b);
  }); section.append(heading, options); $('tiers').append(section);
});
$('chaos').addEventListener('click', () => { if (phase === 'playing' || phase === 'spinning') return; chaos = true; reset(); });
function updateTimer(ms) {
  $('timer').textContent = (Math.ceil(ms / 100) / 10).toFixed(1);
  $('timer').classList.toggle('urgent', ms <= 4000);
  $('timer-bar').style.transform = `scaleX(${ms / DURATION})`;
  $('timer-bar').style.background = ms <= 4000 ? '#ef8f76' : 'var(--accent)';
  document.querySelector('.timer-track').setAttribute('aria-valuenow', String(Math.round(ms / 100) / 10));
}
function tick() {
  if (phase !== 'playing') return;
  updateTimer(round.remaining(clock()));
  if (round.status !== 'playing') { finish(); return; }
  animation = requestAnimationFrame(tick);
}
function finish() {
  if (phase !== 'playing') return;
  phase = 'result'; cancelAnimationFrame(animation); updateTimer(round.remaining(clock())); lockSelection(false);
  $('answer').disabled = true; $('hint').disabled = true; $('check').hidden = true; $('spin').hidden = false; $('spin').disabled = false;
  $('spin-text').textContent = 'Spin again';
  const won = round.status === 'won';
  document.querySelector('.game-panel').classList.add(`result-${round.status}`);
  $('task-label').textContent = won ? 'Perfect recall.' : round.status === 'timeout' ? 'Time’s up.' : 'A little more practice.';
  $('feedback').textContent = won ? `Exactly right. ${round.answer} — nicely remembered.` : `${round.status === 'timeout' ? 'Time’s up.' : 'Not this time.'} Digits ${round.position.toLocaleString('en-US')}–${(round.position + 3).toLocaleString('en-US')} are ${round.answer}.`;
  if (won) { tone(523,.15); tone(659,.15,'sine',.035,.12); tone(784,.3,'sine',.035,.24); } else tone(150,.22,'triangle');
  $('spin').focus({preventScroll:true});
}
function spin() {
  if (!pi || phase === 'playing' || phase === 'spinning') return;
  unlockAudio(); reset(); phase = 'spinning'; lockSelection(true);
  $('spin').disabled = true; $('spin-text').textContent = 'Finding your position…';
  $('feedback').textContent = 'The clock starts when the tumbler stops.';
  $('machine-caption').textContent = 'A SMALL SPIN INTO INFINITY';
  const max = chaos ? 1000000 : TIERS[tier].limits[level];
  const position = randomPosition(max);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('tumbler').classList.add('spinning');
  if (!reduced) spinFrame = setInterval(() => { renderReels(randomPosition(max)); tone(240 + Math.random() * 160,.04,'triangle',.026); }, 85);
  spinEnd = setTimeout(() => {
    clearInterval(spinFrame); $('tumbler').classList.remove('spinning'); renderReels(position);
    $('tumbler').setAttribute('aria-label', `Starting decimal position ${position}`);
    tone(880,.12,'sine',.045); tone(1320,.2,'sine',.03,.08);
    $('machine-caption').textContent = 'YOUR NUMBER IS IN. MAKE IT COUNT.';
    $('position-label').textContent = `POSITION ${position.toLocaleString('en-US')}`;
    $('task-label').textContent = `Enter digits ${position.toLocaleString('en-US')}–${(position + 3).toLocaleString('en-US')}`;
    $('feedback').textContent = chaos ? 'Three guesses. One clock. Trust your luck.' : 'Four digits, starting at the selected position.';
    $('spin').hidden = true; $('check').hidden = false; $('check').disabled = true;
    $('answer').disabled = false; $('hint').disabled = chaos;
    round = new Round(pi, position, chaos, clock()); phase = 'playing';
    $('answer').focus({preventScroll:true}); tick();
  }, reduced ? 180 : 1800);
}
$('spin').addEventListener('click', () => { if (phase === 'error') loadPi(); else spin(); });
$('answer').addEventListener('input', () => { $('answer').value = $('answer').value.replace(/[^0-9]/g, '').slice(0,4); $('check').disabled = $('answer').value.length !== 4; });
$('answer-form').addEventListener('submit', event => {
  event.preventDefault(); if (phase !== 'playing') return;
  const result = round.submit($('answer').value, clock());
  if (round.status !== 'playing') { finish(); return; }
  if (result === 'ignored') return;
  $('attempts').textContent = `${'● '.repeat(round.attempts)}${'○ '.repeat(3 - round.attempts)} ${round.attempts} ${round.attempts === 1 ? 'guess' : 'guesses'} left`;
  $('feedback').textContent = `Not quite. ${round.attempts} ${round.attempts === 1 ? 'guess' : 'guesses'} left — the clock is still running.`;
  $('answer').value = ''; $('check').disabled = true; $('answer').focus(); tone(190,.1,'triangle');
});
$('hint').addEventListener('click', () => {
  if (phase !== 'playing') return;
  if (round.hint(clock())) {
    const context = hintAt(pi, round.position), mark = document.createElement('mark'); mark.textContent = '????';
    $('hint-box').replaceChildren(document.createTextNode(context.before), mark, document.createTextNode(context.after));
    $('hint-box').hidden = false; $('hint').disabled = true;
    $('feedback').textContent = 'Hint revealed. 3 seconds deducted.'; updateTimer(round.remaining(clock()));
  }
  if (round.status !== 'playing') finish(); else $('answer').focus({preventScroll:true});
});
$('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled; if (soundEnabled) unlockAudio();
  $('sound').setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound');
  $('sound').setAttribute('aria-pressed', String(!soundEnabled));
  $('sound').innerHTML = `${soundEnabled ? '♪' : '♩'} <span>Sound ${soundEnabled ? 'on' : 'off'}</span>`;
});
$('help').addEventListener('click', () => $('help-dialog').showModal());

async function loadPi() {
  phase = 'loading'; $('spin').disabled = true; $('spin-text').textContent = 'Loading pi…';
  try {
    const response = await fetch(new URL('./data/pi.txt', import.meta.url));
    if (!response.ok) throw new Error('Could not load pi');
    const data = await response.text();
    if (!/^[0-9]{1000010}$/.test(data) || !data.startsWith('14159265358979323846264338327950288419716939937510')) throw new Error('Invalid pi dataset');
    pi = data; reset();
  } catch {
    phase = 'error'; $('feedback').textContent = 'Could not load the pi digits. Check your connection and try again.';
    $('spin-text').textContent = 'Retry loading'; $('spin').disabled = false;
  }
}
reset(); loadPi();
