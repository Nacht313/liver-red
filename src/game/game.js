// 遊戲邏輯核心：狀態、時間、spot、互動卡。不碰 DOM、不碰 canvas，所以可以在 Node 裡完整測試。
// 畫面和介面透過 hooks 跟它溝通（toast、log、拍照截圖、渡輪在不在畫面裡）。

import { clamp, clockText } from '../core/util.js';
import { check } from './conditions.js';

export const SPOT_STATE_LABEL = { hidden: '未出現', unseen: '未發現', seen: '已看到', done: '已互動' };
export const SUMMARY = '@summary';
const NEAR = 26;         // 離 spot 多近會出現互動提示（場景像素）
const WALK_SPEED = 62;   // 場景像素／秒

export class Game {
  /**
   * @param {object} scene 場景資料（見 src/scenes/galata/index.js）
   * @param {object} [hooks] { toast(msg), change(), capture(kind) → {src, ferryIn}, random() }
   */
  constructor(scene, hooks = {}) {
    this.scene = scene;
    this.hooks = { toast() {}, change() {}, capture: () => ({ src: '', ferryIn: false }), random: Math.random, ...hooks };
    this.spots = Object.fromEntries(scene.spots.map((s) => [s.id, s]));
    this.reset();
  }

  reset() {
    const s = this.scene.start;
    this.S = {
      x: s.x, tx: null, dir: 1, t: 0, money: s.money, bat: s.bat, en: s.en,
      words: {}, photos: [], flags: {}, st: {}, log: [], mem: 0, ended: false,
    };
    this.queue = [];
    this.card = null;     // 目前打開的卡片 id
    this.walkHold = 0;    // 按住方向鍵：-1 / 0 / 1
  }

  // ---------- 小工具 ----------
  clock(t = this.S.t) { return clockText(this.scene.time.startMin, t); }
  log(msg) { this.S.log.push(`${this.clock()} ${msg}`); this.hooks.change(); }
  toast(msg) { this.hooks.toast(msg); }
  get isOpen() { return this.card != null; }
  ok(cond) { return check(cond, this.S, (id) => this.stateOf(this.spots[id])); }

  learn(word, how) {
    if (this.S.words[word]) return;
    this.S.words[word] = 1;
    this.toast(`記下單字：${word}（${this.scene.words[word]}）`);
    this.log(`學會 ${word}${how ? `（${how}）` : ''}`);
  }

  // ---------- spot 狀態 ----------
  stateOf(spot) {
    const S = this.S;
    if (!this.ok(spot.visibleIf) && !S.st[spot.id]) return 'hidden';
    return S.st[spot.id] || (S.flags['saw_' + spot.id] ? 'seen' : 'unseen');
  }

  /** 玩家旁邊可以按 E 互動的 spot */
  nearSpot() {
    let best = null, bd = NEAR;
    for (const s of this.scene.spots) {
      if (s.x == null || s.trigger.kind !== 'interact' || this.stateOf(s) === 'hidden') continue;
      const d = Math.abs(this.S.x - s.x);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /** 走進發現距離內的 spot 標記為「已看到」，回傳新發現的 spot */
  discover() {
    const found = [];
    for (const s of this.scene.spots) {
      if (s.x == null || s.trigger.kind !== 'interact') continue;
      if (this.stateOf(s) === 'unseen' && Math.abs(this.S.x - s.x) < s.reveal) {
        this.S.flags['saw_' + s.id] = 1;
        found.push(s);
      }
    }
    if (found.length) this.hooks.change();
    return found;
  }

  // ---------- 時間 ----------
  advance(min) {
    const S = this.S, before = S.t;
    S.t += min;
    for (const s of this.scene.spots) {
      if (s.trigger.kind === 'time' && before < s.trigger.at && S.t >= s.trigger.at && this.ok(s.visibleIf)) this.trigger(s.id);
    }
    if (S.t >= this.scene.time.end && !S.ended) { S.t = this.scene.time.end; this.openCard(SUMMARY, true); }
    if (Math.floor(before) !== Math.floor(S.t)) this.hooks.change();
  }

  /** 每一幀呼叫：處理走路、經過觸發、發現 */
  step(dt) {
    const S = this.S;
    if (this.isOpen || S.ended) return;
    let v = this.walkHold;
    if (!v && S.tx != null) {
      const d = S.tx - S.x;
      if (Math.abs(d) < 1.5) { S.x = S.tx; S.tx = null; } else v = Math.sign(d);
    }
    if (!v) return;
    const old = S.x, W = this.scene.world.width;
    S.dir = v;
    S.x = clamp(S.x + v * WALK_SPEED * dt, 20, W - 20);
    const moved = Math.abs(S.x - old);
    S.en = clamp(S.en - moved / 400, 0, 100);
    this.advance((moved / W) * this.scene.time.crossMinutes);
    for (const s of this.scene.spots) {
      if (s.trigger.kind !== 'pass' || !this.ok(s.visibleIf)) continue;
      const crossed = s.trigger.dir > 0 ? old < s.x && S.x >= s.x : old > s.x && S.x <= s.x;
      if (crossed) { S.tx = null; this.walkHold = 0; this.trigger(s.id); break; }
    }
    this.discover();
  }

  /** 點畫面：走到某個位置；點到 spot 就走到 spot 正下方 */
  walkTo(wx) {
    const S = this.S, W = this.scene.world.width;
    const hit = this.scene.spots.find((s) => s.x != null && s.trigger.kind === 'interact' && this.stateOf(s) !== 'hidden'
      && Math.abs(wx - s.x) < 16 && (Math.abs(S.x - s.x) <= s.reveal || S.st[s.id] || S.flags['saw_' + s.id]));
    S.tx = hit ? hit.x : clamp(wx, 20, W - 20);
  }

  wait(min) {
    if (this.isOpen || this.S.ended) return;
    this.advance(min);
    this.S.en = clamp(this.S.en + 2, 0, 100);
    this.log(`站著等了 ${min} 分鐘`);
  }

  // ---------- 觸發與卡片 ----------
  /** 按 E：跟旁邊的 spot 互動 */
  interact() {
    if (this.isOpen || this.S.ended) return false;
    const s = this.nearSpot();
    if (!s) return false;
    this.S.tx = null; this.walkHold = 0;
    this.trigger(s.id);
    return true;
  }

  trigger(id, force = false) {
    const s = this.spots[id];
    if (!s) throw new Error('沒有這個 spot：' + id);
    if (this.isOpen && !force) { if (!this.queue.includes(id)) this.queue.push(id); return; }
    if (this.S.st[id] !== 'done') this.S.st[id] = 'seen';
    this.applyEffects(s.onOpen);
    if (s.doneOn !== 'effect') this.S.st[id] = 'done';
    this.openCard(s.start, force);
  }

  openCard(id, force = false) {
    if (id === SUMMARY) { this.S.ended = true; this.log('結束場景'); }
    const c = this.scene.cards[id];
    if (id !== SUMMARY && !c) throw new Error('沒有這張卡：' + id);
    this.card = id;
    if (c) this.applyEffects(c.onEnter);
    this.hooks.change();
  }

  close() {
    this.card = null;
    this.hooks.change();
    if (this.queue.length && !this.S.ended) this.trigger(this.queue.shift());
  }

  /** 選項為什麼不能選；可以選回傳空字串 */
  whyDisabled(choice) {
    if (choice.req && !this.ok(choice.req)) return choice.reqText || '條件不足';
    const c = choice.cost;
    if (c?.money && this.S.money < c.money) return '錢不夠';
    if (c?.bat && this.S.bat < c.bat) return '手機沒電了';
    return '';
  }

  /** 目前卡片的畫面資料（介面只負責把它畫出來） */
  view() {
    if (this.card == null) return null;
    if (this.card === SUMMARY) return this.summaryView();
    const c = this.scene.cards[this.card];
    return {
      id: this.card, title: c.title, tag: c.tag, out: c.out, bad: !!c.bad,
      body: (c.body || []).filter((b) => this.ok(b.when)).map((b) => ('say' in b ? { kind: 'say', text: b.say } : { kind: 'p', text: b.p })),
      choices: (c.choices || []).map((ch) => ({ text: ch.text, cost: ch.cost, why: this.whyDisabled(ch) })),
      dismissible: c.tag !== '事件',
    };
  }

  summaryView() {
    const S = this.S, sc = this.scene;
    const done = sc.spots.filter((s) => S.st[s.id] === 'done').length;
    return {
      id: SUMMARY, title: '這一晚', tag: '結算', out: `${this.clock()} 離開${sc.name}。`, bad: false,
      body: [
        { kind: 'p', text: `花了 ₺${sc.start.money - S.money}，電量剩 ${Math.round(S.bat)}%，精力 ${Math.round(S.en)}。學會 ${Object.keys(S.words).length}／${Object.keys(sc.words).length} 個單字，拍了 ${S.photos.length} 張照片。回憶值 ${S.mem}。` },
        { kind: 'p', text: `互動過 ${done}／${sc.spots.length} 個 spot。` },
      ],
      choices: [{ text: '重新開始', why: '' }, { text: '留在這個畫面', why: '' }],
      dismissible: true,
    };
  }

  /** 選第 i 個選項 */
  choose(i) {
    if (this.card === SUMMARY) { if (i === 0) this.reset(); this.card = null; this.hooks.change(); return; }
    const c = this.scene.cards[this.card];
    const ch = c?.choices?.[i];
    if (!ch || this.whyDisabled(ch)) return;
    const cur = this.card;
    this.pay(ch.cost);
    this.applyEffects(ch.effects);
    if (this.card !== cur) return; // 付費花掉的時間讓場景結束了，已經跳到結算
    let next = ch.goto;
    if (ch.random) next = this.hooks.random() < ch.random.p ? ch.random.then : ch.random.else;
    if (next) this.openCard(next); else this.close();
  }

  pay(cost) {
    if (!cost) return;
    const S = this.S;
    if (cost.money) S.money -= cost.money;
    if (cost.bat) S.bat = clamp(S.bat - cost.bat, 0, 100);
    if (cost.en) S.en = clamp(S.en + cost.en, 0, 100);
    if (cost.min) this.advance(cost.min);
  }

  // ---------- 效果 ----------
  //   { learn: 'balık', how: '邊吃邊懂了' }  學會單字
  //   { flag: 'food', set: 1 }              設定旗標（set 預設 1；0 代表清除）
  //   { mem: 2 }                            回憶值
  //   { log: '...' } { toast: '...' }
  //   { done: 'shoe' }                      把 spot 標成已互動
  //   { photo: { name, kind } }             拍照（截圖 + 依光線評分）
  applyEffects(list) {
    if (!list) return;
    const S = this.S;
    for (const e of list) {
      if ('learn' in e) this.learn(e.learn, e.how);
      else if ('flag' in e) { if (e.set === 0) delete S.flags[e.flag]; else S.flags[e.flag] = e.set ?? 1; }
      else if ('mem' in e) S.mem += e.mem;
      else if ('log' in e) this.log(e.log);
      else if ('toast' in e) this.toast(e.toast);
      else if ('done' in e) S.st[e.done] = 'done';
      else if ('photo' in e) this.photo(e.photo);
      else throw new Error('未知的效果寫法：' + JSON.stringify(e));
    }
  }

  photo({ name, kind }) {
    const shot = this.hooks.capture(kind) || {};
    const light = photoLightScore(this.S.t, this.scene.time.sunset, kind);
    const score = clamp(Math.round(light + (shot.ferryIn ? 8 : 0) + (this.hooks.random() * 8 - 4)), 20, 99);
    this.S.photos.push({ src: shot.src || '', name, time: this.clock(), score });
    this.S.mem += score >= 85 ? 3 : 1;
    this.log(`拍了${name}，${score} 分${shot.ferryIn ? '（渡輪入鏡）' : ''}`);
    this.toast(`拍好了：${score} 分${shot.ferryIn ? '，渡輪剛好入鏡' : ''}`);
  }
}

/** 照片的光線分數：日落前後最高，正午般的平光和全黑最低 */
export function photoLightScore(t, sunset, kind = 'view') {
  if (kind === 'portrait') return 72;
  const d = t - sunset;
  if (d < -28) return 48;
  if (d < -13) return 70;
  if (d < 6) return 90;
  if (d < 30) return 82;
  if (d < 42) return 66;
  return 52;
}
