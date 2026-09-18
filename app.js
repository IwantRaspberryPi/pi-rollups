import { PROGRESS_KEY, LEVEL_KEYS, MEDALS, medalFor, nextMedal, createProgressStore } from './progress.js';
import { checkIn } from './attendance.js';
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
  $('timer-value').hidden = chaos;
  document.querySelector('.timer-track').hidden = chaos;
  $('chaos-puzzle').hidden = !chaos;
  syncComparison();
  $('end-round').hidden = !(chaos && phase === 'playing');
  renderBoard();
  $('attempts').textContent = chaos ? '● ● ●   3 guesses · 1 HIGH/LOW hint' : '1 guess per round';
  $('keyboard-note').textContent = chaos ? '1,000,000 positions · 3 guesses · no time limit' : '14 seconds · 4 consecutive digits · a little nerve';
}
function reset() {
  cancelAnimationFrame(animation); clearInterval(spinFrame); clearTimeout(spinEnd);
  round = null; phase = pi ? 'ready' : 'loading';
  $('reward-notice').hidden = true;
  $('compare-number').value = '';
  $('compare-result').textContent = 'Spin to unlock your hint.';
  $('compare-result').removeAttribute('data-direction');
  $('tumbler').classList.remove('spinning'); $('tumbler').setAttribute('aria-label', 'Tumbler ready');
  document.querySelector('.game-panel').classList.remove('result-won', 'result-lost', 'result-timeout');
  $('answer').value = ''; $('answer').disabled = true; $('hint').disabled = true;
  $('hint-box').hidden = true; $('hint-box').replaceChildren();
  $('check').hidden = true; $('spin').hidden = false; $('spin').disabled = !pi;
  $('spin-text').textContent = pi ? 'Spin the tumbler' : 'Loading pi…';
  $('machine-caption').textContent = 'LET THE NUMBERS FALL INTO PLACE';
  $('position-label').textContent = 'YOUR STARTING POSITION';
  $('task-label').textContent = 'Ready when you are.';
  $('feedback').textContent = chaos ? 'Three guesses. Use the colors to find your four.' : 'Spin the tumbler. Trust your memory.';
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
  if (phase !== 'playing' || chaos) return;
  updateTimer(round.remaining(clock()));
  if (round.status !== 'playing') { finish(); return; }
  animation = requestAnimationFrame(tick);
}
function finish() {
  if (phase !== 'playing') return;
  phase = 'result'; cancelAnimationFrame(animation); if (!chaos) updateTimer(round.remaining(clock())); lockSelection(false);
  $('end-round').hidden = true; renderBoard(); syncComparison();
  $('answer').disabled = true; $('hint').disabled = true; $('check').hidden = true; $('spin').hidden = false; $('spin').disabled = false;
  $('spin-text').textContent = 'Spin again';
  const won = round.status === 'won';
  document.querySelector('.game-panel').classList.add(`result-${round.status}`);
  $('task-label').textContent = won ? (chaos ? 'Chaos conquered.' : 'Perfect recall.') : round.status === 'timeout' ? 'Time’s up.' : 'A little more practice.';
  $('feedback').textContent = won ? (chaos ? `Exactly right. ${round.answer} — you beat the odds.` : `Exactly right. ${round.answer} — nicely remembered.`) : `${round.status === 'timeout' ? 'Time’s up.' : 'Not this time.'} Digits ${round.position.toLocaleString('en-US')}–${(round.position + 3).toLocaleString('en-US')} are ${round.answer}.`;
  if (won) awardVictory();
  if (won) { tone(523,.15); tone(659,.15,'sine',.035,.12); tone(784,.3,'sine',.035,.24); } else tone(150,.22,'triangle');
  $('spin').focus({preventScroll:true});
}
function spin() {
  if (!pi || phase === 'playing' || phase === 'spinning') return;
  unlockAudio(); reset(); phase = 'spinning'; lockSelection(true);
  $('spin').disabled = true; $('spin-text').textContent = 'Finding your position…';
  $('feedback').textContent = chaos ? 'Three rows. Four digits. Take your time.' : 'The clock starts when the tumbler stops.';
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
    $('feedback').textContent = chaos ? 'Three guesses. No clock. Each row gives you clues.' : 'Four digits, starting at the selected position.';
    $('spin').hidden = true; $('check').hidden = false; $('check').disabled = true;
    $('answer').disabled = false; $('hint').disabled = chaos;
    round = new Round(pi, position, chaos, clock()); phase = 'playing';
    $('end-round').hidden = !chaos; renderBoard(); syncComparison();
    $('answer').focus({preventScroll:true}); if (!chaos) tick();
  }, reduced ? 180 : 1800);
}
$('spin').addEventListener('click', () => { if (phase === 'error') loadPi(); else spin(); });
$('answer').addEventListener('input', () => { $('answer').value = $('answer').value.replace(/[^0-9]/g, '').slice(0,4); $('check').disabled = $('answer').value.length !== 4; renderBoard(); });
$('answer-form').addEventListener('submit', event => {
  event.preventDefault(); if (phase !== 'playing') return;
  const result = round.submit($('answer').value, clock());
  if (result !== 'ignored') renderBoard();
  if (round.status !== 'playing') { finish(); return; }
  if (result === 'ignored') return;
  $('attempts').textContent = `${'● '.repeat(round.attempts)}${'○ '.repeat(3 - round.attempts)} ${round.attempts} ${round.attempts === 1 ? 'guess' : 'guesses'} left`;
  $('feedback').textContent = `Not quite. ${round.attempts} ${round.attempts === 1 ? 'guess' : 'guesses'} left — use the colors to narrow it down.`;
  $('answer').value = ''; $('check').disabled = true; renderBoard(); $('answer').focus(); tone(190,.1,'triangle');
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
function syncComparison() {
  $('compare-form').hidden = !chaos;
  const used = Boolean(round?.comparison);
  const available = chaos && phase === 'playing' && !used;
  $('compare-number').disabled = !available;
  $('compare-button').disabled = !available || !/^\d{1,4}$/.test($('compare-number').value);
  $('compare-uses').textContent = used ? 'Hint used' : '1 use per round';
  if (!used) $('compare-result').textContent = phase === 'playing' ? 'One comparison. Choose your number.' : phase === 'result' ? 'Round finished.' : 'Spin to unlock your hint.';
}
$('compare-number').addEventListener('input', syncComparison);
$('compare-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!chaos || phase !== 'playing') return;
  const result = round.compare($('compare-number').value);
  if (!result) return;
  $('compare-number').value = result.value;
  const meaning = result.direction === 'HIGH' ? `The answer is greater than ${result.value}.` : result.direction === 'LOW' ? `The answer is less than ${result.value}.` : `The answer equals ${result.value}. Submit it with Check digits.`;
  $('compare-result').textContent = `${result.direction} — ${meaning}`;
  $('compare-result').dataset.direction = result.direction;
  syncComparison();
  $('answer').focus({preventScroll:true});
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
const attendanceKey = 'pi-rollups.attendance.v1';
let attendanceMemory = null;
function refreshAttendance() {
  if (document.visibilityState !== 'visible') return;
  let previous = attendanceMemory, saved = true;
  try { previous = JSON.parse(localStorage.getItem(attendanceKey)) || previous; } catch { /* Recover invalid or unavailable storage. */ }
  attendanceMemory = checkIn(previous);
  try { localStorage.setItem(attendanceKey, JSON.stringify(attendanceMemory)); } catch { saved = false; }
  $('streak-count').textContent = attendanceMemory.streak;
  $('streak-unit').textContent = attendanceMemory.streak === 1 ? 'day streak' : 'days in a row';
  $('streak-status').textContent = saved ? 'Checked in today' : 'This visit counts, but storage is unavailable.';
  document.querySelector('.checkin-badge').textContent = saved ? '✓' : '!';
}
function renderBoard() {
  if (!chaos) return;
  const symbols = {correct:'✓',present:'↔',absent:'×'};
  const labels = {correct:'right place',present:'wrong place',absent:'not matched'};
  const history = round?.guesses || [];
  $('guess-board').replaceChildren(...Array.from({length:3},(_,rowIndex)=>{
    const row=document.createElement('div'); row.className='guess-row'; row.setAttribute('role','group'); row.setAttribute('aria-label',`Guess ${rowIndex+1}`);
    const guess=history[rowIndex];
    const draft=phase==='playing' && rowIndex===history.length ? $('answer').value : '';
    for(let i=0;i<4;i++) {
      const mark=guess?.marks[i], digit=guess ? guess.value[i] : (draft[i] || '');
      const tile=document.createElement('span'); tile.className=`guess-tile ${mark || (draft ? 'draft' : '')}`;
      tile.setAttribute('aria-label',`Digit ${i+1}: ${digit || 'empty'}${mark ? ', '+labels[mark] : ''}`);
      const value=document.createElement('b'); value.textContent=digit || '·'; value.setAttribute('aria-hidden','true'); tile.append(value);
      if(mark) {const icon=document.createElement('small'); icon.textContent=symbols[mark]; icon.setAttribute('aria-hidden','true'); tile.append(icon);}
      row.append(tile);
    }
    return row;
  }));
}
$('end-round').addEventListener('click',()=>{
  if (chaos && phase==='playing') { round.status='lost'; finish(); }
});
document.addEventListener('visibilitychange',refreshAttendance);
window.addEventListener('focus',refreshAttendance);
window.addEventListener('storage',event=>{if(event.key===attendanceKey) refreshAttendance();});
setInterval(refreshAttendance,60000);

const progressStore = createProgressStore({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
function medalImage(id, alt = '') {
  const image = document.createElement('img');
  image.src = new URL('./assets/medals/' + id + '.webp', import.meta.url).href;
  image.alt = alt; image.width = 96; image.height = 96; image.loading = 'lazy';
  return image;
}
function renderCollection(progress = progressStore.read()) {
  const groups = TIERS.map((item, ti) => {
    const group = document.createElement('section'); group.className = 'medal-tier';
    const heading = document.createElement('h3'); heading.textContent = item.name;
    const row = document.createElement('div'); row.className = 'medal-row';
    item.limits.forEach((limit, li) => {
      const wins = progress.counts[LEVEL_KEYS[ti * 3 + li]];
      const medal = medalFor(wins), next = nextMedal(wins);
      const card = document.createElement('div'); card.className = 'medal-card' + (medal ? ' earned' : ' locked');
      card.dataset.level = LEVEL_KEYS[ti * 3 + li];
      const title = document.createElement('h4'); title.textContent = roman[li];
      const range = document.createElement('span'); range.className = 'medal-range'; range.textContent = limit.toLocaleString('en-US') + ' digits';
      const name = document.createElement('strong'); name.className = 'medal-name'; name.textContent = medal?.name || 'Unclaimed';
      const count = document.createElement('span'); count.className = 'medal-count'; count.textContent = wins.toLocaleString('en-US') + (wins === 1 ? ' win' : ' wins');
      const bar = document.createElement('progress'); bar.max = next?.wins || 30; bar.value = Math.min(wins, bar.max);
      bar.setAttribute('aria-label', item.name + ' ' + roman[li] + (next ? ': progress to ' + next.name : ': Platinum earned'));
      const note = document.createElement('small'); note.textContent = next ? (next.wins - wins) + ' to ' + next.name : 'Highest medal earned';
      card.append(title, range, medalImage(medal?.id || 'bronze'), name, count, bar, note); row.append(card);
    });
    group.append(heading, row); return group;
  });
  $('medal-levels').replaceChildren(...groups);
  const chaosWins = progress.counts.chaos;
  $('chaos-honor-count').textContent = chaosWins.toLocaleString('en-US');
  $('chaos-honor-unit').textContent = chaosWins === 1 ? 'victory' : 'victories';
  $('chaos-honor').classList.toggle('unearned', chaosWins === 0);
  $('chaos-honor-note').textContent = chaosWins ? 'One victory. One more mark of honor. Keep defying the odds.' : 'Beat Chaos to earn your first mark of honor.';
  $('progress-note').textContent = progressStore.saved
    ? 'Saved in this browser. Medals never expire when you miss a day. Clearing browser data resets them. Wins count from this update onward.'
    : 'Browser storage is unavailable. Wins and medals will last only for this visit.';
}
function awardVictory() {
  const key = chaos ? 'chaos' : LEVEL_KEYS[tier * 3 + level];
  const before = progressStore.read().counts[key];
  const progress = progressStore.recordWin(key), wins = progress.counts[key];
  const medal = medalFor(wins), promoted = !chaos && medal?.id !== medalFor(before)?.id;
  const notice = $('reward-notice');
  const message = document.createElement('span');
  message.textContent = chaos ? 'Chaos honor #' + wins.toLocaleString('en-US') + ' earned.'
    : promoted ? medal.name + ' medal unlocked · ' + TIERS[tier].name + ' ' + roman[level]
    : TIERS[tier].name + ' ' + roman[level] + ' · ' + wins.toLocaleString('en-US') + ' wins';
  if (!progressStore.saved) message.textContent += ' Saved for this visit only.';
  notice.replaceChildren(medalImage(chaos ? 'chaos' : medal.id), message);
  notice.hidden = false;
  renderCollection(progress);
}
$('medal-legend').replaceChildren(...MEDALS.map(medal => {
  const item = document.createElement('div');
  const caption = document.createElement('span'); caption.textContent = medal.name + ' · ' + medal.wins + (medal.wins === 1 ? ' win' : ' wins');
  item.append(medalImage(medal.id), caption); return item;
}));
window.addEventListener('storage', event => {
  if (event.key === PROGRESS_KEY || event.key === null) renderCollection();
});
window.addEventListener('focus', () => renderCollection());
renderCollection();

refreshAttendance(); reset(); loadPi();
