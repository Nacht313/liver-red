// 文字場景的介面（DoL 式）：插圖、敘述、編號選項，加上屬性／背包／手機／護照／筆記／存檔面板。
// 只負責把 Flow 的畫面資料畫出來，狀態一律交給 Journey 和 Flow。
import { paint } from '../render/paint.js';
import { icon } from './icons.js';
import { renderSide, walletRows } from './journey-side.js';
import { STAT_NAMES } from '../game/journey/journey.js';
import { KNOW, ITEMS, LAYERS, ATTRS } from '../story/opening/data.js';
import { totalKg, cabinKg } from '../game/journey/bag.js';
import { dateStr } from '../game/journey/time.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** 劇情文字的小標記：**粗體**、換行 */
export const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
const kg = (n) => n.toFixed(2);

export class TextGame {
  constructor(J, F, el) {
    this.J = J; this.F = F; this.el = el;
    for (const [id, fn] of Object.entries({ mAttr: () => this.attrPanel(), mBag: () => this.bagPanel(), mPhone: () => this.phonePanel(), mPass: () => this.passPanel(), mNote: () => this.notePanel(), mSave: () => this.savePanel() })) {
      document.getElementById(id).onclick = () => { if (J.S || id === 'mSave') fn(); };
    }
    el.ov.addEventListener('click', (e) => { if (e.target === el.ov) this.closeOv(); });
    addEventListener('keydown', (e) => this.key(e));
  }

  render() {
    const v = this.F.view(), el = this.el;
    if (!v) return;
    if (this.lastId !== v.id || this.lastImg !== v.img + JSON.stringify(v.o)) {
      el.scene.innerHTML = paint(v.img, v.o);
      this.lastImg = v.img + JSON.stringify(v.o);
    }
    el.text.innerHTML = v.blocks.map((b) => this.block(b)).join('');
    let n = 0;
    el.ch.innerHTML = v.choices.map((c) => {
      if (c.grp) return `<div class="grp">${esc(c.grp)}</div>`;
      if (c.gap) return '<div class="gap"></div>';
      n++; const key = n < 10 ? String(n) : n === 10 ? '0' : '';
      return `<button class="c" data-i="${n - 1}" data-k="${key}" ${c.why ? 'disabled' : ''}><img src="${icon(c.ico)}" alt=""><span class="n">${key ? `(${key})` : ''}</span>`
        + `<span>${c.dot ? `<span class="dot" style="color:${c.dot}">●</span> ` : ''}${rich(c.text)}</span>${c.why ? `<span class="x">${esc(c.why)}</span>` : c.x ? `<span class="x">${rich(c.x)}</span>` : ''}</button>`;
    }).join('');
    el.ch.querySelectorAll('.c').forEach((b) => (b.onclick = () => this.F.choose(+b.dataset.i)));
    el.text.querySelectorAll('select[data-id]').forEach((s) => (s.onchange = () => this.F.act('setPlace', { id: s.dataset.id, place: s.value })));
    renderSide(this.J, el);
    if (this.lastId !== v.id) { scrollTo({ top: 0 }); this.lastId = v.id; }
  }

  block(b) {
    switch (b.kind) {
      case 'title': return `<h1 class="title">${esc(b.text)}</h1>`;
      case 'endTitle': return `<h2 class="endTitle">${esc(b.text)}</h2>`;
      case 'say': return `<p class="say">${rich(b.text)}</p>`;
      case 'note': return `<div class="note">${rich(b.text)}</div>`;
      case 'msg': return `<div class="msg">${b.from ? `<div class="f">${esc(b.from)}</div>` : ''}${rich(b.text)}</div>`;
      case 'check': return `<div class="cklist">${b.items.map(([ok, t]) => `<span class="ck ${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${esc(t)}</span>`).join('')}</div>`;
      case 'table': return `<div class="tbl"><table>${b.rows.map(([a, c]) => `<tr><td>${esc(a)}</td><td class="n">${esc(c)}</td></tr>`).join('')}</table></div>`;
      case 'pack': return this.packBlock(b.model);
      default: return `<p class="${esc(b.kind)}">${rich(b.text)}</p>`;
    }
  }

  packBlock(m) {
    const lay = m.layers.map((l) => (l.locked ? `<div style="opacity:.5"><div class="h">${esc(l.n)}</div>需要「${esc(l.locked)}」</div>`
      : `<div><div class="h">${esc(l.n)}</div>${kg(l.kg)} kg・<span class="${l.over ? 'over' : ''}">${l.L.toFixed(1)}/${l.cap} L</span><div class="meter ${l.over ? 'o' : ''}"><i style="width:${Math.min(100, (l.L / l.cap) * 100)}%"></i></div><span style="color:var(--dim)">被偷風險 ${esc(l.theft)}・拿取 ${esc(l.speed)}</span></div>`)).join('');
    const word = m.kg <= 8 ? 'good' : m.kg <= 11 ? 'warn' : 'bad';
    const rows = m.rows.map((r) => `<tr><td>${esc(r.n)}${r.d ? `<div style="color:var(--dim);font-size:12px">${esc(r.d)}</div>` : ''}</td><td class="n">${r.kg}</td><td class="n">${r.L}</td>`
      + `<td><select data-id="${r.id}" aria-label="${esc(r.n)} 的位置">${r.options.map((o) => `<option value="${o.v}" ${o.v === r.place ? 'selected' : ''}>${esc(o.n)}</option>`).join('')}</select></td></tr>`).join('');
    return `<div class="lyr">${lay}</div><p class="pk-foot">總重 <b>${kg(m.kg)} kg</b>（<span class="${word}">${m.word}</span>）・手提行李部分 ${kg(m.cabin)} kg${m.badCenter ? '・<span class="warn">重的東西放在上層或下層，重心不穩，走路更累</span>' : ''}</p>`
      + `<div class="tbl"><table><thead><tr><th>物品</th><th class="n">kg</th><th class="n">L</th><th>位置</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  key(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (!this.el.ov.hidden) { if (e.key === 'Escape') this.closeOv(); return; }
    if (/^[0-9]$/.test(e.key)) {
      const b = [...this.el.ch.querySelectorAll('.c')].find((x) => x.dataset.k === e.key);
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    }
  }

  // ---------- 面板 ----------
  openOv(html) {
    this.el.ovb.innerHTML = html + '<button class="close">關閉 Esc</button>';
    this.el.ov.hidden = false;
    this.el.ovb.querySelector('.close').onclick = () => this.closeOv();
  }
  closeOv() { this.el.ov.hidden = true; }

  attrPanel() {
    const S = this.J.S, pips = (v) => `<span class="pips">${[...Array(10)].map((_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span>`;
    this.openOv(`<h2>屬性</h2>${ATTRS.map((a) => `<div class="attr"><span>${a}</span>${pips(S.attr[a])}<span>${S.attr[a]}</span></div>`).join('')}`
      + `<div class="attr"><span>英語</span>${pips(Math.floor(S.eng))}<span>${S.eng.toFixed(1)}</span></div>`
      + `<h3>思想櫃</h3>${S.thoughts.map((t) => `<div class="msg"><div class="f">${t.got >= t.need ? '已消化' : `消化中 ${t.got}/${t.need} 天`}</div><b>${esc(t.n)}</b><br>${esc(t.eff)}</div>`).join('')}`
      + `<h3>上限鎖</h3>${S.locks.length ? S.locks.map((l) => `<div class="msg">${l.stat === 'all' ? '精力、飽食、信念' : STAT_NAMES[l.stat]}的上限被鎖在 ${l.cap}。解鎖：${esc(l.how)}</div>`).join('')
        : '<p style="color:var(--dim)">目前沒有。長時間吃太少、太久沒洗澡、家人壓力滿了，都會鎖住上限。</p>'}`);
  }

  bagPanel() {
    const S = this.J.S;
    const by = Object.entries(LAYERS).map(([k, l]) => {
      const ids = Object.keys(S.items).filter((i) => S.items[i] === k);
      return ids.length ? `<h3>${l.n} <span style="color:var(--dim);font-weight:400;font-size:13px">被偷風險 ${l.theft}</span></h3><p>${ids.map((i) => ITEMS[i].n).join('、')}</p>` : '';
    }).join('');
    const worn = Object.keys(S.items).filter((i) => S.items[i] === 'worn'), lost = Object.keys(S.items).filter((i) => S.items[i] === 'lost');
    this.openOv(`<h2>背包</h2><p>總重 ${totalKg(S).toFixed(2)} kg・手提部分 ${cabinKg(S).toFixed(2)} kg</p>${by}`
      + (worn.length ? `<h3>穿在身上</h3><p>${worn.map((i) => ITEMS[i].n).join('、')}</p>` : '') + (lost.length ? `<h3>丟掉的</h3><p>${lost.map((i) => ITEMS[i].n).join('、')}</p>` : ''));
  }

  phonePanel() {
    const S = this.J.S;
    this.openOv(`<h2>手機 <span style="font-size:14px;color:var(--dim)">${Math.round(S.battery)}%</span></h2><h3>錢包</h3><div class="tbl"><table>${walletRows(this.J).map(([a, b]) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`).join('')}</table></div>`
      + `<h3>訊息</h3>${S.msgs.length ? S.msgs.slice(0, 8).map((m) => `<div class="msg"><div class="f">${esc(m.from)}・${dateStr(m.day, true)}${m.done ? '' : '・未讀'}</div>${esc(m.text)}</div>`).join('') : '<p style="color:var(--dim)">沒有訊息。</p>'}`);
  }

  passPanel() {
    const S = this.J.S;
    this.openOv(`<h2>護照</h2><p>中華人民共和國普通護照・豬肝紅色</p>${S.entry != null ? `<p>泰國免簽：允許停留至 <b>${dateStr(S.entry + 29, true)}</b>（剩 ${S.entry + 30 - S.day} 天）</p>` : ''}`
      + `<p>TDAC：${S.tdac ? '已填' : '未填'}${S.laosVisa != null ? `　寮國電子簽：${S.day >= S.laosVisa ? '已批准' : '審核中'}` : ''}</p>`
      + `<div>${S.stamps.length ? S.stamps.map((s) => `<span class="stamp ${s.t.includes('出境') ? 'tl' : ''}">${esc(s.c)}<br>${esc(s.t)}<br>${dateStr(s.d, true)}</span>`).join('') : '<p style="color:var(--dim)">還沒有任何章。</p>'}</div>`);
  }

  notePanel() {
    const S = this.J.S;
    this.openOv(`<h2>筆記</h2><h3>旅行知識（${S.know.length}/${Object.keys(KNOW).length}）</h3>`
      + (S.know.map((k) => `<div class="note">${esc(KNOW[k])}</div>`).join('<div class="gap"></div>') || '<p style="color:var(--dim)">查資料、問人，或者吃虧，都會學到東西。學到的知識會留到下一輪。</p>'));
  }

  savePanel() {
    const d = this.J.slot('diary'), s = this.J.slot('stamp');
    this.openOv('<h2>日記與存檔</h2><p>這個遊戲沒有隨時存檔。</p><div class="note"><b>日記</b>：睡在床上時，睡前寫日記就會存檔。露宿不能存檔。<br><br><b>入境章</b>：每次入境蓋章時自動存檔。<br><br><b>旅行知識</b>：不管怎麼失敗，學到的都會留下來。</div>'
      + `<p>日記：${d ? esc(d.label) : '沒有'}<br>入境章：${s ? esc(s.label) : '沒有'}</p>`);
  }
}
