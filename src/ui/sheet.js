// 互動卡（從畫面底部升起的面板）和猜單字的小視窗。
import { tokenize, guessOptions } from '../game/language.js';
import { clamp } from '../core/util.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function costText(c) {
  if (!c) return '';
  const p = [];
  if (c.min) p.push(c.min + ' 分鐘');
  if (c.money) p.push('₺' + c.money);
  if (c.bat) p.push('電量 ' + c.bat + '%');
  if (c.en) p.push('精力 ' + (c.en > 0 ? '+' : '') + c.en);
  return p.join('・');
}

export class Sheet {
  constructor(game, el, stage) {
    this.game = game; this.el = el; this.stage = stage; this.pop = null;
    document.addEventListener('click', (e) => { if (this.pop && !this.pop.contains(e.target)) this.closePop(); });
  }

  rich(text) {
    const g = this.game;
    return tokenize(text, g.scene.words, g.S.words).map((s) => {
      if (!s.word) return esc(s.text);
      return s.known
        ? `<span class="w known" data-m="${esc(s.meaning)}">${esc(s.text)}</span>`
        : `<span class="w" data-k="${esc(s.word)}" tabindex="0" role="button">${esc(s.text)}</span>`;
    }).join('');
  }

  render() {
    const v = this.game.view();
    if (!v) { this.el.hidden = true; this.closePop(); return; }
    const wasHidden = this.el.hidden;
    this.el.hidden = false;
    const body = v.body.map((b) => `<p class="${b.kind === 'say' ? 'say' : 'body'}">${this.rich(b.text)}</p>`).join('');
    const choices = v.choices.map((c, i) => `<li><button data-i="${i}" ${c.why ? 'disabled' : ''}><span class="n">${i + 1}</span><span>${esc(c.text)}</span><span class="cost">${costText(c.cost)}</span>${c.why ? `<span class="why">${esc(c.why)}</span>` : ''}</button></li>`).join('');
    this.el.innerHTML = `<h2>${esc(v.title)}${v.tag ? `<span class="tag">${esc(v.tag)}</span>` : ''}</h2>`
      + (v.out ? `<p class="out ${v.bad ? 'bad' : ''}">${this.rich(v.out)}</p>` : '')
      + `<div class="body">${body}</div><ul class="choices">${choices}</ul>`;
    this.el.querySelectorAll('.choices button').forEach((b) => (b.onclick = () => this.game.choose(+b.dataset.i)));
    this.el.querySelectorAll('.w[data-k]').forEach((w) => {
      w.onclick = (e) => this.guess(w, e);
      w.onkeydown = (e) => { if (e.key === 'Enter') this.guess(w, e); };
    });
    if (wasHidden || !this.el.contains(document.activeElement)) this.el.querySelector('.choices button:not(:disabled)')?.focus({ preventScroll: true });
  }

  /** 鍵盤 1–9 選選項；Esc 關掉非事件卡 */
  key(e) {
    const v = this.game.view(); if (!v) return false;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9 && v.choices[n - 1] && !v.choices[n - 1].why) { this.game.choose(n - 1); return true; }
    if (e.key === 'Escape' && v.dismissible) { this.game.close(); return true; }
    return false;
  }

  closePop() { if (this.pop) { this.pop.remove(); this.pop = null; } }

  guess(el, e) {
    e.stopPropagation(); this.closePop();
    const g = this.game, k = el.dataset.k, right = g.scene.words[k];
    const opts = guessOptions(g.scene.words, k);
    const pop = (this.pop = document.createElement('div'));
    pop.className = 'pop';
    pop.innerHTML = `<p>「${esc(el.textContent)}」是什麼意思？從情境猜。</p>`
      + opts.map((o) => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')
      + `<button data-o="__phone" ${g.S.bat < 3 ? 'disabled' : ''}>用手機翻譯（電量 3%）</button>`;
    const st = this.stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    pop.style.left = clamp(r.left - st.left, 4, st.width - 190) + 'px';
    pop.style.top = Math.max(8, r.top - st.top - 150) + 'px';
    this.stage.appendChild(pop);
    pop.querySelectorAll('button').forEach((bt) => (bt.onclick = (ev) => {
      ev.stopPropagation();
      const o = bt.dataset.o;
      if (o === '__phone') { g.S.bat = clamp(g.S.bat - 3, 0, 100); g.learn(k, '手機翻譯'); this.closePop(); }
      else if (o === right) { g.S.mem += 1; g.learn(k, '猜對'); this.closePop(); }
      else { bt.disabled = true; g.toast('好像不是這個意思'); }
    }));
  }
}
