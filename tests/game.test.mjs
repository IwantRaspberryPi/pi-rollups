import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TIERS, Round, answerAt, hintAt, randomPosition, scoreGuess, compareNumber } from '../game.js';
const pi = readFileSync(new URL('../data/pi.txt', import.meta.url), 'utf8');
test('pi dataset has exact length, known decimal prefix, and matching digest', () => {
  assert.match(pi, /^\d{1000010}$/);
  assert.equal(pi.slice(0,100), '1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679');
  assert.equal(createHash('sha256').update(pi).digest('hex'), readFileSync(new URL('../data/pi.sha256', import.meta.url),'utf8').trim());
});
test('all nine requested limits are present', () => assert.deepEqual(TIERS.map(x => x.limits), [[20,30,50],[100,250,325],[500,750,1000]]));
test('positions use one-based decimal indexing and allow boundary overflow', () => {
  assert.equal(answerAt(pi,1),'1415'); assert.equal(answerAt(pi,10),'5897'); assert.equal(answerAt(pi,19),'4626');
  for (const limit of [...TIERS.flatMap(x => x.limits), 1000000]) assert.equal(answerAt(pi,limit).length,4);
  assert.throws(() => answerAt(pi,0), RangeError);
});
test('hints preserve context without including any target index', () => {
  const indexed = Array.from({length:1100},(_,i)=>String.fromCharCode(1000+i)).join('');
  for (let p=1;p<=1000;p++) {
    const hint=hintAt(indexed,p), answer=answerAt(indexed,p);
    for (const c of answer) assert.ok(!(hint.before+hint.after).includes(c));
    assert.equal(hint.after, indexed.slice(p+3,p+7));
  }
  assert.deepEqual(hintAt(pi,7),{before:'3.141592',after:'8979'});
  assert.ok(hintAt(pi,1000).before.startsWith('3.141592…'));
});
test('uniform range includes both endpoints and rejects modulo bias', () => {
  for (const max of [20,30,50,100,250,325,500,750,1000,1000000]) {
    assert.equal(randomPosition(max,()=>0),1); assert.equal(randomPosition(max,()=>max-1),max);
  }
  const values=[4294967295,0]; assert.equal(randomPosition(20,()=>values.shift()),1);
});
test('normal round accepts exactly four digits and only one guess', () => {
  const r=new Round(pi,1,false,100);
  assert.equal(r.submit('141',200),'ignored'); assert.equal(r.attempts,1);
  assert.equal(r.submit('1415',300),'won'); assert.equal(r.submit('0000',400),'ignored');
  const failed=new Round(pi,1,false,0); assert.equal(failed.submit('0000',1),'lost');
});
test('hint deducts exactly 3 seconds once and can expire the round', () => {
  const r=new Round(pi,7,false,0); assert.equal(r.hint(1000),true); assert.equal(r.remaining(1000),10000);
  assert.equal(r.hint(1000),false); assert.equal(r.deadline,11000);
  const late=new Round(pi,1,false,0); late.hint(12000); assert.equal(late.status,'timeout');
});
test('Chaos has no context hints, three guesses, and no time limit', () => {
  const r=new Round(pi,1000000,true,0); assert.equal(r.hint(1),false); assert.equal(r.hinted,false);
  let wrong= r.answer==='0000'?'1111':'0000';
  assert.equal(r.submit(wrong,1000),'playing'); assert.equal(r.submit(wrong,2000),'playing');
  assert.equal(r.deadline,Infinity); assert.equal(r.remaining(1e12),Infinity); assert.equal(r.attempts,1); assert.equal(r.submit(r.answer,3000),'won');
  const failed=new Round(pi,1,true,0); for(let i=0;i<3;i++) failed.submit('0000',i); assert.equal(failed.status,'lost');
});
test('expired rounds reject answers even when timer rendering was suspended', () => {
  const r=new Round(pi,1,false,0); assert.equal(r.submit('1415',14000),'ignored'); assert.equal(r.status,'timeout');
  const hidden=new Round(pi,1,false,0); assert.equal(hidden.remaining(60000),0); assert.equal(hidden.status,'timeout');
});
test('leading zeros are kept as four-character answers',()=>{
  const index=pi.indexOf('0000'); const r=new Round(pi,index+1,true,0); assert.equal(r.submit('0000',1),'won');
});

test('dataset checkpoints match independently published pi digits', () => {
  // Verified against https://api.pi.delivery/v1/pi on 2026-09-16.
  // API position 0 is the integer 3; position 1 is the first decimal digit.
  for (const [position, expected] of [[1000,'9380952572'], [500000,'2697391017'], [999990,'0577945815'], [1000000,'1309275628']]) {
    assert.equal(pi.slice(position-1,position+9),expected);
  }
});

test('Wordle feedback handles exact matches and duplicate digits', () => {
  assert.deepEqual(scoreGuess('1123','1111'), ['correct','correct','absent','absent']);
  assert.deepEqual(scoreGuess('0123','3000'), ['present','present','absent','absent']);
  assert.deepEqual(scoreGuess('1123','2111'), ['present','correct','present','absent']);
  assert.deepEqual(scoreGuess('1234','4321'), Array(4).fill('present'));
  assert.deepEqual(scoreGuess('0000','0000'), Array(4).fill('correct'));
});
test('Chaos retains three rows and accepts guesses long after 14 seconds', () => {
  const r = new Round(pi,1,true,0);
  r.submit('1111',86400000); r.submit('5555',86400001);
  assert.equal(r.submit('1415',86400002),'won'); assert.equal(r.guesses.length,3);
  assert.deepEqual(r.guesses[0].marks,['correct','absent','correct','absent']);
  assert.deepEqual(r.guesses[2].marks,Array(4).fill('correct'));
  assert.equal(r.submit('1415',86400003),'ignored'); assert.equal(r.guesses.length,3);
});

test('numeric comparison clearly describes the answer relative to the input', () => {
  assert.deepEqual(compareNumber('5897','5000'), {value:'5000',direction:'HIGH'});
  assert.deepEqual(compareNumber('5897','6000'), {value:'6000',direction:'LOW'});
  assert.deepEqual(compareNumber('5897','5897'), {value:'5897',direction:'MATCH'});
});
test('numeric hints support leading zeros and both range boundaries', () => {
  assert.deepEqual(compareNumber('0050','9'), {value:'0009',direction:'HIGH'});
  assert.deepEqual(compareNumber('0000','0'), {value:'0000',direction:'MATCH'});
  assert.deepEqual(compareNumber('9999','9999'), {value:'9999',direction:'MATCH'});
  assert.equal(compareNumber('0050','100').direction,'LOW');
});
test('numeric hints reject invalid input instead of coercing it', () => {
  for(const value of ['', '10000','-1','1.2','1e3','abcd',' 10','10 ']) assert.equal(compareNumber('1234',value),null);
});

test('Chaos allows one comparison without spending guesses or changing the board', () => {
  const r = new Round(pi,10,true,0);
  assert.equal(r.compare(''),null); assert.equal(r.comparison,null);
  assert.deepEqual(r.compare('5000'),{value:'5000',direction:'HIGH'});
  assert.equal(r.attempts,3); assert.equal(r.guesses.length,0); assert.equal(r.status,'playing');
  assert.equal(r.compare('6000'),null);
  r.submit('1111',1); assert.equal(r.compare('6000'),null);
  assert.equal(new Round(pi,10,true,0).comparison,null);
});
test('matching comparisons still require a submitted guess and finished rounds block hints', () => {
  const r = new Round(pi,10,true,0);
  assert.equal(r.compare('5897').direction,'MATCH'); assert.equal(r.status,'playing');
  assert.equal(r.attempts,3); assert.equal(r.submit('5897',100000),'won');
  assert.equal(r.compare('5000'),null);
  const ended = new Round(pi,10,true,0); ended.status='lost'; assert.equal(ended.compare('5000'),null);
  assert.equal(new Round(pi,10,false,0).compare('5000'),null);
});
