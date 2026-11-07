// 日期和時鐘。旅程時間用「第幾天 day」＋「幾點 h（小時，可以有小數）」表示，都是國內時間；
// 到了泰國，時鐘改成當地時間（比國內慢一小時），由劇情在落地時調整。

import { START_DATE_UTC } from '../../story/opening/data.js';

const DOW = '日一二三四五六';
export const SEGMENTS = [8, 13, 19, 23]; // 「休息到下一段時間」會停在這些整點

export function dateOf(day) {
  const [y, m, d] = START_DATE_UTC;
  return new Date(Date.UTC(y, m, d + day));
}

/** 'M/D' 或 '20XX/M/D 星期X' */
export function dateStr(day, short = false) {
  const d = dateOf(day);
  const md = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return short ? md : `20XX/${md} 星期${DOW[d.getUTCDay()]}`;
}

export function weekday(day) { return DOW[dateOf(day).getUTCDay()]; }

export function seg(h) {
  return h < 5 ? '深夜' : h < 12 ? '上午' : h < 18 ? '下午' : h < 23 ? '晚上' : '深夜';
}

export function clock(h) {
  let H = Math.floor(h) % 24, M = Math.round((h % 1) * 60);
  if (M === 60) { M = 0; H = (H + 1) % 24; }
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

/** 插圖用的時段：night / dawn / day / dusk */
export function tod(h) {
  return h < 6 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : h < 19.5 ? 'dusk' : 'night';
}

export const isNight = (h) => h >= 23 || h < 5;

/** 從 h 到下一個分段的小時數；已經過了最後一段回傳 0 */
export function hoursToNextSeg(h) {
  const b = SEGMENTS.find((x) => x > h + 0.01);
  return b === undefined ? 0 : b - h;
}
