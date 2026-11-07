// 清單畫面共用的小工具（只產生畫面資料，不碰 DOM）。

import { STAYK } from './data.js';
import { totalKg } from '../../game/journey/bag.js';

export const p = (text, kind = 'p') => ({ kind, text });
export const back = (to = 'prep', text = '返回') => ({ text, ico: 'back', fn: (J, F) => F.go(to) });
export const thb = (n) => Math.round(n).toLocaleString('en-US');
export const yuan = (n) => '¥' + Math.round(n).toLocaleString('en-US');
export const homeView = (J, blocks, choices, o = {}) => ({ img: 'room', o: { bag: totalKg(J.S) > 3, ...o }, blocks, choices });

export function stayName(S) {
  if (S.stay) return `${STAYK[S.stay.kind].n}・${S.stay.nights} 晚`;
  if (S.cs === 'jay') return '沙發衝浪：Jay 家';
  return '還沒訂';
}
