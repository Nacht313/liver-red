import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, SUMMARY, photoLightScore } from '../../src/game/game.js';
import galata from '../../src/scenes/galata/index.js';

const make = (hooks = {}) => new Game(galata, { random: () => 0.1, ...hooks });
const walkTo = (g, x) => { g.S.tx = x; for (let i = 0; i < 4000 && (g.S.tx != null) && !g.isOpen; i++) g.step(0.05); };

test('開局狀態', () => {
  const g = make();
  assert.equal(g.S.x, 40);
  assert.equal(g.S.money, 1200);
  assert.equal(g.clock(), '19:30');
  assert.equal(g.isOpen, false);
});

test('靠近 spot 才會被發現，旁邊才能按 E', () => {
  const g = make();
  assert.equal(g.stateOf(g.spots.simit), 'unseen');
  walkTo(g, 200);
  assert.equal(g.stateOf(g.spots.simit), 'seen', '走進 140 以內應該被發現');
  assert.equal(g.nearSpot(), null);
  walkTo(g, 330);
  assert.equal(g.nearSpot()?.id, 'simit');
  assert.ok(g.interact());
  assert.equal(g.view().title, 'Simit 小販');
});

test('沒學會單字時選項會鎖住並說明原因', () => {
  const g = make();
  g.trigger('simit');
  const v = g.view();
  assert.match(v.choices[0].why, /還不知道怎麼問價錢/);
  g.choose(0); // 鎖住的選項選了不應該有反應
  assert.equal(g.card, 'simit');
});

test('用手機查字：扣電量、學會單字、回到同一張卡', () => {
  const g = make();
  g.trigger('simit');
  g.choose(2);
  assert.equal(g.S.bat, 61);
  assert.ok(g.S.words['kaç para']);
  assert.equal(g.card, 'simit');
  assert.equal(g.view().choices[0].why, '');
  g.choose(0);
  assert.equal(g.card, 'simit.price');
  g.choose(0);
  assert.equal(g.S.money, 1175);
  assert.ok(g.S.flags.food);
  assert.equal(g.isOpen, false);
});

test('錢不夠時不能買', () => {
  const g = make();
  g.S.money = 100;
  g.trigger('boats');
  assert.equal(g.view().choices[0].why, '錢不夠');
});

test('往右經過擦鞋匠會觸發事件，只觸發一次', () => {
  const g = make();
  g.S.x = 800;
  g.walkHold = 1;
  for (let i = 0; i < 200 && !g.isOpen; i++) g.step(0.05);
  assert.equal(g.card, 'shoe');
  g.choose(1); // 不理他
  g.choose(0); // 繼續走
  assert.ok(g.S.flags.shoeDone);
  assert.equal(g.stateOf(g.spots.shoe), 'done');
  g.S.x = 800; g.walkHold = 1;
  for (let i = 0; i < 200; i++) g.step(0.05);
  assert.equal(g.isOpen, false, '第二次經過不應再觸發');
});

test('擦鞋匠：先查手機學 hayır，再拒絕', () => {
  const g = make();
  g.trigger('shoe');
  g.choose(0);
  assert.equal(g.card, 'shoe.polish');
  assert.notEqual(g.view().choices[1].why, '');
  g.choose(2);
  assert.ok(g.S.words['hayır']);
  g.choose(1);
  assert.equal(g.card, 'shoe.refused');
  assert.equal(g.S.money, 1200);
});

test('日落時觸發叫拜；卡片開著時會排隊', () => {
  const g = make();
  g.trigger('mosque');
  g.advance(70);
  assert.equal(g.card, 'mosque', '叫拜要等目前的卡關掉');
  g.choose(2); // 離開
  assert.equal(g.card, 'ezan');
  assert.ok(g.S.flags.ezanDone);
});

test('叫拜時段不能進清真寺', () => {
  const g = make();
  g.S.t = galata.time.sunset + 3;
  g.trigger('mosque');
  assert.match(g.view().choices[1].why, /叫拜/);
});

test('隱藏的貓：有食物且 20:10 之後才出現', () => {
  const g = make();
  assert.equal(g.stateOf(g.spots.cat), 'hidden');
  g.S.flags.food = 1;
  assert.equal(g.stateOf(g.spots.cat), 'hidden');
  g.S.t = 41;
  assert.equal(g.stateOf(g.spots.cat), 'unseen');
});

test('隨機分支用注入的亂數，可重現', () => {
  const g1 = make({ random: () => 0.1 }), g2 = make({ random: () => 0.9 });
  for (const g of [g1, g2]) { g.trigger('fisher'); g.choose(1); }
  assert.equal(g1.card, 'fisher.caught');
  assert.equal(g2.card, 'fisher.nothing');
});

test('時間到 22:00 強制結算', () => {
  const g = make();
  g.advance(200);
  assert.equal(g.S.t, galata.time.end);
  assert.equal(g.card, SUMMARY);
  assert.ok(g.S.ended);
  assert.match(g.view().out, /22:00/);
});

test('拍照：用截圖鉤子，渡輪入鏡加分', () => {
  const g = make({ capture: () => ({ src: 'data:x', ferryIn: true }), random: () => 0.5 });
  g.S.t = galata.time.sunset;
  g.trigger('view');
  g.choose(0);
  assert.equal(g.S.photos.length, 1);
  assert.equal(g.S.photos[0].score, 98);
  assert.equal(g.stateOf(g.spots.view), 'done');
});

test('光線分數：日落附近最高', () => {
  const s = galata.time.sunset;
  assert.ok(photoLightScore(s, s) > photoLightScore(s - 40, s));
  assert.ok(photoLightScore(s, s) > photoLightScore(s + 60, s));
});

test('重新開始會清空狀態', () => {
  const g = make();
  g.trigger('exit');
  g.choose(0);
  assert.equal(g.card, SUMMARY);
  g.choose(0);
  assert.equal(g.S.ended, false);
  assert.equal(g.S.t, 0);
  assert.equal(g.isOpen, false);
});
