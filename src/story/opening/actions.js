// 開幕裡比較複雜的規則（劇情節點用 { do: '名稱' } 呼叫）。每個動作只改狀態，不碰畫面。

import { ITEMS, DEFAULT_PACK, TRANS } from './data.js';
import { tryPut, layerOpen } from '../../game/journey/bag.js';
import { hoursToNextSeg } from '../../game/journey/time.js';

export const arrivalDay = (S) => (S.dep == null ? 99 : S.dep + TRANS[S.trans].arriveDays);

/** TDAC 最早抵達前 3 天才能填 */
export const tdacOpen = (S) => !!S.trans && S.dep != null && arrivalDay(S) - S.day <= 3 && arrivalDay(S) >= S.day;

export const laosApproved = (S) => S.laosVisa != null && S.day >= S.laosVisa;

/** 休息、讀書、辦事：時間走到下一個分段（在家會順便充電） */
export function nextSeg(J) {
  const h = hoursToNextSeg(J.S.h);
  if (h > 0) J.advance(h, { charging: J.S.loc === 'home' });
  return h > 0;
}

export default {
  /** 飯桌上選了資金 */
  startFunds(J, { n }) {
    const S = J.S;
    S.card = n; S.tier = n; S.day = 0; S.h = 22.5; S.start = S.card + S.cny;
    S.diary.push({ day: 0, text: `爸媽給了 ¥${n.toLocaleString('en-US')}。` });
  },

  /** 出門前：沒到的網購留在家；零食沒帶的話媽媽會硬塞 */
  departPrep(J) {
    const S = J.S;
    const left = S.orders.filter((o) => !o.got).map((o) => ITEMS[o.id].n);
    if (left.length) J.flash.push({ kind: 'warn', text: `還有 ${left.join('、')} 沒到。只能留在家了。` });
    if (S.items.snacks === 'home') {
      S.flags.stuffed = 1;
      if (!tryPut(S, 'snacks', ['day', 'top', 'mid', 'bot'])) S.items.snacks = 'worn';
    } else delete S.flags.stuffed;
  },

  checkLaosVisa(J) { if (laosApproved(J.S)) J.S.flags.laosOk = 1; else delete J.S.flags.laosOk; },

  /** 陸路在磨丁被退回：回昆明，隔天早上改搭全服務航空 */
  rerouteToFlight(J) {
    const S = J.S;
    S.stamps.pop();
    S.day++; S.h = 9; S.trans = 'fsc'; S.extraBag = true; S.loc = 'transit';
  },

  /** 換成當地時間（比國內慢一小時） */
  localTime(J) {
    const S = J.S;
    S.h -= 1;
    if (S.h < 0) { S.h += 24; S.day--; }
  },

  stampThailand(J) {
    const S = J.S;
    S.entry = S.day;
    S.stamps.push({ c: '泰國', t: S.flags.landEntry ? '入境（陸路）' : '入境', d: S.day, until: S.day + 29 });
    S.resume = 'curb';
    J.save('stamp', '泰國入境');
  },

  /** 背包選單：把一件物品放到某個位置 */
  setPlace(J, { id, place }) {
    const S = J.S;
    if (!(id in S.items) || S.items[id] === 'lost') return;
    if (place === 'home' && ITEMS[id].must) return;
    if (place !== 'home' && !layerOpen(S, place)) return;
    S.items[id] = place;
  },

  defaultPack(J) {
    const S = J.S;
    for (const id of Object.keys(S.items)) if (S.items[id] !== 'lost' && DEFAULT_PACK[id]) S.items[id] = DEFAULT_PACK[id];
  },
};
