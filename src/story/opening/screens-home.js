// 開幕・家裡的清單畫面：標題、出發前大廳、查資料、網購、背包、家族群。
// 第一輪是選單形式；第二輪會搬進手機介面，規則不變。
// 每個畫面：{ enter?(J, arg, flow), view(J, arg, flow) → { img, o, blocks, choices } }
// 選項的 fn(J, flow) 負責改狀態和換畫面；view 本身不能改狀態（會被重畫很多次）。

import { clamp } from '../../core/util.js';
import { KNOW, RESEARCH, ITEMS, LAYERS, TRANS, STOPS } from './data.js';
import { totalKg, cabinKg, layerSum, badCenter, placesFor, overfull, fixWaist, weightWord } from '../../game/journey/bag.js';
import { dateStr, seg, isNight } from '../../game/journey/time.js';
import { nextSeg } from './actions.js';
import { p, back, yuan, homeView, stayName } from './ui-helpers.js';

function title(J) {
  const diary = J.slot('diary'), stamp = J.slot('stamp'), n = J.meta.know.length;
  return {
    img: 'title',
    blocks: [{ kind: 'title', text: '豬肝紅冒險' }, p('一本護照，一個背包，一個還沒有答案的人。', 'story'), ...(n ? [p(`你記得 ${n} 條旅行知識。`, 'sys')] : [])],
    choices: [
      { text: '新的旅程', ico: 'pass', fn: (J, F) => { J.newGame(); F.go('intro'); } },
      ...(diary ? [{ text: `讀取日記：${diary.label}`, ico: 'pen', fn: (J, F) => loadSlot(J, F, 'diary') }] : []),
      ...(stamp ? [{ text: `讀取入境章：${stamp.label}`, ico: 'star', fn: (J, F) => loadSlot(J, F, 'stamp') }] : []),
      ...(diary || stamp || n ? [{ text: '清除所有存檔和旅行知識', ico: 'warn', fn: (J, F) => { J.clearAll(); F.go('title'); } }] : []),
    ],
  };
}

export function loadSlot(J, F, slot) {
  if (!J.load(slot)) return F.go('title');
  J.flash.push(p(slot === 'diary' ? '你翻開日記，回到了那天晚上。' : '你回到了剛蓋完入境章的時候。'));
  F.go(J.S.resume || 'prep');
}

// ---------- 出發前大廳 ----------
const prep = {
  enter(J) {
    const S = J.S;
    S.loc = 'home'; S.place = '家・你的房間'; S.zone = 'home'; S.resume = 'prep';
    if (S.dep != null && S.day > S.dep && !S.flags.missed) {
      S.flags.missed = 1;
      J.flash.push(p(`你錯過了 ${dateStr(S.dep, true)} 的行程，票作廢了（損失 ${yuan(TRANS[S.trans].p * S.depMul)}）。`, 'bad'));
      S.trans = null; S.dep = null; S.tdac = false;
    }
    S.flags.box = S.orders.some((o) => o.got && !o.seen) ? 1 : 0; // 網購剛到：房間裡出現紙箱
    for (const o of S.orders) if (o.got) o.seen = 1;
  },
  view(J) {
    const S = J.S, night = isNight(S.h), depToday = S.dep != null && S.day === S.dep;
    const dc = S.dest && STOPS.find((s) => s.id === S.dest);
    const t = S.trans && TRANS[S.trans];
    const onWay = S.orders.filter((o) => !o.got).length;
    const blocks = [
      p(`${dateStr(S.day)}，${seg(S.h)}。` + (depToday ? '**今天出發。**' : S.dep != null ? `出發日：**${dateStr(S.dep, true)}**（還有 ${S.dep - S.day} 天）。` : '還沒決定什麼時候出發。'), 'sys'),
      { kind: 'check', items: [[!!dc, dc ? `第一站：${dc.n}` : '第一站'], [!!t, t ? `交通：${dateStr(S.dep, true)}` : '交通'], [!!(S.stay || S.cs), '住宿'], [S.tdac, '入境卡'], [S.ins, '保險'], [S.esim, '網路']] },
      ...(S.day >= 4 && S.dep == null ? [p('媽媽在門口探頭：'), p('「整天在家滑手機，到底什麼時候走？」', 'say')] : []),
    ];
    const tooLate = night ? '太晚了' : '';
    const choices = [
      { grp: '規劃' },
      { text: '選第一站', ico: 'plane', x: dc ? `已選：${dc.n}` : '', fn: (J, F) => F.go('dest') },
      { text: '上網查資料', ico: 'info', x: `${S.researched.length}/${RESEARCH.length}・不花時間，但家人會唸`, fn: (J, F) => F.go('research') },
      { text: '訂交通', ico: 'train', x: t ? `${t.n}・${dateStr(S.dep, true)}` : '', why: S.dest ? '' : '先選第一站', fn: (J, F) => F.go(S.trans ? 'booked' : 'trans') },
      { text: '訂住宿', ico: 'bed', x: S.stay || S.cs ? stayName(S) : '', why: S.trans ? '' : '先訂交通', fn: (J, F) => F.go('stay') },
      { text: '辦出國手續', ico: 'pass', x: '保險、eSIM、入境卡、簽證', why: tooLate, fn: (J, F) => F.go('errand') },
      { grp: '行李' },
      { text: '整理背包', ico: 'bag', x: `${totalKg(S).toFixed(1)} kg`, fn: (J, F) => F.go('pack') },
      { text: '網購', ico: 'shop', x: onWay ? `${onWay} 件在路上` : '', why: tooLate, fn: (J, F) => F.go('shop') },
      { text: '去銀行', ico: 'money', x: '換泰銖、領現金', why: night || S.h >= 17 ? '銀行關門了' : '', fn: (J, F) => F.go('bank') },
      { grp: '生活' },
      { text: '和朋友吃頓飯告別', ico: 'food', x: '¥120', why: S.flags.friend ? '吃過了' : S.h < 17 ? '晚上才約得到人' : tooLate, fn: friend },
      { text: '讀書、練英語', ico: 'book', x: '半天', why: tooLate, fn: study },
      { text: '看家族群', ico: 'phone', x: S.msgs.some((m) => !m.done) ? '有新訊息' : '', fn: (J, F) => F.go('family', 'prep') },
      { gap: 1 },
      ...(depToday ? [{ text: '出發！', ico: 'star', x: t.n, why: S.h > t.latest ? '來不及了' : '', fn: (J, F) => F.go('depart') }] : []),
      ...(night ? [] : [{ text: '休息到下一段時間', ico: 'bed', fn: (J, F) => { nextSeg(J); J.add('energy', 8); F.go('prep'); } }]),
      ...(night || S.h >= 19 ? [{ text: '睡覺', ico: 'pen', x: '寫日記存檔', fn: homeSleep }] : []),
    ];
    return homeView(J, blocks, choices, { box: !!S.flags.box });
  },
};

function friend(J, F) {
  J.payCNY(120); if (J.S.over) return;
  J.S.flags.friend = 1; J.until(22.5);
  const good = J.rand() < 0.5;
  if (good) { J.add('faith', 10); J.S.attr.共情 = Math.min(10, J.S.attr.共情 + 1); } else J.add('faith', -6);
  J.add('food', 40);
  J.flash.push(good ? p('阿傑一直說羨慕你。「要是我也敢就好了。」你們喝到很晚。信念 +10，共情 +1', 'good')
    : p('小林在飯桌上一直講他公司的五險一金。散場的時候，你突然有點不確定自己在做什麼。信念 −6', 'bad'));
  F.go('prep');
}

function study(J, F) {
  nextSeg(J);
  J.S.eng = Math.min(10, J.S.eng + 0.25);
  if (J.rand() < 0.4) J.S.attr.學識 = Math.min(10, J.S.attr.學識 + 1);
  J.add('faith', 2);
  J.flash.push(p('你讀了半天英文小說，查了很多單字。'));
  F.go('prep');
}

function homeSleep(J, F) {
  const S = J.S;
  if (S.dep != null && S.day === S.dep) delete S.flags.missed;
  J.writeDiary('家'); J.sleep('home');
  J.flash.push(p(S.dep != null && S.day === S.dep ? '今天是出發的日子。' : '新的一天。'));
  F.go('prep');
}

// ---------- 查資料 ----------
const research = {
  view(J) {
    const S = J.S;
    return homeView(J, [p('在家用手機查資料不花遊戲時間，但查太多，家人會開始說閒話。', 'sys'), ...(S.know.length ? [p(`你已經知道 ${S.know.length} 條旅行知識（在「筆記」裡查看）。`, 'note')] : [])], [
      ...RESEARCH.map((r) => ({
        text: r.n, ico: 'info', x: r.src, why: S.researched.includes(r.id) ? '查過了' : '',
        fn: (J, F) => {
          S.researched.push(r.id);
          const fresh = r.k.filter((k) => J.learn(k));
          S.rToday++; S.family = clamp(S.family + 2, 0, 100);
          if (S.rToday === 3) J.pushMsg(['媽媽', '你一整天都盯著手機，眼睛不要了？']);
          F.go('research.read', { id: r.id, old: fresh.length < r.k.length, nag: S.rToday === 3 });
        },
      })),
      { gap: 1 }, back(),
    ]);
  },
};
const researchRead = {
  view(J, a) {
    const r = RESEARCH.find((x) => x.id === a.id);
    return homeView(J, [
      p(`你查了「${r.n}」。`), ...r.k.map((k) => p(KNOW[k], 'note')),
      ...(a.old ? [p('有些你本來就知道了（上一輪的記憶）。', 'sys')] : []),
      ...(r.id === 'r_region' || r.id === 'r_land' ? [p('第一站的清單上，有些國家的簽證說明變清楚了。', 'good')] : []),
      ...(a.nag ? [p('媽媽在門外喊：「又在滑手機！」', 'warn')] : []),
    ], [{ text: '繼續查', ico: 'info', fn: (J, F) => F.go('research') }, back()]);
  },
};

// ---------- 網購 ----------
const shop = {
  view(J) {
    const S = J.S, list = Object.keys(ITEMS).filter((k) => ITEMS[k].price);
    const orders = S.orders.map((o) => `${ITEMS[o.id].n}${o.got ? '（已到）' : `（${dateStr(o.arrive, true)} 到）`}`);
    return homeView(J, [p('購物 App。快遞兩天到。錢從爸媽給的卡裡扣，大筆支出他們會看到。', 'sys'), ...(orders.length ? [p('訂單：' + orders.join('、'), 'sys')] : [])], [
      ...list.map((id) => {
        const it = ITEMS[id], owned = id in S.items || S.orders.some((o) => o.id === id);
        return {
          text: it.n, ico: 'shop', x: `¥${it.price}　${it.d || ''}`, why: owned ? '已買' : '',
          fn: (J, F) => {
            J.payCNY(it.price); if (S.over) return;
            S.orders.push({ id, arrive: S.day + 2 });
            if (it.price >= 1000) { S.family = clamp(S.family + 8, 0, 100); J.pushMsg(['媽媽', `卡裡怎麼一下少了 ${it.price} 塊？買了什麼？`]); }
            J.add('battery', -1);
            F.go('shop');
          },
        };
      }),
      { gap: 1 }, back(),
    ], { box: 1 });
  },
};

// ---------- 背包（第一輪：選單版） ----------
export function packModel(S) {
  const layers = Object.entries(LAYERS).map(([k, l]) => {
    const s = layerSum(S, k);
    const locked = l.need && !(S.items[l.need] && S.items[l.need] !== 'lost') ? ITEMS[l.need].n : '';
    return { id: k, n: l.n, kg: s.kg, L: s.L, cap: l.L, over: s.L > l.L + 1e-9, theft: l.theft, speed: l.speed, locked };
  });
  const rows = Object.keys(S.items).filter((id) => S.items[id] !== 'lost' && S.items[id] !== 'worn').map((id) => ({
    id, n: ITEMS[id].n, d: ITEMS[id].d || '', kg: ITEMS[id].kg, L: ITEMS[id].L, place: S.items[id],
    options: placesFor(S, id).map((v) => ({ v, n: v === 'home' ? '不帶' : LAYERS[v].n })),
  }));
  const k = totalKg(S);
  return { layers, rows, kg: k, cabin: cabinKg(S), word: weightWord(k), badCenter: badCenter(S) };
}
const pack = {
  view(J) {
    return homeView(J, [p('把東西分配到各個位置。重的東西放中層、靠背最省力；護照和錢放在最難被偷的地方。', 'sys'), { kind: 'pack', model: packModel(J.S) }], [
      { text: '一鍵預設打包', ico: 'bag', x: '不一定是好選擇', fn: (J, F) => F.act('defaultPack') },
      {
        text: '完成', ico: 'back',
        fn: (J, F) => {
          fixWaist(J.S);
          const bad = overfull(J.S);
          if (bad) { J.flash.push(p(`「${LAYERS[bad].n}」塞不下了。`, 'bad')); F.go('pack'); return; }
          J.flash.push(p('背包整理好了。')); F.go('prep');
        },
      },
    ], { bag: 1 });
  },
};

// ---------- 家族群 ----------
const family = {
  view(J, backTo = 'prep') {
    const S = J.S, m = S.msgs.find((x) => !x.done), img = backTo === 'prep' ? 'room' : 'curb';
    if (!m) return { img, blocks: [p('家族群裡沒有新訊息。', 'sys')], choices: [back(backTo)] };
    const net = S.loc === 'home' || S.esim || S.flags.sim;
    const done = (fx) => (J, F) => { m.done = true; fx(J); F.go('family', backTo); };
    return {
      img, blocks: [{ kind: 'msg', from: `${m.from}・${dateStr(m.day, true)}`, text: m.text }],
      choices: [
        { text: '視訊聊一會兒', ico: 'phone', x: '花時間和電量，信念大增', why: !net ? '沒有網路' : S.battery < 8 ? '電量不夠' : '',
          fn: done((J) => { J.advance(0.5); J.add('battery', -6); J.add('faith', 8); S.family = clamp(S.family - 15, 0, 100); J.unlock('family'); }) },
        { text: '傳幾張照片', ico: 'star', x: '不扣電量，信念小增', fn: done((J) => { J.add('faith', 3); S.family = clamp(S.family - 7, 0, 100); }) },
        { text: '故意不回', ico: 'warn', x: '信念會扣一點', fn: done((J) => { J.add('faith', -3); S.family = clamp(S.family + 5, 0, 100); }) },
        back(backTo),
      ],
    };
  },
};

export default { title: { view: title }, prep, research, 'research.read': researchRead, shop, pack, family };
