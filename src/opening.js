// 開幕的進入點：旅程邏輯（Journey + Flow）接上文字場景介面，從標題畫面開始。
import { Journey } from './game/journey/journey.js';
import { Flow } from './game/journey/flow.js';
import { TextGame } from './ui/textgame.js';
import story from './story/opening/index.js';

const $ = (id) => document.getElementById(id);

const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v === 'null') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* 私密瀏覽等情況存不了 */ } },
};

function toast(msg) {
  const box = $('toast'), d = document.createElement('div');
  d.textContent = msg; box.appendChild(d);
  setTimeout(() => d.remove(), 4200);
  while (box.children.length > 3) box.firstChild.remove();
}

let ui = null;
const J = new Journey({ storage, toast, change: () => ui?.render() });
const F = new Flow(J, story);
ui = new TextGame(J, F, {
  scene: $('scene'), text: $('text'), ch: $('ch'), ov: $('ov'), ovb: $('ovb'), menu: $('menu'),
  por: $('por'), money: $('money'), place: $('place'), look: $('look'), stats: $('stats'), tip: $('tip'),
});
F.go(story.start);

// e2e 測試用
window.__journey = { J, F };
