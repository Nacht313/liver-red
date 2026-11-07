// 開幕的左側狀態欄：角色小圖、錢和時間、地點、外觀描述、數值、小貼士。
// 數值用文字描述（DoL 式），衛生是隱藏數值，只透過外觀和小貼士讓玩家察覺。
import { TIPS, FX } from '../story/opening/data.js';
import { STAT_NAMES } from '../game/journey/journey.js';
import { totalKg, bigUsed, layerSum } from '../game/journey/bag.js';
import { clock, seg, dateStr } from '../game/journey/time.js';

const DESC = {
  energy: [[80, '你精神飽滿。', '#6cc27a'], [60, '你有點累了。', '#9ad07a'], [40, '你很疲憊。', '#c9c25a'], [20, '你累得睜不開眼。', '#e0954a'], [0, '你快撐不住了。', '#e05a5a']],
  food: [[80, '你吃得很飽。', '#6cc27a'], [60, '你不餓。', '#9ad07a'], [40, '你有點餓了。', '#c9c25a'], [20, '你很餓。', '#e0954a'], [0, '你餓得發慌。', '#e05a5a']],
  faith: [[80, '你對這趟旅程充滿期待。', '#6cc27a'], [60, '你覺得自己做了對的選擇。', '#9ad07a'], [40, '你偶爾會懷疑自己。', '#c9c25a'], [20, '你開始想家了。', '#e0954a'], [0, '你快撐不下去了。', '#e05a5a']],
  battery: [[50, '電量充足。', '#6aa8e0'], [20, '電量不多了。', '#c9c25a'], [1, '手機快沒電了。', '#e0954a'], [-1, '手機沒電了。', '#e05a5a']],
  family: [[80, '家裡快炸了。', '#e05a5a'], [60, '媽媽每天都在擔心。', '#e0954a'], [40, '家族群裡開始有人說閒話。', '#c9c25a'], [20, '爸媽偶爾會問起你。', '#9ad07a'], [-1, '家裡很平靜。', '#6cc27a']],
};
export function describe(stat, v) {
  for (const [t, s, c] of DESC[stat]) if (v >= t) return [s, c];
  return DESC[stat].at(-1).slice(1);
}

export function lookText(J) {
  const S = J.S, k = totalKg(S), home = S.loc === 'home';
  const bag = bigUsed(S) ? (home ? `背包已經裝了 ${k.toFixed(1)} 公斤` : `背著一個 ${k.toFixed(1)} 公斤的背包`) : (home ? '背包還是空的' : '沒有背包');
  const cl = home ? '穿著舊 T 恤和睡褲' : `穿著 T 恤和${J.has('pants') ? '長褲' : '短褲'}`;
  const h = S.hyg >= 70 ? '你看起來乾乾淨淨。' : S.hyg >= 45 ? '你的 T 恤上有點汗漬。' : S.hyg >= 25 ? '你身上有股汗味，路人會稍微避開你。' : '你又髒又臭，連自己都受不了。';
  return `你${cl}，${bag}。\n${h}`;
}

export function tipText(J) {
  const S = J.S;
  if (S.hyg < 45) return '你身上的汗味越來越重了，找個地方洗澡吧。';
  if (S.food < 30) return '你餓了。長時間吃太少，精力、飽食和信念的上限都會被鎖住。';
  if (S.battery < 20) return '手機快沒電了。地圖、翻譯和訂房都要靠它。';
  if (S.locks.length) return `有狀態被鎖住了上限：${S.locks.map((l) => l.how).join('；')}。`;
  return TIPS[S.day % TIPS.length];
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderSide(J, el) {
  const S = J.S;
  el.menu.hidden = !S;
  drawPortrait(J, el.por);
  if (!S) { for (const k of ['money', 'place', 'look', 'stats', 'tip']) el[k].innerHTML = ''; return; }
  const visa = S.entry != null ? `<span class="k">泰國免簽</span><span class="r" style="color:var(--gold)">剩 ${S.entry + 30 - S.day} 天</span>` : '';
  el.money.innerHTML = `<span><span class="k">卡</span> ¥${Math.round(S.card).toLocaleString('en-US')}</span>`
    + `<span class="r"><span class="k">現金</span> ¥${Math.round(S.cny).toLocaleString('en-US')}${S.thb ? ` ฿${Math.round(S.thb).toLocaleString('en-US')}` : ''}</span>`
    + `<span>${clock(S.h)} ${seg(S.h)}</span><span class="r">${dateStr(S.day)}</span>${visa}`;
  el.place.textContent = S.place;
  el.look.innerHTML = esc(lookText(J)).replace(/\n/g, '<br>');
  el.stats.innerHTML = [['精力', 'energy'], ['飽食', 'food'], ['信念', 'faith'], ['電量', 'battery'], ['家裡', 'family']].map(([n, k]) => {
    const v = S[k], [s, c] = describe(k, v), cp = k in STAT_NAMES ? J.cap(k) : 100;
    return `<div class="st"><span class="lb">${n}：</span><span style="color:${c}">${s}${k === 'battery' ? ` ${Math.round(v)}%` : ''}</span>`
      + `<div class="bar"><i style="width:${v}%;background:${c}"></i>${cp < 100 ? `<b style="width:${100 - cp}%"></b>` : ''}</div></div>`;
  }).join('');
  el.tip.innerHTML = `<span class="t">小貼士：</span>${esc(tipText(J))}`;
}

/** 96×64 的角色小圖：背包大小、褲子、汗漬、黑眼圈、蒼蠅都會跟著狀態變 */
export function drawPortrait(J, cv) {
  const g = cv.getContext('2d'), W = 96, H = 64, S = J.S;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
  const bg = { home: ['#3a2c3a', '#5a4250'], air: ['#5a7aa0', '#a8c4dc'], plane: ['#7fb8e0', '#dce9f2'], street: ['#22265a', '#6a4a7a'], train: ['#6f9a7a', '#bfd8c0'] }[S?.zone] || ['#3a2c3a', '#5a4250'];
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, bg[0]); grad.addColorStop(1, bg[1]);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 56, W, 8);
  if (!S) return;
  if (S.zone !== 'home' && (S.h >= 19 || S.h < 6)) { g.fillStyle = 'rgba(14,12,44,.55)'; g.fillRect(0, 0, W, H); }
  const P = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const cx = 44, big = bigUsed(S);
  if (big) {
    const v = ['top', 'mid', 'bot'].reduce((a, l) => a + layerSum(S, l).L, 0), bh = Math.round(10 + Math.min(14, v / 3));
    P('#6e4428', cx + 7, 30 - Math.round(bh / 2) + 4, 8, bh); P('#8e5a36', cx + 8, 31 - Math.round(bh / 2) + 5, 6, 3);
  }
  const leg = J.has('pants') || S.loc === 'home' ? '#34405e' : '#4a5a7a';
  P(leg, cx - 4, 40, 4, 13); P(leg, cx + 1, 40, 4, 13); P('#e8e8ea', cx - 5, 53, 5, 2); P('#e8e8ea', cx + 1, 53, 5, 2);
  const shirt = S.hyg < 45 ? '#d8d0b8' : '#ecebe6';
  P(shirt, cx - 6, 27, 13, 14); P(shirt, cx - 8, 28, 3, 9); P(shirt, cx + 6, 28, 3, 9);
  P('#e3b994', cx - 8, 37, 3, 3); P('#e3b994', cx + 6, 37, 3, 3);
  if (big) { P('#5a3420', cx - 4, 27, 2, 10); P('#5a3420', cx + 3, 27, 2, 10); }
  if (J.has('belt')) P('#3a3a3a', cx - 6, 39, 13, 2);
  if (S.hyg < 45) { P('#b8ae92', cx - 6, 30, 2, 4); P('#b8ae92', cx + 5, 30, 2, 4); }
  P('#e3b994', cx - 4, 15, 9, 11); P('#e3b994', cx - 5, 18, 1, 4); P('#e3b994', cx + 5, 18, 1, 4);
  P('#1c1a20', cx - 5, 12, 11, 5); P('#1c1a20', cx - 5, 16, 2, 3); P('#1c1a20', cx + 4, 16, 2, 2);
  const tired = S.energy < 35;
  P('#2a2228', cx - 3, 20, 2, tired ? 1 : 2); P('#2a2228', cx + 2, 20, 2, tired ? 1 : 2);
  if (tired) { P('#b88a7a', cx - 3, 22, 2, 1); P('#b88a7a', cx + 2, 22, 2, 1); }
  P(S.faith < 35 ? '#9a6a5a' : '#b8786a', cx - 1, 24, 3, 1);
  if (S.faith >= 70) { P('#b8786a', cx - 2, 23, 1, 1); P('#b8786a', cx + 2, 23, 1, 1); }
  if (S.hyg < 25) { for (const [x, y] of [[cx - 10, 10], [cx + 10, 8], [cx + 12, 14]]) { P('#8a9a5a', x, y, 1, 3); P('#8a9a5a', x + 1, y - 1, 1, 1); } }
  if (S.battery < 15) P('#e05a5a', W - 10, 4, 6, 3);
}

export const walletRows = (J) => [['銀聯卡（爸媽的錢）', `¥${Math.round(J.S.card).toLocaleString('en-US')}`], ['人民幣現金', `¥${Math.round(J.S.cny).toLocaleString('en-US')}`],
  ['泰銖現金', `฿${Math.round(J.S.thb).toLocaleString('en-US')}`], ['總共約', `¥${Math.round(J.money()).toLocaleString('en-US')}（1 人民幣 ≈ ${FX.THB} 泰銖）`]];
