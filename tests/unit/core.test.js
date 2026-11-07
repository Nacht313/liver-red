import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockText, mixHex, inRange, rng } from '../../src/core/util.js';
import { check } from '../../src/game/conditions.js';
import { tokenize, norm, guessOptions } from '../../src/game/language.js';

test('時鐘', () => {
  assert.equal(clockText(19 * 60 + 30, 0), '19:30');
  assert.equal(clockText(19 * 60 + 30, 68), '20:38');
  assert.equal(clockText(23 * 60 + 50, 20), '00:10');
});

test('顏色混合', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#102030', '#102030', 0.3), '#102030');
});

test('區間', () => {
  assert.ok(inRange(5, { gte: 5, lt: 6 }));
  assert.ok(!inRange(6, { gte: 5, lt: 6 }));
});

test('固定種子亂數可重現', () => {
  const a = rng(7), b = rng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('條件組合', () => {
  const S = { words: { merhaba: 1 }, flags: { food: 1 }, t: 50, money: 20, bat: 10, en: 30 };
  assert.ok(check({ word: 'merhaba' }, S));
  assert.ok(check([{ flag: 'food' }, { t: { gte: 40 } }], S));
  assert.ok(!check({ all: [{ flag: 'food' }, { money: { gte: 25 } }] }, S));
  assert.ok(check({ any: [{ noFlag: 'food' }, { bat: { lt: 15 } }] }, S));
  assert.ok(check({ not: { word: 'hayır' } }, S));
  assert.throws(() => check({ typo: 1 }, S));
});

test('土耳其語大小寫正規化', () => {
  assert.equal(norm('İstavrit'), 'istavrit');
  assert.equal(norm('HAYIR'), 'hayır');
});

test('對話切片：已學會、未學會、未登記', () => {
  const dict = { merhaba: '你好', simit: '芝麻圈麵包' };
  const segs = tokenize('「[[Merhaba]]! [[Simit]]? [[Taze]]!」', dict, { merhaba: 1 });
  assert.deepEqual(segs.map((s) => s.text), ['「', 'Merhaba', '! ', 'Simit', '? ', 'Taze', '!」']);
  assert.equal(segs[1].known, true);
  assert.equal(segs[3].known, false);
  assert.equal(segs[3].meaning, '芝麻圈麵包');
  assert.equal(segs[5].word, undefined, '沒登記的字當普通文字');
});

test('猜字選項包含正確答案、不重複', () => {
  const dict = { a: '一', b: '二', c: '三', d: '四' };
  for (let i = 0; i < 20; i++) {
    const o = guessOptions(dict, 'a');
    assert.equal(o.length, 3);
    assert.ok(o.includes('一'));
    assert.equal(new Set(o).size, 3);
  }
});
