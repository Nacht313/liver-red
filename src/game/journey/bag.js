// 背包：每件物品放在哪一層、重量、手提行李重量、重心。
// S.items[id] 的值：分層 id（pocket / waist / day / top / mid / bot）、'home'（不帶）、'worn'（穿在身上）、'lost'（丟了）。
// 第一輪是選單版；第二輪換成格子背包，但重量規則不變。

import { ITEMS, LAYERS, PACK_KG, DAY_KG } from '../../story/opening/data.js';

export const carried = (S, id) => { const l = S.items[id]; return !!l && l !== 'home' && l !== 'lost'; };
export const has = carried;

export function layerSum(S, layer) {
  let kg = 0, L = 0;
  for (const id in S.items) if (S.items[id] === layer) { kg += ITEMS[id].kg; L += ITEMS[id].L; }
  return { kg, L };
}

export const bigUsed = (S) => ['top', 'mid', 'bot'].some((l) => layerSum(S, l).L > 0);
const dayUsed = (S) => layerSum(S, 'day').L > 0;

/** 身上全部的重量（含背包本身） */
export function totalKg(S) {
  let k = 0;
  for (const id in S.items) if (carried(S, id)) k += ITEMS[id].kg;
  if (bigUsed(S)) k += PACK_KG;
  if (dayUsed(S)) k += DAY_KG;
  return k;
}

/** 手提行李的重量：不含褲袋、腰包和穿在身上的東西 */
export function cabinKg(S) {
  let k = 0;
  for (const id in S.items) {
    const l = LAYERS[S.items[id]];
    if (l && !l.body) k += ITEMS[id].kg;
  }
  if (bigUsed(S)) k += PACK_KG;
  if (dayUsed(S)) k += DAY_KG;
  return k;
}

/** 1 公斤以上的東西放在上層或下層，重心不穩 */
export const badCenter = (S) => ['top', 'bot'].some((l) => Object.keys(S.items).some((id) => S.items[id] === l && ITEMS[id].kg >= 1));

/** 負重對體力消耗的倍率 */
export function weightFactor(S) {
  const k = totalKg(S);
  return (k <= 8 ? 1 : k <= 11 ? 1.25 : k <= 14 ? 1.55 : 2) * (badCenter(S) ? 1.12 : 1);
}

export const weightWord = (kg) => (kg <= 8 ? '輕鬆' : kg <= 11 ? '有點重' : '很重');

/** 分層能不能用：腰包要先買到（在家裡也算，整理完沒帶上會用 fixWaist 退回褲袋） */
export function layerOpen(S, layer) {
  const need = LAYERS[layer]?.need;
  return !need || (!!S.items[need] && S.items[need] !== 'lost');
}

/** 可以放這件物品的位置（含「不帶」） */
export function placesFor(S, id) {
  const out = Object.keys(LAYERS).filter((l) => layerOpen(S, l));
  if (!ITEMS[id].must) out.push('home');
  return out;
}

/** 塞不下的分層；全部塞得下回傳 null */
export function overfull(S) {
  for (const [k, l] of Object.entries(LAYERS)) if (layerSum(S, k).L > l.L + 1e-9) return k;
  return null;
}

/** 腰包沒帶時，原本放腰包的東西退回褲袋 */
export function fixWaist(S) {
  if (carried(S, 'belt')) return;
  for (const id in S.items) if (S.items[id] === 'waist') S.items[id] = 'pocket';
}

/** 依序找第一個塞得下的分層，找到就放進去，回傳分層；都不行回傳 null */
export function tryPut(S, id, layers) {
  for (const l of layers) {
    if (!layerOpen(S, l)) continue;
    if (layerSum(S, l).L + ITEMS[id].L <= LAYERS[l].L) { S.items[id] = l; return l; }
  }
  return null;
}
