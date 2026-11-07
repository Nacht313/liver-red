// 文字場景的流程：目前在哪個節點、畫面要顯示什麼、選了選項之後去哪裡。
//
// 節點有兩種，產生的畫面資料格式一樣：
//   1. 資料節點（story.nodes）：純資料，策劃寫的劇情。
//   2. 程式畫面（story.screens）：清單類的畫面（查資料、網購、訂票…），由資料表產生選項。
//      { enter?(J, arg, flow), view(J, arg, flow) }，view 不能改狀態（會被重畫很多次）。
//
// 畫面資料（view）：
//   { id, img, o, place, blocks: [{ kind, text, from? }], choices: [{ text, ico, x, why } | { grp } | { gap }] }
//   kind：title、story（旁白）、p、sys（系統說明）、say（對白）、note（框起來的資訊）、good、warn、bad、msg、check、pack

import { test, apply, fill } from './rules.js';
import { tod } from './time.js';

export const END = '@end';

export class Flow {
  /**
   * @param {import('./journey.js').Journey} J
   * @param {{nodes:object, screens:object, actions:object}} story
   */
  constructor(J, story) {
    this.J = J; this.story = story;
    this.cur = null;        // { id, arg }
    this.node = null;       // 目前節點（已展開）
    this.top = [];          // 這個畫面最上面的結果文字
    J.flash = [];           // 帶到下一個畫面最上面的文字區塊（上一個動作的結果）
  }

  /** 跳到某個節點。資料節點的 onEnter、程式畫面的 enter 只在進入時執行一次 */
  go(id, arg) {
    const J = this.J, { nodes, screens, actions } = this.story;
    if (J.S?.over && id !== END) id = END;
    this.cur = { id, arg };
    const n = nodes[id];
    if (n) {
      if (n.place) J.S.place = n.place;
      if (n.zone) J.S.zone = n.zone;
      if (n.loc) J.S.loc = n.loc;
      if (n.resume) J.S.resume = n.resume;
      apply(n.onEnter, J, actions);
    } else if (screens[id]) screens[id].enter?.(J, arg, this);
    else throw new Error('沒有這個節點：' + id);
    if (J.S?.over && id !== END) return this.go(END);
    this.refresh(true);
    J.hooks.change();
  }

  /**
   * 重新產生目前畫面（例如在側欄改了背包）。
   * first：剛進入節點，把上一個動作留下的結果文字放到最上面；之後的重畫保留同一段。
   */
  refresh(first = false) {
    const J = this.J, { id, arg } = this.cur, n = this.story.nodes[id];
    if (first) { this.top = J.flash; J.flash = []; }
    const raw = n ? this.expand(n) : this.story.screens[id].view(J, arg, this);
    this.node = {
      id, img: raw.img || 'dark', o: { tod: J.S ? tod(J.S.h) : 'night', ...(raw.o || {}) },
      place: J.S?.place, blocks: [...this.top, ...raw.blocks], choices: raw.choices,
    };
  }

  /** 資料節點 → 畫面資料 */
  expand(n) {
    const J = this.J;
    const blocks = (n.body || []).filter((b) => test(b.when, J)).map((b) => {
      const kind = Object.keys(b).find((k) => k !== 'when' && k !== 'from');
      return { kind, text: fill(b[kind], J), from: b.from };
    });
    const choices = (n.choices || []).filter((c) => test(c.when, J)).map((c) => {
      if (c.grp || c.gap) return c;
      return { ...c, text: fill(c.text, J), x: c.x ? fill(c.x, J) : '', why: test(c.req, J) ? '' : (c.reqText || '條件不足') };
    });
    return { img: n.img, o: n.o, blocks, choices };
  }

  view() { return this.node; }

  /** 可以選的選項（不含分組標題和空行），編號從 0 開始 */
  options() { return this.node.choices.filter((c) => !c.grp && !c.gap); }

  choose(i) {
    const c = this.options()[i];
    if (!c || c.why) return false;
    const J = this.J;
    if (c.fn) {
      c.fn(J, this);
      if (J.S?.over && this.cur.id !== END) this.go(END);
      return true;
    }
    apply(c.effects, J, this.story.actions);
    if (J.S?.over) { this.go(END); return true; }
    let next = c.goto;
    if (c.random) next = J.rand() < c.random.p ? c.random.then : c.random.else;
    if (next) this.go(next, c.arg);
    else { this.refresh(); J.hooks.change(); }
    return true;
  }

  /** 介面元件呼叫章節動作（例如背包選單改位置），然後重畫 */
  act(name, args = {}) {
    apply([{ do: name, ...args }], this.J, this.story.actions);
    this.refresh();
    this.J.hooks.change();
  }
}
