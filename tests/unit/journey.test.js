// 旅程規則：時間、數值、上限鎖、錢、背包重量、旅行知識、存檔。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Journey, freshState } from '../../src/game/journey/journey.js';
import { totalKg, cabinKg, overfull, fixWaist, tryPut, weightFactor } from '../../src/game/journey/bag.js';
import { clock, dateStr, hoursToNextSeg, tod } from '../../src/game/journey/time.js';
import { test as cond, apply, fill } from '../../src/game/journey/rules.js';
import { memStorage } from './helpers/play.js';

const fresh = (o = {}) => { const J = new Journey({ storage: memStorage(), random: () => 0.5, ...o }); J.newGame(); J.flash = []; return J; };

test('時鐘和日期', () => {
  assert.equal(clock(22.5), '22:30');
  assert.equal(clock(7.999), '08:00');
  assert.equal(dateStr(0, true), '6/28');
  assert.equal(dateStr(3, true), '7/1');
  assert.equal(hoursToNextSeg(9), 4);
  assert.equal(hoursToNextSeg(23.5), 0);
  assert.equal(tod(18), 'dusk');
});

test('上限鎖最低 50；股票虧損的鎖例外，最低到 1', () => {
  const J = fresh();
  J.lock('dirty', 'faith', 20, '洗澡');
  assert.equal(J.cap('faith'), 50);
  J.lock('stockLoss', 'faith', 1, '把虧損賺回來');
  assert.equal(J.cap('faith'), 1);
  assert.equal(J.S.faith, 1);
  J.unlock('stockLoss');
  assert.equal(J.cap('faith'), 50);
});

test('家人壓力滿了會鎖住信念上限，視訊可以解鎖', () => {
  const J = fresh();
  J.S.family = 100; J.checkLocks();
  assert.equal(J.cap('faith'), 75);
  J.unlock('family');
  assert.equal(J.cap('faith'), 100);
});

test('先刷卡再用現金；錢歸零就結束', () => {
  const J = fresh();
  J.S.card = 100; J.S.cny = 50;
  J.payCNY(120);
  assert.equal(J.S.card, 0); assert.equal(J.S.cny, 30);
  assert.equal(J.S.over, false);
  J.payCNY(30);
  assert.equal(J.S.over, true); assert.equal(J.S.ending, 'money');
});

test('泰銖不夠時，不足的部分刷卡', () => {
  const J = fresh();
  J.S.card = 1000; J.S.thb = 100;
  J.payTHB(555);
  assert.equal(J.S.thb, 0);
  assert.equal(J.S.card, 1000 - 100); // 455 銖 ÷ 4.55 = 100 元
});

test('在家飽食不會下降；出門後會餓、會髒', () => {
  const J = fresh();
  J.S.food = 50; J.advance(3);
  assert.ok(J.S.food >= 80 - 1e-9);
  J.S.loc = 'abroad'; const f = J.S.food, h = J.S.hyg;
  J.advance(3);
  assert.ok(J.S.food < f); assert.ok(J.S.hyg < h);
});

test('精力歸零就結束', () => {
  const J = fresh();
  J.S.energy = 1; J.advance(2, { tiring: 4 });
  assert.equal(J.S.ending, 'tired');
});

test('睡覺：跨日、思想櫃消化、在家睡滿', () => {
  const J = fresh();
  J.S.h = 23; J.S.energy = 30;
  J.sleep('home');
  assert.equal(J.S.day, 1); assert.equal(J.S.h, 7.5);
  assert.equal(J.S.energy, 95);
  assert.equal(J.S.thoughts[0].got, 1);
  J.sleep('home'); J.sleep('home');
  assert.equal(J.S.attr.膽識, 2);
});

test('網購兩天後在家收到', () => {
  const J = fresh();
  J.S.orders.push({ id: 'belt', arrive: 2 });
  J.S.h = 23; J.sleep('home');
  assert.equal(J.S.items.belt, undefined);
  J.sleep('home');
  assert.equal(J.S.items.belt, 'home');
});

test('旅行知識跨輪保留', () => {
  const storage = memStorage();
  const J = fresh({ storage });
  J.learn('k_lcc');
  const J2 = new Journey({ storage }); J2.newGame();
  assert.ok(J2.S.know.includes('k_lcc'));
  assert.throws(() => J.learn('k_nope'));
});

test('讀檔回到存檔當時的狀態，但保留之後學到的知識', () => {
  const J = fresh();
  J.S.card = 5000; J.save('diary', '6/28 家');
  J.S.card = 1; J.learn('k_taxi'); J.end('money');
  assert.ok(J.load('diary'));
  assert.equal(J.S.card, 5000); assert.equal(J.S.over, false);
  assert.ok(J.S.know.includes('k_taxi'));
});

test('背包：手提重量不含褲袋、腰包和穿在身上的東西', () => {
  const S = freshState();
  const base = cabinKg(S);
  S.items.laptop = 'mid';
  assert.ok(Math.abs(cabinKg(S) - (base + 1.9 + 1.4)) < 1e-9); // 筆電＋大背包本身
  S.items.laptop = 'worn';
  assert.ok(cabinKg(S) < base + 1.5);
  assert.ok(totalKg(S) >= 1.9);
});

test('背包：塞不下、重心、腰包', () => {
  const S = freshState();
  S.items.towel = 'pocket';
  assert.equal(overfull(S), 'pocket');
  S.items.towel = 'mid';
  assert.equal(overfull(S), null);
  S.items.laptop = 'top';
  assert.ok(weightFactor(S) > 1);
  S.items.wallet = 'waist'; fixWaist(S);
  assert.equal(S.items.wallet, 'pocket');
  assert.equal(tryPut(S, 'snacks', ['pocket', 'day']), 'day');
});

test('條件和效果的小語言', () => {
  const J = fresh();
  J.S.card = 1000;
  apply([{ add: { faith: 5, eng: 1 } }, { flag: 'x' }, { know: 'k_lcc' }, { set: { cs: 'jay' } }, { pay: 100 }, { flash: '{clock}' }], J);
  assert.equal(J.S.faith, 60); assert.equal(J.S.eng, 3); assert.equal(J.S.card, 900);
  assert.equal(J.flash[0].text, '22:00');
  assert.ok(cond([{ flag: 'x' }, { know: 'k_lcc' }, { is: { cs: 'jay' } }, { faith: { gte: 60 } }, { attr: '膽識', lt: 2 }], J));
  assert.ok(cond({ not: { is: { trans: 'land' } } }, J));
  assert.throws(() => apply([{ set: { card: 1 } }], J));
  assert.throws(() => cond({ huh: 1 }, J));
  assert.throws(() => fill('{nope}', J));
});
