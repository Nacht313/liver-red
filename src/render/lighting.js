// 統一光影。規則：背景只換光影、不換構圖；近景和背景用同一套時間參數調色，看起來才像同一個世界。
import { clamp } from '../core/util.js';

/** 依場景時間算出三個光線係數（0~1） */
export function lightAt(t, sunset) {
  return {
    warm: clamp((sunset + 10 - t) / 50, 0, 1),    // 日落前的暖光
    night: clamp((t - sunset + 2) / 40, 0, 1),     // 入夜程度
    lamp: clamp((t - sunset - 6) / 10, 0, 1),      // 路燈亮度
    pre: clamp(1 - t / sunset, 0, 1),              // 背景的暖色濾鏡
  };
}

/**
 * 近景調色：只改已經畫上去的像素（source-atop），透明的地方不受影響。
 * @param {CanvasRenderingContext2D} g 近景圖層
 */
export function gradeForeground(g, w, h, L, lamps, camX, deckY) {
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const c = [110 + (22 - 110) * L.night, 56 + (22 - 56) * L.night, 72 + (66 - 72) * L.night];
  g.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${0.28 + 0.42 * L.night})`;
  g.fillRect(0, 0, w, h);
  if (L.warm > 0) {
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, `rgba(255,168,92,${0.34 * L.warm})`);
    side.addColorStop(1, `rgba(255,150,90,${0.1 * L.warm})`);
    g.fillStyle = side; g.fillRect(0, 0, w, h);
    const top = g.createLinearGradient(0, deckY - 50, 0, h);
    top.addColorStop(0, `rgba(255,190,120,${0.18 * L.warm})`);
    top.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = top; g.fillRect(0, 0, w, h);
  }
  if (L.lamp > 0) {
    for (const x of lamps) {
      const sx = x + 1 - camX;
      if (sx < -90 || sx > w + 90) continue;
      const r = g.createRadialGradient(sx, deckY + 24, 2, sx, deckY + 24, 72);
      r.addColorStop(0, `rgba(255,200,125,${0.6 * L.lamp})`);
      r.addColorStop(0.5, `rgba(255,185,110,${0.25 * L.lamp})`);
      r.addColorStop(1, 'rgba(255,180,110,0)');
      g.fillStyle = r; g.fillRect(sx - 72, deckY - 50, 144, 130);
    }
  }
  g.restore();
}

/** 路燈燈頭的光暈，疊加在合成後的畫面上 */
export function lampGlow(g, w, L, lamps, camX, deckY) {
  if (L.lamp <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const x of lamps) {
    const sx = x + 1 - camX;
    if (sx < -40 || sx > w + 40) continue;
    const r = g.createRadialGradient(sx, deckY - 43, 1, sx, deckY - 43, 28);
    r.addColorStop(0, `rgba(255,200,120,${0.55 * L.lamp})`);
    r.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = r; g.fillRect(sx - 28, deckY - 71, 56, 56);
    g.fillStyle = `rgba(255,230,170,${L.lamp})`; g.fillRect(sx - 3, deckY - 44, 6, 2);
  }
  g.restore();
}
