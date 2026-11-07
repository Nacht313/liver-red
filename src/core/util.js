// 共用小工具。這個檔案不碰 DOM，可以在 Node 測試裡直接載入。

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** '#rrggbb' → [r, g, b] */
export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** 兩個 '#rrggbb' 顏色線性混合，k=0 回傳 a，k=1 回傳 b */
export function mixHex(a, b, k) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

/** mulberry32：固定種子的亂數，讓場景裝飾每次都一樣 */
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 場景內分鐘數 → 'HH:MM'。startMin 是場景開始的時刻（從午夜起算的分鐘） */
export function clockText(startMin, t) {
  const m = Math.floor(startMin + t);
  return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** 數值是否落在 {gte, gt, lte, lt} 描述的區間 */
export function inRange(v, r) {
  if (r.gte != null && !(v >= r.gte)) return false;
  if (r.gt != null && !(v > r.gt)) return false;
  if (r.lte != null && !(v <= r.lte)) return false;
  if (r.lt != null && !(v < r.lt)) return false;
  return true;
}
