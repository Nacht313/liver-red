// 進入點：把遊戲邏輯、畫面、介面和輸入接起來。
import { Game } from './game/game.js';
import { Renderer } from './render/renderer.js';
import { Sheet } from './ui/sheet.js';
import { Panels } from './ui/panels.js';
import galata from './scenes/galata/index.js';
import * as galataArt from './scenes/galata/art.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');

let panels, sheet, renderer;
const game = new Game(galata, {
  toast: (m) => panels?.toast(m),
  change: () => { panels?.sync(); sheet?.render(); },
  capture: (kind) => renderer.capture(kind),
});
renderer = new Renderer($('cv'), game, galataArt, 'assets/scenes/galata/');
panels = new Panels(game, renderer, { hud: $('hud'), table: $('spotTable'), words: $('words'), photos: $('photos'), log: $('log'), toast: $('toast'), act: $('act') });
sheet = new Sheet(game, $('sheet'), stage);

// ---------- 輸入 ----------
$('cv').addEventListener('click', (e) => { if (!game.isOpen && !game.S.ended) game.walkTo(renderer.toWorldX(e.clientX)); });

addEventListener('keydown', (e) => {
  if (game.isOpen) { if (sheet.key(e)) e.preventDefault(); return; }
  if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && !e.repeat && game.nearSpot()) { e.preventDefault(); game.interact(); return; }
  if (e.key === 'ArrowLeft') { game.walkHold = -1; game.S.tx = null; }
  if (e.key === 'ArrowRight') { game.walkHold = 1; game.S.tx = null; }
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' && game.walkHold < 0) game.walkHold = 0;
  if (e.key === 'ArrowRight' && game.walkHold > 0) game.walkHold = 0;
});
for (const [id, d] of [['bl', -1], ['br', 1]]) {
  const el = $(id);
  const on = (e) => { e.preventDefault(); if (!game.isOpen) { game.walkHold = d; game.S.tx = null; } };
  const off = () => { game.walkHold = 0; };
  el.addEventListener('pointerdown', on);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, off);
}
$('act').onclick = (e) => { e.stopPropagation(); game.interact(); };
$('actBtn').onclick = () => game.interact();
$('wait').onclick = () => game.wait(10);
$('dbg').onclick = () => {
  renderer.debug = !renderer.debug;
  $('dbg').setAttribute('aria-pressed', renderer.debug);
  $('dbg').textContent = renderer.debug ? '隱藏 spot 範圍' : '顯示 spot 範圍';
};
$('reset').onclick = () => { game.reset(); sheet.render(); panels.sync(); game.log('回到埃米諾努碼頭'); };

// ---------- 迴圈 ----------
let last = performance.now(), idle = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  galataArt.tick(dt);
  if (!game.isOpen && !game.S.ended) {
    game.step(dt);
    idle += dt; if (idle > 3) { idle = 0; game.advance(1); } // 站著不動也會慢慢天黑：每 3 秒 1 分鐘
  }
  renderer.frame(now);
  panels.prompt();
  requestAnimationFrame(tick);
}

addEventListener('resize', () => renderer.resize());
renderer.resize();
panels.sync();
requestAnimationFrame(tick);

// 給 e2e 測試和除錯用
window.__game = game;
