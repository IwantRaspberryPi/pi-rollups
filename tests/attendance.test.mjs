import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIn, calendarDay } from '../attendance.js';
const date = (y,m,d,h=12) => new Date(y,m-1,d,h);
test('first and repeated visits count once per calendar day',()=>{
  const first=checkIn(null,date(2026,9,16)); assert.equal(first.streak,1);
  assert.deepEqual(checkIn(first,date(2026,9,16,23)),first);
});
test('consecutive days accumulate and missing a day resets to one',()=>{
  let state=checkIn(null,date(2026,9,16)); state=checkIn(state,date(2026,9,17));
  assert.equal(state.streak,2); state=checkIn(state,date(2026,9,18)); assert.equal(state.streak,3);
  assert.equal(checkIn(state,date(2026,9,20)).streak,1);
});
test('month, leap day, year and daylight-saving transitions count calendar days',()=>{
  for (const [a,b] of [[date(2026,12,31),date(2027,1,1)],[date(2028,2,28),date(2028,2,29)],[date(2028,2,29),date(2028,3,1)],[date(2026,3,8),date(2026,3,9)]]) {
    assert.equal(calendarDay(b)-calendarDay(a),1); assert.equal(checkIn(checkIn(null,a),b).streak,2);
  }
});
test('corrupt storage and future dates recover to a fresh streak',()=>{
  for (const value of [null,{},'bad',{day:0,streak:-1},{day:0,streak:1.5},{day:Infinity,streak:10}]) assert.equal(checkIn(value,date(2026,9,16)).streak,1);
  assert.equal(checkIn(checkIn(null,date(2026,9,17)),date(2026,9,16)).streak,1);
});
