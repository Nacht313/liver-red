// 加拉達橋的畫面：背景（Anima 生成的夕陽圖 + 程式重新打光）、水面、渡輪、海鷗、橋面、道具、路人。
// 所有座標都是場景像素（高 320）。r 是 Renderer，提供 ctx / viewW / camX / now / game / img。

import { clamp, mixHex, rng } from '../../core/util.js';

const BGW = 1280, BGH = 256, BG_Y = 20;
const SUN = { x: 17, y: 42, r: 10 };        // 夕陽圖裡太陽的位置（1x 座標，手動量測）
const WATER_Y = 82;                          // 夕陽圖裡水面開始的列（1x）
export const LAMPS = []; for (let x = 260; x < 1800; x += 210) LAMPS.push(x);

export const IMAGES = { bg: 'bg_sunset.png', simit: 'simit.png', boat: 'boat.png', cay: 'cay.png', cat: 'cat.png', shoe: 'shoe.png' };

// 固定種子的裝飾
const R = rng(7);
const fishermen = [];
for (let x = 380; x < 1650; x += 34 + Math.floor(R() * 40)) {
  if ([1180, 1025, 870, 1300, 1460].some((p) => Math.abs(x - p) < 30)) continue;
  fishermen.push({ x, h: R(), lean: R() < 0.5 });
}
const walkers = []; for (let i = 0; i < 9; i++) walkers.push({ x: R() * 1800, v: (R() < 0.5 ? -1 : 1) * (6 + R() * 8), c: R() });
const gulls = []; for (let i = 0; i < 7; i++) gulls.push({ x: R() * 1600, y: 40 + R() * 80, v: 8 + R() * 10, p: R() * 6 });
const FERRIES = [{ o: 0, v: 7, y: 236 }, { o: 700, v: -5, y: 222 }];

let info = null;
/** 從夕陽圖取出：頂部天空色、太陽附近的天空色、可以亮燈的建築亮面 */
function bgInfo(im) {
  if (info) return info;
  const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  let r = 0, gg = 0, bb = 0;
  for (let x = 0; x < W; x++) for (let y = 0; y < 6; y++) { const p = px(x, y); r += p[0]; gg += p[1]; bb += p[2]; }
  const n = W * 6;
  const sunCol = px(62, 42);
  const RR = rng(11), lights = [];
  for (let y = 48; y < 80; y++) for (let x = 0; x < W; x++) {
    const [a, b2, c2] = px(x, y), mx = Math.max(a, b2, c2), mn = Math.min(a, b2, c2), sat = mx ? (mx - mn) / mx : 0;
    if (a + b2 + c2 > 480 && sat < 0.5 && RR() < 0.09) lights.push({ x, y, th: RR(), ref: RR() < 0.22, w: RR() < 0.25 ? 2 : 1 });
  }
  return (info = { top: `rgb(${(r / n) | 0},${(gg / n) | 0},${(bb / n) | 0})`, sun: `rgb(${sunCol.join(',')})`, lights });
}

export function tick(dt) {
  for (const w of walkers) { w.x += w.v * dt; if (w.x < 0) w.x = 1800; if (w.x > 1800) w.x = 0; }
}

/** 背景層。回傳 false 代表圖還沒載入 */
export function background(r) {
  const { ctx: b, viewW, camX, now, L } = r, im = r.img.bg;
  if (!im || !im.complete || !im.naturalWidth) return false;
  const I = bgInfo(im), deck = r.world.deck;
  const k = Math.max(0, BGW - viewW) / Math.max(1, r.world.width - viewW), fx = Math.round(camX * k);
  b.fillStyle = I.top; b.fillRect(0, 0, viewW, BG_Y + 2);
  b.drawImage(im, -fx, BG_Y, BGW, BGH);
  shimmer(r); birds(r); ferries(r);
  if (L.pre > 0) {
    b.save(); b.globalCompositeOperation = 'screen';
    b.fillStyle = `rgba(255,214,150,${0.26 * L.pre})`; b.fillRect(0, 0, viewW, r.H); b.restore();
  }
  if (L.night > 0) {
    b.fillStyle = I.sun; b.globalAlpha = clamp(L.night * 1.6, 0, 1);
    b.beginPath(); b.arc(SUN.x * 2 - fx, BG_Y + SUN.y * 2, SUN.r * 2 + 20, 0, 7); b.fill();
    b.fillRect(SUN.x * 2 - fx - SUN.r * 2 - 20, BG_Y + SUN.y * 2, SUN.r * 4 + 40, SUN.r * 2 + 14);
    b.globalAlpha = 1;
    b.save(); b.globalCompositeOperation = 'multiply';
    b.fillStyle = mixHex('#ffffff', '#3c4190', L.night); b.fillRect(0, 0, viewW, r.H);
    const g = b.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, `rgba(40,40,110,${0.5 * L.night})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    b.globalCompositeOperation = 'source-over'; b.fillStyle = g; b.fillRect(0, 0, viewW, 120); b.restore();
    const sunset = r.game.scene.time.sunset, t = r.game.S.t;
    if (t > sunset + 20) {
      b.fillStyle = `rgba(255,255,255,${clamp((t - sunset - 20) / 40, 0, 0.7)})`;
      for (let i = 0; i < 36; i++) b.fillRect((i * 71 + ((camX * 0.05) | 0)) % viewW, 4 + ((i * 37) % 70), 1, 1);
    }
    for (const Lt of I.lights) {
      const on = clamp((L.night - Lt.th * 0.7) * 4, 0, 1);
      if (on <= 0) continue;
      const x = Lt.x * 2 - fx;
      if (x < -4 || x > viewW + 4) continue;
      b.fillStyle = `rgba(255,${205 + ((Lt.x * 7) % 40)},130,${0.92 * on})`; b.fillRect(x, BG_Y + Lt.y * 2, Lt.w * 2, 2);
      if (Lt.ref) {
        const y0 = BG_Y + WATER_Y * 2;
        for (let y = y0 + 2, i = 0; y < deck - 6; y += 3 + ((Lt.x + i) % 3), i++) {
          if ((Lt.x * 3 + i * 7) % 5 < 2) continue;
          b.fillStyle = `rgba(255,200,120,${0.32 * on * (1 - (y - y0) / (deck - y0))})`;
          b.fillRect(x + Math.round(Math.sin(now / 600 + y * 0.7 + Lt.x) * 1.5), y, Lt.w * 2 + ((i + Lt.x) % 2), 1);
        }
      }
    }
  }
  b.fillStyle = mixHex('#2d3558', '#141634', L.night); b.fillRect(0, BGH + BG_Y, viewW, r.H - BGH - BG_Y);
  return true;
}

function shimmer({ ctx: b, viewW, camX, now }) {
  const mx = camX * 0.6; b.fillStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i < 60; i++) {
    const x = (((i * 97 - mx + (now / 90) * ((i % 3) + 1)) % (viewW + 40)) + viewW + 40) % (viewW + 40) - 20, y = 196 + ((i * 13) % 48);
    b.fillRect(x | 0, y, 5 + (i % 4) * 3, 1);
  }
}

function birds({ ctx: b, viewW, camX, now }) {
  b.strokeStyle = 'rgba(20,18,40,.7)'; b.lineWidth = 1;
  for (const g of gulls) {
    const x = (((g.x + (now / 1000) * g.v - camX * 0.5) % (viewW + 60)) + viewW + 60) % (viewW + 60) - 30;
    const y = g.y + Math.sin(now / 700 + g.p) * 4, f = Math.sin(now / 180 + g.p) > 0 ? 2 : 0;
    b.beginPath(); b.moveTo(x - 4, y - f); b.lineTo(x, y); b.lineTo(x + 4, y - f); b.stroke();
  }
}

function ferryX(f, r) {
  const span = r.world.width * 0.6 + r.viewW + 200;
  return ((((f.o + (r.now / 1000) * f.v * 8 - r.camX * 0.6) % span) + span) % span) - 100;
}

function ferries(r) {
  const b = r.ctx, lit = r.game.S.t > r.game.scene.time.sunset + 10;
  for (const f of FERRIES) {
    const x = ferryX(f, r), y = f.y;
    b.fillStyle = '#e8e3d6'; b.fillRect(x, y - 6, 46, 6); b.fillRect(x + 8, y - 11, 28, 5);
    b.fillStyle = '#2b2a3a'; b.fillRect(x, y, 46, 2); b.fillRect(x + 20, y - 16, 4, 5);
    b.fillStyle = lit ? '#ffd890' : '#3a3f55'; for (let i = 0; i < 6; i++) b.fillRect(x + 4 + i * 7, y - 4, 4, 2);
  }
}

/** 拍照時渡輪在不在畫面裡 */
export function ferryVisible(r) {
  return FERRIES.some((f) => { const x = ferryX(f, r); return x > -20 && x < r.viewW - 20; });
}

// ---------- 近景 ----------
export function foreground(r) {
  const b = r.ctx, H = r.H, DECK = r.world.deck, W = r.world.width;
  b.save(); b.translate(-r.camX, 0);
  // 欄杆
  b.fillStyle = '#1d1a2c'; b.fillRect(200, DECK - 6, W, 3);
  for (let x = 200; x < W; x += 5) b.fillRect(x, DECK - 4, 1, 16);
  b.fillRect(200, DECK + 11, W, 2);
  // 埃米諾努碼頭
  b.fillStyle = '#2a2536'; b.fillRect(0, DECK + 10, 200, 4);
  // 步道
  const g = b.createLinearGradient(0, DECK + 12, 0, H); g.addColorStop(0, '#3a3346'); g.addColorStop(1, '#1b1726');
  b.fillStyle = g; b.fillRect(0, DECK + 12, W, H - DECK);
  b.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 24) b.fillRect(x, DECK + 30, 12, 1);
  // 路燈柱
  for (const x of LAMPS) { b.fillStyle = '#14111f'; b.fillRect(x, DECK - 44, 2, 58); b.fillRect(x - 4, DECK - 46, 10, 3); }
  for (const f of fishermen) fisher(b, f.x, f.h, f.lean, '#16131f', DECK, r.world.horizon);
  boats(r);
  props(r);
  for (const w of walkers) person(b, w.x, DECK + 28 + ((w.c * 14) | 0), w.c, Math.sin(r.now / 160 + w.x) > 0);
  b.restore();
}

function fisher(b, x, h, lean, col, DECK, HORIZON) {
  b.fillStyle = col; const y = DECK + 14;
  b.fillRect(x, y - 15 - ((h * 3) | 0), 4, 15 + ((h * 3) | 0)); b.fillRect(x, y - 19 - ((h * 3) | 0), 4, 4);
  b.strokeStyle = 'rgba(30,26,40,.9)'; b.lineWidth = 1;
  b.beginPath(); b.moveTo(x + 2, y - 12); b.lineTo(x + (lean ? -18 : 16), y - 58 - h * 12); b.stroke();
  b.strokeStyle = 'rgba(230,230,240,.25)';
  b.beginPath(); b.moveTo(x + (lean ? -18 : 16), y - 58 - h * 12); b.lineTo(x + (lean ? -24 : 22), HORIZON + 30); b.stroke();
  b.fillStyle = '#4b5b70'; b.fillRect(x + 5, y - 4, 4, 4);
}

export function person(b, x, y, c, step) {
  b.fillStyle = c < 0.33 ? '#2b2238' : c < 0.66 ? '#3a2a2a' : '#232a3a';
  b.fillRect(x, y - 16, 4, 11); b.fillRect(x, y - 19, 4, 3);
  b.fillRect(x + (step ? 0 : 1), y - 5, 1, 5); b.fillRect(x + (step ? 3 : 2), y - 5, 1, 5);
}

function spr(b, im, x, y, flip) {
  if (!im || !im.complete || !im.naturalWidth) return false;
  if (flip) { b.save(); b.translate(x + im.width, y); b.scale(-1, 1); b.drawImage(im, 0, 0); b.restore(); }
  else b.drawImage(im, Math.round(x), Math.round(y));
  return true;
}

function boats(r) {
  const b = r.ctx, im = r.img.boat, DECK = r.world.deck;
  if (im?.naturalWidth) { spr(b, im, 40, DECK + 8 - im.height); spr(b, im, 118, DECK + 10 - im.height, true); return; }
  for (const [x, c] of [[70, '#7a2f2c'], [140, '#2f5a7a']]) { b.fillStyle = c; b.fillRect(x - 28, DECK - 2, 56, 8); }
}

function props(r) {
  const b = r.ctx, S = r.game.S, img = r.img, DECK = r.world.deck, y = DECK + 30, now = r.now;
  if (!spr(b, img.simit, 316, y - 28)) { b.fillStyle = '#a8352f'; b.fillRect(318, y - 14, 24, 12); }
  person(b, 346, y, 0.2, false);
  b.fillStyle = '#14111f'; b.fillRect(1023, y - 4, 4, 4); // 拍照點記號
  if (!S.flags.shoeDone || S.flags.shoeShown) {
    if (!spr(b, img.shoe, 876, y - 11)) { b.fillStyle = '#6a4b2a'; b.fillRect(876, y - 6, 10, 6); }
    person(b, 888, y, 0.5, Math.sin(now / 200) > 0);
  }
  fisher(b, 1178, 0.6, true, '#2c2533', DECK, r.world.horizon);
  if (!spr(b, img.cay, 1290, y - 34)) { b.fillStyle = '#5a3a2a'; b.fillRect(1288, y - 12, 26, 10); }
  person(b, 1276, y, 0.7, false);
  b.fillStyle = 'rgba(240,235,225,.3)'; b.fillRect(1302, y - 30 - ((now / 300) % 4), 1, 3);
  const cat = r.game.spots.cat;
  if ((r.game.stateOf(cat) !== 'hidden') && !spr(b, img.cat, 1452, y - 13)) { b.fillStyle = '#d9a25a'; b.fillRect(1456, y - 5, 9, 5); }
  b.fillStyle = '#2a2536'; b.fillRect(1720, DECK + 12, 80, r.H);
  b.fillStyle = '#c9b98f'; b.fillRect(1726, DECK - 14, 30, 9);
  b.fillStyle = '#2a2536'; b.font = '7px monospace'; b.fillText('KARAKÖY', 1727, DECK - 7);
}
