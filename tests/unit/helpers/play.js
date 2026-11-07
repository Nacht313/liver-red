// 測試用：在 Node 裡照玩家的方式玩開幕。
import { Journey } from '../../../src/game/journey/journey.js';
import { Flow } from '../../../src/game/journey/flow.js';
import story from '../../../src/story/opening/index.js';

export function memStorage() {
  const m = {};
  return { get: (k) => m[k] ?? null, set: (k, v) => { if (v === 'null') delete m[k]; else m[k] = v; }, m };
}

/** 建一局。rand 可以是固定數字或函式 */
export function newRun({ rand = 0.9, storage = memStorage() } = {}) {
  const random = typeof rand === 'function' ? rand : () => rand;
  const toasts = [];
  const J = new Journey({ random, storage, toast: (m) => toasts.push(m) });
  const F = new Flow(J, story);
  F.go('title');
  const opts = () => F.options();
  const pick = (text) => {
    const o = opts(), i = o.findIndex((c) => c.text.includes(text));
    if (i < 0) throw new Error(`[${F.cur.id}] 找不到選項「${text}」：${o.map((c) => c.text).join(' / ')}`);
    if (o[i].why) throw new Error(`[${F.cur.id}] 選項「${text}」不能選：${o[i].why}`);
    F.choose(i);
  };
  const can = (text) => opts().some((c) => c.text.includes(text) && !c.why);
  const text = () => F.view().blocks.map((b) => b.text || '').join('\n');
  return { J, F, pick, can, text, toasts, storage };
}

/** 從標題玩到出發前大廳，選好第一站 */
export function toPrep(run, funds = '50,000') {
  const { pick } = run;
  for (const s of ['新的旅程', '走出房間', funds, '睡覺', '選第一站', '曼谷']) pick(s);
}

/** 訂交通（五天後出發）；bag：廉航時一起加購托運 */
export function book(run, trans, { bag = false } = {}) {
  const names = { fsc: '全服務', lcc: '廉航直飛', red: '紅眼', tra: '轉機', land: '陸路' };
  run.pick('訂交通'); run.pick(names[trans]); run.pick(bag ? '托運' : '五天後');
}

/** 一直休息和睡覺到出發日；途中在可以填的時候填 TDAC（fillTdac）、申請寮國電子簽（laos） */
export function waitToDeparture(run, { fillTdac = true, laos = false } = {}) {
  const { J, pick, can } = run;
  if (laos) { pick('辦出國'); pick('寮國'); pick('返回'); }
  for (let guard = 0; guard < 40 && J.S.day < J.S.dep; guard++) {
    if (fillTdac && !J.S.tdac && can('辦出國')) {
      pick('辦出國');
      if (can('TDAC')) { pick('TDAC'); pick(run.F.options()[0].text); }
      if (run.F.cur.id === 'errand') pick('返回');
    }
    if (can('睡覺')) pick('睡覺'); else pick('休息');
  }
  if (fillTdac && !J.S.tdac && can('辦出國')) { pick('辦出國'); if (can('TDAC')) { pick('TDAC'); pick(run.F.options()[0].text); } if (run.F.cur.id === 'errand') pick('返回'); }
}
