// 劇情節點的小語言：條件、效果、文字變數。策劃寫在 src/story/<章>/nodes.js，引擎在這裡解讀。
//
// 條件（when / req）
//   { know: 'k_lcc' } { noKnow: 'k_lcc' }     知道／不知道某條旅行知識
//   { flag: 'x' } { noFlag: 'x' }             旗標
//   { has: 'belt' }                           身上帶著某個物品
//   { hour: { gte: 17 } } { day: { gte: 4 } } 時間
//   { battery: { lt: 6 } }                    數值：energy food faith battery hyg family card cny thb eng
//   { attr: '膽識', gte: 3 }                   屬性
//   { is: { trans: 'land' } }                 狀態欄位等於某個值（null 代表還沒有）
//   { v: 'cabinKg', gt: 7 }                   計算值（見 NUMERIC）
//   { all: [...] } { any: [...] } { not: {...} }，直接寫陣列等於 all
//
// 效果（effects / onEnter）
//   { add: { faith: 10, energy: -4 } }        數值增減（會被上限鎖限制）
//   { attr: '共情', add: 1 }                   屬性
//   { pay: 120 } { payTHB: 299 }              付錢（人民幣先刷卡；泰銖不夠會刷卡）
//   { cash: { card: -1000, thb: 4400 } }      直接搬錢（換匯、提款）
//   { know: 'k_lcc' }                         學到旅行知識
//   { flag: 'x' } { flag: 'x', set: 0 }
//   { set: { cs: 'jay' } }                    設定狀態欄位（只限 SETTABLE）
//   { time: 0.5, tiring: 2, weight: 1, charging: 1 }   花時間（小時）
//   { until: 22.5 } { sleep: 'home' } { unlock: 'family' }
//   { stamp: { c: '中國', t: '出境' } }        護照蓋章
//   { save: 'stamp', label: '泰國入境' } { diary: '家' }
//   { famMsg: ['媽媽', '…'] } { toast: '…' } { flash: '…', kind: 'good' }（下一個畫面最上面的一句話）
//   { end: 'refused' }                        結局
//   { do: '動作名', ... }                     比較複雜的規則，寫在章節的 actions.js

import { inRange, clamp } from '../../core/util.js';
import { totalKg, cabinKg } from './bag.js';
import { clock, seg, dateStr } from './time.js';

const STAT_KEYS = ['energy', 'food', 'faith', 'battery', 'hyg', 'family', 'card', 'cny', 'thb', 'eng'];
export const SETTABLE = ['dest', 'trans', 'dep', 'stay', 'cs', 'tdac', 'tdacAddr', 'ins', 'esim', 'laosVisa', 'loc', 'place', 'zone', 'resume', 'extraBag', 'entry'];

/** 文字裡可以用 {名稱} 插入的值 */
export const VALUES = {
  date: (J) => dateStr(J.S.day),
  dateShort: (J) => dateStr(J.S.day, true),
  clock: (J) => clock(J.S.h),
  seg: (J) => seg(J.S.h),
  totalKg: (J) => totalKg(J.S).toFixed(1),
  cabinKg: (J) => cabinKg(J.S).toFixed(1),
  cashTHB: (J) => Math.round(J.cashTHB()).toLocaleString('en-US'),
  thb: (J) => Math.round(J.S.thb).toLocaleString('en-US'),
  visaUntil: (J) => (J.S.entry == null ? '' : dateStr(J.S.entry + 29, true)),
};
/** 條件 { v: 名稱 } 可以比較的數字 */
const NUMERIC = { cabinKg: (J) => cabinKg(J.S), totalKg: (J) => totalKg(J.S), cashTHB: (J) => J.cashTHB(), money: (J) => J.money() };

export function fill(text, J, extra = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => {
    if (k in extra) return extra[k];
    if (VALUES[k]) return VALUES[k](J);
    throw new Error(`文字裡的 {${k}} 不認得`);
  });
}

export function test(cond, J) {
  if (cond == null) return true;
  const S = J.S;
  if (Array.isArray(cond)) return cond.every((c) => test(c, J));
  if ('all' in cond) return cond.all.every((c) => test(c, J));
  if ('any' in cond) return cond.any.some((c) => test(c, J));
  if ('not' in cond) return !test(cond.not, J);
  if ('know' in cond) return S.know.includes(cond.know);
  if ('noKnow' in cond) return !S.know.includes(cond.noKnow);
  if ('flag' in cond) return !!S.flags[cond.flag];
  if ('noFlag' in cond) return !S.flags[cond.noFlag];
  if ('has' in cond) return J.has(cond.has);
  if ('hour' in cond) return inRange(S.h, cond.hour);
  if ('day' in cond) return inRange(S.day, cond.day);
  if ('attr' in cond) return inRange(S.attr[cond.attr], cond);
  if ('is' in cond) return Object.entries(cond.is).every(([k, v]) => (S[k] ?? null) === v);
  if ('v' in cond) {
    if (!NUMERIC[cond.v]) throw new Error('不認得的計算值：' + cond.v);
    return inRange(NUMERIC[cond.v](J), cond);
  }
  const key = STAT_KEYS.find((k) => k in cond);
  if (key) return inRange(S[key], cond[key]);
  throw new Error('未知的條件寫法：' + JSON.stringify(cond));
}

/** 套用效果。actions 是章節提供的複雜動作表 */
export function apply(list, J, actions = {}) {
  if (!list) return;
  const S = J.S;
  for (const e of list) {
    if (S.over) return;
    if ('add' in e && typeof e.add === 'object') {
      for (const [k, n] of Object.entries(e.add)) { if (k === 'eng') S.eng = clamp(S.eng + n, 0, 10); else J.add(k, n); }
    } else if ('attr' in e) S.attr[e.attr] = clamp(S.attr[e.attr] + (e.add ?? 0), 0, 10);
    else if ('pay' in e) J.payCNY(e.pay);
    else if ('payTHB' in e) J.payTHB(e.payTHB);
    else if ('cash' in e) { for (const [k, n] of Object.entries(e.cash)) S[k] += n; }
    else if ('know' in e) J.learn(e.know);
    else if ('flag' in e) { if (e.set === 0) delete S.flags[e.flag]; else S.flags[e.flag] = e.set ?? 1; }
    else if ('set' in e) {
      for (const [k, v] of Object.entries(e.set)) {
        if (!SETTABLE.includes(k)) throw new Error('不能用 set 改的欄位：' + k);
        S[k] = v;
      }
    } else if ('time' in e) J.advance(e.time, e);
    else if ('until' in e) J.until(e.until);
    else if ('sleep' in e) J.sleep(e.sleep);
    else if ('unlock' in e) J.unlock(e.unlock);
    else if ('stamp' in e) S.stamps.push({ ...e.stamp, d: S.day });
    else if ('save' in e) J.save(e.save, `${dateStr(S.day, true)} ${e.label}`);
    else if ('diary' in e) J.writeDiary(e.diary);
    else if ('famMsg' in e) J.pushMsg(e.famMsg);
    else if ('toast' in e) J.toast(e.toast);
    else if ('flash' in e) J.flash.push({ kind: e.kind || 'p', text: fill(e.flash, J) });
    else if ('end' in e) J.end(e.end);
    else if ('do' in e) {
      if (!actions[e.do]) throw new Error('沒有這個動作：' + e.do);
      actions[e.do](J, e);
    } else throw new Error('未知的效果寫法：' + JSON.stringify(e));
  }
}

/** 列出條件和效果裡用到的旅行知識（給資料檢查用） */
export function knowIn(x, out = new Set()) {
  if (Array.isArray(x)) x.forEach((c) => knowIn(c, out));
  else if (x && typeof x === 'object') {
    for (const k of ['know', 'noKnow']) if (typeof x[k] === 'string') out.add(x[k]);
    for (const v of Object.values(x)) if (v && typeof v === 'object') knowIn(v, out);
  }
  return out;
}
