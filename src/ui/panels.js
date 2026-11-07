// HUD、互動提示、spot 設定表、筆記本、相片、經過紀錄、toast。
import { SPOT_STATE_LABEL } from '../game/game.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Panels {
  constructor(game, renderer, els) {
    this.game = game; this.r = renderer; this.els = els; this.lastNear = undefined; this.tt = 0;
  }

  hud() {
    const S = this.game.S;
    const bc = S.bat < 15 ? 'var(--bad)' : S.bat < 35 ? 'var(--gold)' : 'var(--good)';
    const ec = S.en < 20 ? 'var(--bad)' : S.en < 45 ? 'var(--gold)' : 'var(--good)';
    this.els.hud.innerHTML = `<span class="chip"><span class="lbl">時間</span><b>${this.game.clock()}</b></span>
      <span class="chip"><span class="lbl">錢</span><b>₺${S.money}</b></span>
      <span class="chip"><span class="lbl">電量</span><span class="bar"><i style="width:${S.bat}%;background:${bc}"></i></span>${Math.round(S.bat)}%</span>
      <span class="chip"><span class="lbl">精力</span><span class="bar"><i style="width:${S.en}%;background:${ec}"></i></span>${Math.round(S.en)}</span>`;
  }

  table() {
    const g = this.game;
    const rows = g.scene.spots.map((s) => {
      const st = g.stateOf(s), d = s.design;
      const trig = s.trigger.kind === 'interact' ? '按 E' : s.trigger.kind === 'pass' ? (s.trigger.dir > 0 ? '往右經過' : '往左經過') : `時間到 ${g.clock(s.trigger.at)}`;
      return `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.type)}</td><td>${trig}</td><td>${esc(d.cond)}</td><td class="x">${s.x == null ? '—' : s.x}${s.reveal ? ' ±' + s.reveal : ''}</td><td>${esc(d.cost)}</td><td>${esc(d.reward)}</td><td><span class="st ${st}">${SPOT_STATE_LABEL[st]}</span></td></tr>`;
    }).join('');
    this.els.table.innerHTML = `<thead><tr><th>Spot</th><th>類型</th><th>觸發</th><th>出現條件</th><th>位置／發現距離</th><th>代價</th><th>獎勵</th><th>狀態</th></tr></thead><tbody>${rows}</tbody>`;
  }

  side() {
    const g = this.game, S = g.S;
    this.els.words.innerHTML = Object.keys(g.scene.words).map((k) => (S.words[k] ? `<li>${esc(k)}・${esc(g.scene.words[k])}</li>` : '<li class="no">？？？</li>')).join('');
    this.els.photos.innerHTML = S.photos.length
      ? S.photos.map((p) => `<figure><img src="${p.src}" alt="${esc(p.name)}"><figcaption>${esc(p.name)}・${p.time}　<b>${p.score}</b></figcaption></figure>`).join('')
      : '<p class="empty">還沒拍照。光線最好的時候是日落前後。</p>';
    this.els.log.innerHTML = S.log.map((l) => `<li>${esc(l)}</li>`).join('') || '<li>剛到埃米諾努碼頭。</li>';
  }

  sync() { this.hud(); this.table(); this.side(); }

  toast(msg) {
    const e = this.els.toast;
    e.textContent = msg; e.classList.add('on');
    clearTimeout(this.tt); this.tt = setTimeout(() => e.classList.remove('on'), 1800);
  }

  /** 每一幀：玩家旁邊有 spot 就顯示「E + 名稱」提示 */
  prompt() {
    const g = this.game, el = this.els.act;
    const s = !g.isOpen && !g.S.ended ? g.nearSpot() : null;
    if (!s) { if (!el.hidden) el.hidden = true; this.lastNear = null; return; }
    if (this.lastNear !== s.id) { el.innerHTML = `<kbd>E</kbd>${esc(s.name)}`; this.lastNear = s.id; el.hidden = false; }
    const p = this.r.toCss(s.x, g.scene.world.deck - 26);
    el.style.left = p.left + 'px'; el.style.top = p.top + 'px';
  }
}
