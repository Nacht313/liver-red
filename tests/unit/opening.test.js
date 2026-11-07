// 開幕的資料檢查和自動試玩：每條路線都要能走到底。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../../src/story/opening/data.js';
import story from '../../src/story/opening/index.js';
import { knowIn } from '../../src/game/journey/rules.js';
import { cabinKg } from '../../src/game/journey/bag.js';
import { newRun, toPrep, book, waitToDeparture, memStorage } from './helpers/play.js';

// ---------- 資料 ----------
test('資料表和劇情節點都是純資料（可以直接轉成 JSON，給 Godot 用）', () => {
  for (const [name, v] of Object.entries(data)) assert.deepEqual(JSON.parse(JSON.stringify(v)), v, `data.${name}`);
  assert.deepEqual(JSON.parse(JSON.stringify(story.nodes)), story.nodes);
});

test('節點的 goto 都指到存在的節點或畫面', () => {
  const ids = new Set([...Object.keys(story.nodes), ...Object.keys(story.screens)]);
  for (const [id, n] of Object.entries(story.nodes)) {
    for (const c of n.choices || []) {
      if (c.goto) assert.ok(ids.has(c.goto), `${id} → ${c.goto}`);
      const ends = (c.effects || []).filter((e) => e.end);
      assert.ok(c.goto || ends.length, `${id} 的「${c.text}」沒有 goto 也沒有結局`);
    }
  }
});

test('節點用到的旅行知識、結局、動作都有定義', () => {
  for (const [id, n] of Object.entries(story.nodes)) {
    for (const k of knowIn(n)) assert.ok(data.KNOW[k], `${id} 用到不存在的知識 ${k}`);
    const fx = [...(n.onEnter || []), ...(n.choices || []).flatMap((c) => c.effects || [])];
    for (const e of fx) {
      if (e.end) assert.ok(data.ENDINGS[e.end], `${id} 的結局 ${e.end}`);
      if (e.do) assert.ok(story.actions[e.do], `${id} 的動作 ${e.do}`);
    }
  }
  for (const r of data.RESEARCH) for (const k of r.k) assert.ok(data.KNOW[k], `${r.id} → ${k}`);
});

test('物品的重量體積合理，預設打包放得下', () => {
  for (const [id, it] of Object.entries(data.ITEMS)) assert.ok(it.kg > 0 && it.kg < 3 && it.L > 0, id);
  for (const l of Object.values(data.DEFAULT_PACK)) assert.ok(data.LAYERS[l]);
});

// ---------- 試玩 ----------
test('全服務航空：準備、出發、入境、走出機場、進市區', () => {
  const run = newRun();
  const { J, pick, F } = run;
  toPrep(run);
  assert.equal(J.S.card, 50000);
  pick('上網查資料'); pick('泰國入境規定'); pick('返回');
  assert.ok(J.S.know.includes('k_funds'));
  book(run, 'fsc');
  pick('訂住宿'); pick('青旅'); pick('3 晚');
  pick('去銀行'); pick('換 ¥1,000');
  waitToDeparture(run);
  assert.equal(J.S.day, J.S.dep); assert.ok(J.S.tdac);
  pick('出發'); pick('出門');
  assert.equal(F.cur.id, 'airport');
  pick('過邊檢'); pick('旅遊'); pick('登機');
  assert.equal(J.S.place, '飛機上');
  pick('下飛機');
  pick(F.options()[0].text);
  assert.equal(F.cur.id, 'stamp');
  assert.equal(J.S.stamps.map((s) => s.c).join(), '中國,泰國');
  assert.ok(run.storage.m.zgh_stamp, '入境章存檔了');
  pick('走出');
  pick('官方計程車'); pick('抵達');
  assert.equal(F.cur.id, 'city');
  assert.match(run.text(), /你終於到了/);
});

test('廉航沒加購托運、背包太重：在機場丟東西，學到 7 公斤', () => {
  const run = newRun();
  const { J, pick, F } = run;
  toPrep(run);
  book(run, 'lcc');
  pick('整理背包'); pick('一鍵預設'); pick('完成');
  waitToDeparture(run);
  pick('出發'); pick('出門');
  assert.ok(cabinKg(J.S) > 7);
  assert.match(run.text(), /手提行李只能 7 公斤/);
  pick('丟掉');
  assert.ok(cabinKg(J.S) <= 7);
  assert.ok(J.S.know.includes('k_lcc'));
  assert.ok(Object.values(J.S.items).includes('lost'));
  assert.equal(F.cur.id, 'airport');
  pick('過邊檢');
});

test('行動電源放托運會被廣播叫去拿出來', () => {
  const run = newRun();
  const { J, pick } = run;
  toPrep(run);
  J.S.items.pbank = 'top';
  book(run, 'fsc');
  waitToDeparture(run);
  pick('出發'); pick('出門');
  assert.match(run.text(), /行動電源/);
  pick('安檢處');
  assert.ok(J.S.know.includes('k_pbank'));
  assert.notEqual(J.S.items.pbank, 'top');
});

test('陸路沒有寮國電子簽：在磨丁被退回，改搭飛機', () => {
  const run = newRun();
  const { J, pick, F } = run;
  toPrep(run);
  book(run, 'land');
  waitToDeparture(run);
  pick('出發'); pick('出門');
  pick('快捷酒店');
  assert.equal(F.cur.id, 'land.border');
  assert.match(run.text(), /根本沒申請/);
  pick('改買機票');
  assert.equal(J.S.trans, 'fsc');
  assert.ok(J.S.know.includes('k_land'));
  assert.equal(F.cur.id, 'airport');
});

test('陸路有電子簽：寮國、萬象、夜車、廊開入境，到中央車站', () => {
  const run = newRun();
  const { J, pick, F } = run;
  toPrep(run);
  book(run, 'land');
  waitToDeparture(run, { laos: true });
  pick('出發'); pick('出門'); pick('椅子');
  pick('蓋章'); pick('抵達萬象'); pick('小旅館'); pick('下車排隊');
  assert.equal(F.cur.id, 'imm');
  pick(F.options()[0].text);
  assert.equal(J.S.stamps.map((s) => s.c).join(), '中國,寮國,泰國');
  pick('走出'); pick('回到車上'); pick('睡到曼谷');
  assert.match(J.S.place, /中央車站/);
});

test('沒填 TDAC、被抽查資金、膽識和英語都不夠：入境被拒', () => {
  const run = newRun({ rand: 0.1 });
  const { J, pick, F } = run;
  toPrep(run);
  book(run, 'fsc');
  waitToDeparture(run, { fillTdac: false });
  pick('出發'); pick('出門'); pick('過邊檢'); pick('旅遊'); pick('登機'); pick('下飛機');
  assert.match(run.text(), /TDAC/);
  pick('自助機');
  assert.match(run.text(), /Ten thousand baht/);
  pick('解釋');
  assert.equal(F.cur.id, '@end');
  assert.equal(J.S.ending, 'refused');
  assert.ok(J.S.know.includes('k_funds'));
});

test('沙發衝浪找 Jay，到了機場去 6 號門：壞結局，只能回入境章', () => {
  const run = newRun();
  const { J, pick, F, can } = run;
  toPrep(run);
  book(run, 'fsc');
  pick('訂住宿'); pick('沙發衝浪'); pick('Jay');
  assert.equal(J.S.cs, 'jay');
  waitToDeparture(run);
  pick('出發'); pick('出門'); pick('過邊檢'); pick('旅遊'); pick('登機'); pick('下飛機');
  pick(F.options()[0].text); pick('走出'); pick('看手機');
  pick('6 號門');
  assert.equal(J.S.ending, 'cs');
  assert.ok(!can('回到日記'));
  pick('回到入境章');
  assert.equal(F.cur.id, 'curb');
  assert.equal(J.S.over, false);
});

test('錯過出發日：票作廢', () => {
  const run = newRun();
  const { J, pick } = run;
  toPrep(run);
  book(run, 'fsc');
  for (let i = 0; i < 60 && !J.S.flags.missed; i++) pick(run.can('睡覺') ? '睡覺' : '休息');
  assert.ok(J.S.flags.missed);
  assert.equal(J.S.trans, null);
});

test('錢不夠時不能換匯；有錢時銀行晚上關門', () => {
  const run = newRun();
  const { pick, can } = run;
  toPrep(run, '10,000');
  assert.ok(can('去銀行'));
  pick('休息'); pick('休息'); pick('休息');
  assert.ok(!can('去銀行'));
});

test('讀取日記會回到家裡的大廳', () => {
  const storage = memStorage();
  const run = newRun({ storage });
  toPrep(run);
  while (!run.can('睡覺')) run.pick('休息');
  run.pick('睡覺');
  const run2 = newRun({ storage });
  run2.pick('讀取日記');
  assert.equal(run2.F.cur.id, 'prep');
  assert.match(run2.text(), /翻開日記/);
});
