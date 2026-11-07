// 旅程的狀態和規則：時間流逝、數值、上限鎖、錢、旅行知識、睡覺、存檔、結局。
// 不碰 DOM，Node 測試可以直接用。畫面透過 hooks 溝通。
//
// hooks：
//   change()            狀態變了，介面要重畫
//   toast(msg)          跳提示
//   random()            亂數（測試時可以固定）
//   storage             { get(key), set(key, value) }，瀏覽器用 localStorage，測試用記憶體

import { clamp } from '../../core/util.js';
import { ITEMS, KNOW, FX, FAMILY_MSGS, ENDINGS } from '../../story/opening/data.js';
import { carried, weightFactor } from './bag.js';
import { dateStr } from './time.js';

export const STAT_NAMES = { energy: '精力', food: '飽食', faith: '信念' };
const LOCK_FLOOR = 50;         // 鎖住的上限最低 50（設計摘要）
const STOCK_LOCK_FLOOR = 1;    // 例外：股票虧損的鎖最低到 1（2026-11-07 定案）
const SAVE_KEYS = { meta: 'zgh_meta', diary: 'zgh_diary', stamp: 'zgh_stamp' };

const memoryStorage = () => { const m = {}; return { get: (k) => m[k] ?? null, set: (k, v) => { m[k] = v; } }; };
const copy = (o) => JSON.parse(JSON.stringify(o));

export function freshState(meta = { know: [] }) {
  const items = {};
  for (const [k, it] of Object.entries(ITEMS)) if (it.own) items[k] = it.must ? (k === 'passport' ? 'day' : 'pocket') : 'home';
  return {
    day: 0, h: 22, place: '家', zone: 'home', loc: 'home',
    card: 0, cny: 500, thb: 0, usd: 0, start: 0, tier: 0,
    energy: 70, food: 70, faith: 55, battery: 80, hyg: 85, family: 10,
    locks: [], attr: { 學識: 1, 膽識: 1, 手藝: 1, 共情: 1, 魅力: 1 }, eng: 2,
    items, orders: [], know: [...meta.know], researched: [], rToday: 0,
    dest: null, trans: null, dep: null, depMul: 1, extraBag: false,
    stay: null, cs: null, csTried: {}, refs: 0,
    tdac: false, tdacAddr: null, ins: false, esim: false, laosVisa: null,
    stamps: [], entry: null, msgs: [], diary: [],
    thoughts: [{ n: '一個籠子在尋找一隻鳥', need: 3, got: 0, eff: '消化完成後：膽識 +1。你開始相信自己的選擇。' }],
    flags: {}, over: false, ending: null, resume: 'prep',
  };
}

export class Journey {
  constructor(hooks = {}) {
    this.hooks = { change() {}, toast() {}, random: Math.random, storage: memoryStorage(), ...hooks };
    this.meta = this.read('meta') || { know: [] };
    this.S = null;
  }

  // ---------- 存檔 ----------
  read(slot) {
    try { return JSON.parse(this.hooks.storage.get(SAVE_KEYS[slot]) || 'null'); } catch { return null; }
  }
  write(slot, value) {
    try { this.hooks.storage.set(SAVE_KEYS[slot], JSON.stringify(value)); } catch { /* 無痕模式等情況存不了，遊戲照常進行 */ }
  }
  save(slot, label) { this.write(slot, { label, s: copy(this.S) }); }
  slot(slot) { return this.read(slot); }

  /** 讀檔：回到存檔當時的狀態，旅行知識用目前記得的（知識跨輪保留） */
  load(slot) {
    const sv = this.read(slot);
    if (!sv) return false;
    this.S = copy(sv.s);
    this.S.over = false; this.S.ending = null;
    for (const k of this.meta.know) if (!this.S.know.includes(k)) this.S.know.push(k);
    return true;
  }

  clearAll() {
    this.meta = { know: [] };
    for (const s of ['meta', 'diary', 'stamp']) this.write(s, null);
  }

  newGame() { this.S = freshState(this.meta); return this.S; }

  // ---------- 小工具 ----------
  get rand() { return this.hooks.random; }
  toast(m) { this.hooks.toast(m); }
  has(id) { return carried(this.S, id); }
  date(short) { return dateStr(this.S.day, short); }

  // ---------- 數值與上限鎖 ----------
  cap(stat) {
    return Math.min(100, ...this.S.locks.filter((l) => l.stat === stat || l.stat === 'all').map((l) => l.cap));
  }
  add(stat, n) {
    const S = this.S;
    if (stat in STAT_NAMES) S[stat] = clamp(S[stat] + n, 0, this.cap(stat));
    else S[stat] = clamp(S[stat] + n, 0, 100);
  }
  lock(src, stat, capValue, how) {
    const S = this.S;
    if (S.locks.some((l) => l.src === src)) return;
    const floor = src.startsWith('stock') ? STOCK_LOCK_FLOOR : LOCK_FLOOR;
    S.locks.push({ src, stat, cap: Math.max(floor, capValue), how, fresh: 1 });
    for (const k of Object.keys(STAT_NAMES)) S[k] = Math.min(S[k], this.cap(k));
    this.toast(`上限被鎖住了：${how}可以解鎖。`);
  }
  unlock(src) { this.S.locks = this.S.locks.filter((l) => l.src !== src); }

  checkLocks() {
    const S = this.S;
    if (S.family >= 100) this.lock('family', 'faith', 75, '和家人視訊');
    if (S.energy <= 0) return this.end('tired');
    if (S.faith <= 0) return this.end('faith');
  }

  // ---------- 錢 ----------
  money() { const S = this.S; return S.card + S.cny + S.thb / FX.THB + S.usd * FX.USD; }
  cashTHB() { const S = this.S; return S.thb + S.cny * FX.THB + S.usd * FX.USD * FX.THB; }

  /** 付人民幣：先刷卡，不夠再用現金。錢歸零就結束 */
  payCNY(n) {
    const S = this.S;
    if (S.card >= n) S.card -= n; else { S.cny -= n - S.card; S.card = 0; }
    if (this.money() <= 0.5) this.end('money');
  }
  /** 付泰銖：先用泰銖現金，不夠的部分刷卡 */
  payTHB(n) {
    const S = this.S;
    if (S.thb >= n) S.thb -= n;
    else { const rest = n - S.thb; S.thb = 0; this.payCNY(Math.ceil(rest / FX.THB)); }
  }

  // ---------- 旅行知識 ----------
  learn(k) {
    if (!KNOW[k]) throw new Error('沒有這條旅行知識：' + k);
    const S = this.S;
    if (S.know.includes(k)) return false;
    S.know.push(k);
    if (!this.meta.know.includes(k)) { this.meta.know.push(k); this.write('meta', this.meta); }
    this.toast('旅行知識＋1');
    return true;
  }
  knows(k) { return this.S.know.includes(k); }

  // ---------- 時間 ----------
  get hot() { return this.S.loc !== 'home' && this.S.loc !== 'plane'; }

  /**
   * 時間往前走。o：{ sleep, charging, tiring（每小時精力消耗，預設 1.6）, weight（負重影響）, phone（每小時耗電） }
   * 在家裡吃得飽、衛生每天恢復；出門後飽食和衛生會下降。
   */
  advance(hours, o = {}) {
    const S = this.S;
    let left = hours;
    while (left > 1e-9 && !S.over) {
      const st = Math.min(1, left); left -= st;
      if (S.loc === 'home') S.food = Math.max(S.food, Math.min(this.cap('food'), 80));
      else this.add('food', -(o.sleep ? 1 : 2.2) * st);
      if (!o.sleep) {
        const mul = (o.weight ? weightFactor(S) : 1) * (S.hyg < 45 ? 1.2 : 1) * (S.food < 30 ? 1.2 : 1);
        this.add('energy', -(o.tiring || 1.6) * st * mul);
        S.hyg = clamp(S.hyg - (this.hot ? 2.2 : 1.2) * st * (o.tiring ? 1.3 : 1), 0, 100);
      }
      S.battery = clamp(S.battery + (o.charging ? 25 : -(o.phone || 0.8)) * st, 0, 100);
      S.family = clamp(S.family + 0.12 * st + S.msgs.filter((m) => !m.done).length * 0.08 * st, 0, 100);
      S.h += st;
      if (S.h >= 24) { S.h -= 24; S.day++; this.onNewDay(); }
    }
    if (!S.over) this.checkLocks();
  }

  until(h) { if (this.S.h < h) this.advance(h - this.S.h); }

  onNewDay() {
    const S = this.S;
    S.rToday = 0;
    if (S.loc === 'home') S.hyg = 95;
    for (const t of S.thoughts) {
      if (t.got < t.need && ++t.got >= t.need) { S.attr.膽識++; S.flags.thoughtDone = 1; }
    }
    for (const o of S.orders) if (!o.got && S.day >= o.arrive && S.loc === 'home') { o.got = 1; S.items[o.id] = 'home'; }
    if (S.loc === 'home' && S.day >= 4 && !S.flags['nag' + S.day]) { S.flags['nag' + S.day] = 1; S.family = clamp(S.family + 4, 0, 100); }
    if (S.day % 2 === 0) this.pushMsg();
    if (S.entry !== null && S.family < 15 && !S.flags.gift) {
      S.flags.gift = 1; S.card += 300; this.pushMsg(['媽媽', '給你轉了 300 塊，吃好一點。別省。']);
    }
  }

  pushMsg(m) {
    const S = this.S;
    const [from, text] = m || FAMILY_MSGS[S.msgs.length % FAMILY_MSGS.length];
    S.msgs.unshift({ from, text, day: S.day, done: false });
  }

  /** 睡到隔天 07:30。kind 決定睡眠品質：[精力至少恢復到, (保留), 信念變化] */
  sleep(kind) {
    const S = this.S, wake = 7.5;
    const hrs = S.h < wake ? wake - S.h : 24 - S.h + wake;
    this.advance(hrs, { sleep: true, charging: kind !== 'rough' && kind !== 'bench' });
    if (S.over) return;
    const q = { home: [95, 4], hostel: [this.has('plugs') ? 90 : 75, 3], guest: [95, 5], hotel: [100, 8], cs: [92, 6],
      train: [60, 0], rough: [35, -10], bench: [45, -6] }[kind] || [70, 0];
    S.energy = Math.min(this.cap('energy'), Math.max(S.energy, q[0]));
    this.add('faith', q[1]);
    if (kind === 'rough' || kind === 'bench' || kind === 'train') S.hyg = clamp(S.hyg - 10, 0, 100);
  }

  writeDiary(where) {
    const S = this.S;
    S.diary.push({ day: S.day, text: `在${where}寫下了日記。` });
    this.save('diary', `${this.date(true)} ${where}`);
  }

  // ---------- 結局 ----------
  end(kind) {
    const S = this.S;
    if (S.over) return;
    if (!ENDINGS[kind]) throw new Error('沒有這個結局：' + kind);
    S.over = true; S.ending = kind;
  }
}
