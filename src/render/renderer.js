// 畫面管線：背景層 → 近景層（另外一張畫布）→ 近景調色 → 合成 → 光暈 → spot 記號 → 放大貼到螢幕。
// 低解析度（高 320）畫完再用最近鄰放大，像素才會銳利。

import { clamp } from '../core/util.js';
import { lightAt, gradeForeground, lampGlow } from './lighting.js';

export class Renderer {
  constructor(canvas, game, art, assetBase) {
    this.cv = canvas; this.out = canvas.getContext('2d');
    this.game = game; this.art = art;
    this.world = game.scene.world; this.H = this.world.height;
    this.buf = document.createElement('canvas'); this.bctx = this.buf.getContext('2d');
    this.fg = document.createElement('canvas'); this.fctx = this.fg.getContext('2d');
    this.ctx = this.bctx;
    this.viewW = 480; this.camX = 0; this.now = 0; this.cssU = 1; this.cssH = 1;
    this.debug = false;
    this.img = {};
    this.ready = Promise.all(Object.entries(art.IMAGES).map(([k, file]) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(); im.onerror = () => { console.warn('素材載入失敗：' + file); res(); };
      im.src = assetBase + file; this.img[k] = im;
    })));
  }

  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    const scale = this.cv.height / this.H;
    this.scale = scale; this.viewW = Math.ceil(this.cv.width / scale);
    for (const c of [this.buf, this.fg]) { c.width = this.viewW; c.height = this.H; }
    this.cssU = r.width / this.viewW; this.cssH = r.height / this.H;
  }

  /** 世界座標 → 舞台上的 CSS 座標（給 HTML 提示框定位） */
  toCss(wx, wy) { return { left: (wx - this.camX) * this.cssU, top: wy * this.cssH }; }
  /** 舞台上的點擊位置 → 世界 x */
  toWorldX(clientX) { const r = this.cv.getBoundingClientRect(); return ((clientX - r.left) / r.width) * this.viewW + this.camX; }

  frame(now) {
    const g = this.game, S = g.S;
    this.now = now;
    this.camX = clamp(S.x - this.viewW * 0.42, 0, Math.max(0, this.world.width - this.viewW));
    this.L = lightAt(S.t, g.scene.time.sunset);
    const { bctx, fctx, viewW, H } = this;

    this.ctx = bctx;
    bctx.fillStyle = '#2b2d55'; bctx.fillRect(0, 0, viewW, H);
    this.art.background(this);

    this.ctx = fctx;
    fctx.clearRect(0, 0, viewW, H);
    this.art.foreground(this);
    this.player(fctx);
    gradeForeground(fctx, viewW, H, this.L, this.art.LAMPS, this.camX, this.world.deck);

    this.ctx = bctx;
    bctx.drawImage(this.fg, 0, 0);
    lampGlow(bctx, viewW, this.L, this.art.LAMPS, this.camX, this.world.deck);
    this.markers(bctx);

    this.out.imageSmoothingEnabled = false;
    this.out.drawImage(this.buf, 0, 0, viewW * this.scale, H * this.scale);
  }

  player(b) {
    const g = this.game, S = g.S, DECK = this.world.deck;
    const x = Math.round(S.x - this.camX), y = DECK + 44;
    const step = S.tx != null || g.walkHold ? Math.floor(this.now / 140) % 2 : 0;
    b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(x - 5, y, 12, 2);
    b.fillStyle = '#6b3a2c'; b.fillRect(S.dir > 0 ? x - 4 : x + 5, y - 19, 5, 11);
    b.fillStyle = '#8a4a36'; b.fillRect(S.dir > 0 ? x - 4 : x + 5, y - 20, 5, 2);
    b.fillStyle = '#b5473e'; b.fillRect(x, y - 18, 6, 9); // 豬肝紅外套
    b.fillStyle = '#e8c9a4'; b.fillRect(x + 1, y - 23, 4, 5);
    b.fillStyle = '#1c1a26'; b.fillRect(x, y - 24, 6, 2);
    b.fillStyle = '#2e3550'; b.fillRect(x + (step ? 0 : 1), y - 9, 2, 9); b.fillRect(x + (step ? 4 : 3), y - 9, 2, 9);
  }

  markers(b) {
    const g = this.game, S = g.S, DECK = this.world.deck, H = this.H;
    for (const s of g.scene.spots) {
      if (s.x == null) continue;
      const st = g.stateOf(s), sx = s.x - this.camX;
      if (sx < -20 || sx > this.viewW + 20) continue;
      if (this.debug) {
        if (s.reveal) {
          b.strokeStyle = st === 'hidden' ? 'rgba(167,159,192,.5)' : 'rgba(240,178,87,.55)';
          b.setLineDash([3, 3]); b.strokeRect(sx - s.reveal, DECK + 13, s.reveal * 2, H - DECK - 16); b.setLineDash([]);
        }
        b.fillStyle = 'rgba(240,178,87,.9)'; b.font = '7px monospace'; b.fillText(s.id, sx - 8, DECK + 60);
      }
      if (st === 'hidden') { if (this.debug) { b.strokeStyle = 'rgba(167,159,192,.8)'; b.strokeRect(sx - 5, DECK - 6, 10, 10); } continue; }
      if (s.trigger.kind !== 'interact') continue;
      if (Math.abs(S.x - s.x) > s.reveal && !this.debug && st === 'unseen') continue;
      const y = DECK - 14 + Math.sin(this.now / 400 + s.x) * 2;
      b.fillStyle = 'rgba(21,18,43,.8)'; b.fillRect(sx - 5, y - 5, 11, 11);
      b.fillStyle = st === 'done' ? '#8cc68a' : '#f0b257'; b.fillRect(sx - 4, y - 4, 9, 9);
      b.fillStyle = '#15122b';
      if (st !== 'done') { b.fillRect(sx - 1, y - 2, 3, 1); b.fillRect(sx + 1, y - 1, 1, 2); b.fillRect(sx, y + 1, 1, 1); b.fillRect(sx, y + 3, 1, 1); }
      else b.fillRect(sx - 1, y - 1, 3, 3);
    }
  }

  /** 拍照：從目前畫面截一張 16:10 的小圖 */
  capture(kind) {
    const tw = Math.min(this.viewW, 320), th = Math.round((tw * 10) / 16);
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    const sx = kind === 'portrait' ? clamp(this.game.S.x - this.camX - tw / 2, 0, this.viewW - tw) : Math.max(0, (this.viewW - tw) / 2);
    const sy = kind === 'portrait' ? this.H - th : 20;
    c.getContext('2d').drawImage(this.buf, sx, sy, tw, th, 0, 0, tw, th);
    return { src: c.toDataURL('image/png'), ferryIn: kind !== 'portrait' && this.art.ferryVisible(this) };
  }
}
