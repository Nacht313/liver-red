// 條件判斷。場景資料裡的 req / visibleIf / when 都用這套寫法，策劃不用寫程式也能讀懂。
//
//   { word: 'merhaba' }        已學會這個單字
//   { flag: 'food' }           旗標為真
//   { noFlag: 'shoeDone' }     旗標為假
//   { t: { gte: 40, lt: 80 } } 場景時間（從場景開始算的分鐘）
//   { money: { gte: 25 } }     錢、電量 bat、精力 en 同理
//   { spot: 'cat', is: 'done' } spot 狀態：hidden / unseen / seen / done
//   { all: [...] } { any: [...] } { not: {...} }
//   [ ... ]                    陣列等於 all

import { inRange } from '../core/util.js';

export function check(cond, S, spotState) {
  if (cond == null) return true;
  if (Array.isArray(cond)) return cond.every((c) => check(c, S, spotState));
  if ('all' in cond) return cond.all.every((c) => check(c, S, spotState));
  if ('any' in cond) return cond.any.some((c) => check(c, S, spotState));
  if ('not' in cond) return !check(cond.not, S, spotState);
  if ('word' in cond) return !!S.words[cond.word];
  if ('flag' in cond) return !!S.flags[cond.flag];
  if ('noFlag' in cond) return !S.flags[cond.noFlag];
  if ('t' in cond) return inRange(S.t, cond.t);
  if ('money' in cond) return inRange(S.money, cond.money);
  if ('bat' in cond) return inRange(S.bat, cond.bat);
  if ('en' in cond) return inRange(S.en, cond.en);
  if ('spot' in cond) {
    if (!spotState) throw new Error('spot condition needs spotState');
    return spotState(cond.spot) === cond.is;
  }
  throw new Error('未知的條件寫法：' + JSON.stringify(cond));
}

/** 列出條件裡用到的單字（給資料檢查用） */
export function wordsIn(cond, out = new Set()) {
  if (cond == null) return out;
  if (Array.isArray(cond)) cond.forEach((c) => wordsIn(c, out));
  else if (typeof cond === 'object') {
    if ('word' in cond) out.add(cond.word);
    for (const k of ['all', 'any']) if (k in cond) cond[k].forEach((c) => wordsIn(c, out));
    if ('not' in cond) wordsIn(cond.not, out);
  }
  return out;
}
