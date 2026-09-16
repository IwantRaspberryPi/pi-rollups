// Calendar dates avoid daylight-saving differences between adjacent days.
export function calendarDay(date = new Date()) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}
export function checkIn(previous, date = new Date()) {
  const day = calendarDay(date);
  const valid = previous && Number.isSafeInteger(previous.day) && Number.isSafeInteger(previous.streak) && previous.streak > 0;
  if (valid && previous.day === day) return { day, streak: previous.streak };
  return { day, streak: valid && day - previous.day === 1 ? previous.streak + 1 : 1 };
}
