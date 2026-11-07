// 語言系統：對話裡用 [[字]] 標出可以學的外語單字。
// 介面把它切成片段，已學會的顯示意思，還不會的可以點下去猜（巴別塔式）。

/** 土耳其語的 İ/I 要先處理，不然 toLowerCase 會變成 i̇ */
export const norm = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

/**
 * 把一段文字切成片段。
 * @returns {Array<{text:string}|{text:string, word:string, known:boolean, meaning:string}>}
 */
export function tokenize(str, dict, known) {
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0, m;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push({ text: str.slice(last, m.index) });
    const k = norm(m[1]);
    if (dict[k]) out.push({ text: m[1], word: k, known: !!known[k], meaning: dict[k] });
    else out.push({ text: m[1] });
    last = re.lastIndex;
  }
  if (last < str.length) out.push({ text: str.slice(last) });
  return out;
}

/** 文字裡所有 [[...]] 標記（給資料檢查用） */
export function markedWords(str) {
  return [...String(str).matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => norm(m[1]));
}

/** 產生三選一的猜字選項：正確答案 + 兩個干擾項 */
export function guessOptions(dict, word, rand = Math.random) {
  const right = dict[word];
  const pool = [...new Set(Object.values(dict).filter((v) => v !== right))];
  const opts = [right];
  while (opts.length < 3 && pool.length) opts.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}
