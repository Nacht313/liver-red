// 場景資料檢查：改劇情時最容易出的錯（卡片連到不存在的地方、單字沒登記）在這裡抓。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, wordsIn } from '../../src/game/conditions.js';
import { markedWords } from '../../src/game/language.js';
import { SUMMARY } from '../../src/game/game.js';
import galata from '../../src/scenes/galata/index.js';

const scenes = [galata];
const KINDS = new Set(['interact', 'pass', 'time']);
const EFFECT_KEYS = ['learn', 'flag', 'mem', 'log', 'toast', 'done', 'photo'];

for (const sc of scenes) {
  test(`${sc.id}：spot 欄位完整、id 不重複`, () => {
    const ids = new Set();
    for (const s of sc.spots) {
      assert.ok(!ids.has(s.id), `重複的 spot id：${s.id}`); ids.add(s.id);
      assert.ok(KINDS.has(s.trigger?.kind), `${s.id} 的 trigger.kind 不對`);
      assert.ok(sc.cards[s.start], `${s.id} 的 start 卡片不存在：${s.start}`);
      if (s.trigger.kind !== 'time') assert.equal(typeof s.x, 'number', `${s.id} 需要 x`);
      if (s.x != null) assert.ok(s.x >= 0 && s.x <= sc.world.width, `${s.id} 超出世界範圍`);
      assert.ok(s.design?.cond && s.design?.cost && s.design?.reward, `${s.id} 缺少 design 說明`);
    }
  });

  test(`${sc.id}：所有 goto / random 都指到存在的卡片`, () => {
    for (const [id, c] of Object.entries(sc.cards)) {
      for (const ch of c.choices || []) {
        for (const to of [ch.goto, ch.random?.then, ch.random?.else].filter(Boolean)) {
          assert.ok(to === SUMMARY || sc.cards[to], `${id} → ${to} 不存在`);
        }
        assert.ok(ch.text, `${id} 有選項沒有文字`);
      }
    }
  });

  test(`${sc.id}：每張卡都到得了（沒有孤兒卡）`, () => {
    const reach = new Set(sc.spots.map((s) => s.start));
    let grew = true;
    while (grew) {
      grew = false;
      for (const id of [...reach]) for (const ch of sc.cards[id]?.choices || []) {
        for (const to of [ch.goto, ch.random?.then, ch.random?.else]) if (to && to !== SUMMARY && !reach.has(to)) { reach.add(to); grew = true; }
      }
    }
    for (const id of Object.keys(sc.cards)) assert.ok(reach.has(id), `卡片 ${id} 沒有任何地方連過來`);
  });

  test(`${sc.id}：對話裡標記的單字和條件用到的單字都有登記`, () => {
    const used = new Set();
    for (const c of Object.values(sc.cards)) {
      for (const b of c.body || []) markedWords(b.p ?? b.say).forEach((w) => used.add(w));
      if (c.out) markedWords(c.out).forEach((w) => used.add(w));
      for (const ch of c.choices || []) {
        wordsIn(ch.req, used);
        for (const e of [...(ch.effects || [])]) if (e.learn) used.add(e.learn);
      }
    }
    for (const w of used) assert.ok(sc.words[w], `單字 ${w} 沒有登記在 words`);
  });

  test(`${sc.id}：條件和效果的寫法都看得懂`, () => {
    const S = { words: {}, flags: {}, t: 0, money: 0, bat: 0, en: 0 };
    const spotState = () => 'unseen';
    const conds = [];
    for (const s of sc.spots) conds.push(s.visibleIf);
    for (const c of Object.values(sc.cards)) {
      for (const b of c.body || []) conds.push(b.when);
      for (const ch of c.choices || []) conds.push(ch.req);
    }
    for (const cond of conds) assert.doesNotThrow(() => check(cond, S, spotState));
    const effects = [];
    for (const s of sc.spots) effects.push(...(s.onOpen || []));
    for (const c of Object.values(sc.cards)) {
      effects.push(...(c.onEnter || []));
      for (const ch of c.choices || []) effects.push(...(ch.effects || []));
    }
    for (const e of effects) assert.ok(EFFECT_KEYS.some((k) => k in e), '看不懂的效果：' + JSON.stringify(e));
  });
}
