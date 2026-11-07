// 開幕・上路之後的畫面：國內機場、飛行、泰國入境、機場出口、進市區、抵達、結局。

import { ITEMS, LAYERS, TRANS, FLIGHT, ENDINGS, CABIN_LIMIT_KG, EXTRA_BAG_COUNTER, AIRPORT_THB_PER_CNY, FX } from './data.js';
import { cabinKg, carried, tryPut } from '../../game/journey/bag.js';
import { clock, isNight } from '../../game/journey/time.js';
import { END } from '../../game/journey/flow.js';
import { p, thb } from './ui-helpers.js';
import { loadSlot } from './screens-home.js';

const airName = (S) => ({ BKK: '素萬那普機場（BKK）', DMK: '廊曼機場（DMK）' }[TRANS[S.trans].air] || '');
const inBigPack = (S, id) => ['top', 'mid', 'bot'].includes(S.items[id]);
const go = (id, arg) => (J, F) => F.go(id, arg);
/** 回到標題：先放下目前的旅程（結局畫面的狀態不帶回標題） */
const toTitle = (J, F) => { J.S = null; F.go('title'); };

// ---------- 國內機場 ----------
const airport = {
  enter(J) {
    const S = J.S, t = TRANS[S.trans];
    S.place = '國內機場・出發大廳'; S.zone = 'air';
    if (!S.flags.atAirport) { S.flags.atAirport = 1; if (S.h < t.airportAt) J.advance(t.airportAt - S.h, { weight: 1 }); }
  },
  view(J) {
    const S = J.S, t = TRANS[S.trans], blocks = [p(`${clock(S.h)}，你到了機場。`)];
    const img = { img: 'airport' };
    if (t.lcc && !S.extraBag) {
      const k = cabinKg(S);
      if (k > CABIN_LIMIT_KG) {
        blocks.push(p(`廉航櫃台把你的背包放上秤：**${k.toFixed(1)} kg**。手提行李只能 7 公斤。`), p('「超重了，要加購托運。」', 'say'));
        return { ...img, blocks, choices: [
          { text: '在櫃台加購托運', ico: 'money', x: `¥${EXTRA_BAG_COUNTER}`, fn: (J, F) => { J.payCNY(EXTRA_BAG_COUNTER); if (S.over) return; J.learn('k_lcc'); S.extraBag = true; F.go('airport'); } },
          ...(k - CABIN_LIMIT_KG <= 1.6 ? [{ text: '把外套穿上、東西塞進褲袋', ico: 'walk', x: '穿在身上的不算重量，但會很熱很狼狽', fn: wearIt }] : []),
          { text: '把最重的東西丟掉', ico: 'warn', x: '丟到手提低於 7 公斤為止', fn: dumpIt },
        ] };
      }
      blocks.push(p(`手提行李 ${k.toFixed(1)} kg，剛好過關。`, 'good'));
    }
    const checked = !t.lcc || S.extraBag;
    if (checked && !S.flags.pbChecked && inBigPack(S, 'pbank')) {
      blocks.push(p('托運之後沒多久，廣播叫你的名字。'), p('「你的托運行李裡有行動電源，請到安檢處開箱取出。」', 'say'));
      return { ...img, blocks, choices: [{ text: '跑去安檢處把它拿出來', ico: 'warn', x: '時間和精力', fn: (J, F) => {
        S.flags.pbChecked = 1; J.advance(0.75, { tiring: 4 });
        if (!tryPut(S, 'pbank', ['day', 'pocket'])) S.items.pbank = 'worn';
        J.learn('k_pbank'); F.go('airport');
      } }] };
    }
    if (checked) blocks.push(p('大背包托運了，你只背著隨身的東西。', 'sys'));
    return { ...img, blocks, choices: [{ text: '過邊檢', ico: 'pass', fn: go('exit') }] };
  },
};
const handLuggage = (S) => Object.keys(S.items).filter((id) => carried(S, id) && LAYERS[S.items[id]] && !LAYERS[S.items[id]].body);

function wearIt(J, F) {
  const S = J.S;
  for (const id of ['jacket', 'pbank', 'novel', 'charger', 'meds', 'notebook']) {
    if (cabinKg(S) > CABIN_LIMIT_KG && handLuggage(S).includes(id)) S.items[id] = 'worn';
  }
  if (cabinKg(S) <= CABIN_LIMIT_KG) { S.hyg = Math.max(0, S.hyg - 10); J.add('faith', -3); J.learn('k_lcc'); }
  F.go('airport');
}
function dumpIt(J, F) {
  const S = J.S, lost = [];
  while (cabinKg(S) > CABIN_LIMIT_KG) {
    const id = handLuggage(S).filter((i) => !ITEMS[i].must).sort((a, b) => ITEMS[b].kg - ITEMS[a].kg)[0];
    if (!id) break;
    S.items[id] = 'lost'; lost.push(ITEMS[id].n);
  }
  J.learn('k_lcc'); J.add('faith', -6);
  J.flash.push(p(`你在垃圾桶旁邊丟掉了：${lost.join('、')}。`, 'bad'));
  F.go('airport');
}

// ---------- 飛行 ----------
const flight = {
  enter(J) {
    const S = J.S, t = TRANS[S.trans], f = FLIGHT[S.trans];
    S.loc = 'plane'; S.zone = 'plane'; S.place = '飛機上';
    J.until(t.departAt);
    J.advance(t.hours, { tiring: 2, charging: !!f.charge });
    if (f.pay) J.payCNY(f.pay);
    J.add('food', f.food); J.add('energy', f.en);
    S.h -= 1; if (S.h < 0) { S.h += 24; S.day--; } // 泰國比國內慢一小時
  },
  view(J) {
    const S = J.S, f = FLIGHT[S.trans];
    return { img: 'plane', o: { tod: f.tod }, blocks: [p(f.text), p(`飛機降落在曼谷${airName(S)}。當地時間 ${clock(S.h)}（比國內慢一小時）。`)],
      choices: [{ text: '下飛機', ico: 'walk', fn: go('imm') }] };
  },
};

// ---------- 泰國入境 ----------
const imm = {
  enter(J) {
    const S = J.S;
    S.loc = 'abroad'; S.zone = 'air'; S.place = S.flags.landEntry ? '廊開・泰國入境處' : '泰國入境處';
    if (S.tdac && S.flags.immAsked == null) {
      S.flags.immAsked = J.rand() < 0.4 || S.hyg < 40 || S.tdacAddr === 'fake' ? 1 : 0;
      if (S.tdacAddr === 'fake') J.learn('k_onward');
      if (S.eng < 3) J.add('faith', -2);
    }
  },
  view(J) {
    const S = J.S;
    if (!S.tdac) {
      const fill = (hours, o) => (J, F) => { J.advance(hours, o); S.tdac = true; S.tdacAddr = S.stay || S.cs ? 'ok' : 'fake'; J.learn('k_tdac'); F.go('imm'); };
      return { img: 'imm', blocks: [p('排到一半，你看到牆上的告示：**所有旅客必須出示 TDAC。**你沒填。')], choices: [
        { text: '用手機現場填', ico: 'phone', x: '要網路和電量', why: S.battery < 6 ? '手機沒電' : '', fn: (J, F) => { J.add('battery', -6); fill(0.75, {})(J, F); } },
        { text: '去自助機填', ico: 'info', x: '排很久', fn: fill(1.5, { tiring: 2 }) },
      ] };
    }
    const fluent = S.eng >= 3;
    const talk = [p('輪到你了。移民官看著你的護照，又看看你。'), p('「Where you stay in Thailand?」', 'say'), p(fluent ? '你流利地回答了。' : '你結結巴巴地說了地址，手心都是汗。', fluent ? 'p' : 'warn')];
    const stampWith = (extra) => (J, F) => { J.flash.push(...talk, ...extra); F.go('stamp'); };
    if (!S.flags.immAsked) return { img: 'imm', blocks: talk, choices: [{ text: '遞上護照', ico: 'pass', fn: stampWith([]) }] };
    const ask = [...talk, p('「Show me money. Ten thousand baht.」', 'say'), p(`你身上的現金折合約 ${thb(J.cashTHB())} 銖。`, 'sys')];
    if (J.cashTHB() >= 10000) {
      return { img: 'imm', blocks: ask, choices: [{ text: '把錢包打開給他看', ico: 'money', fn: (J, F) => { J.flash.push(...ask, p('你把錢包打開給他看。他點點頭。', 'good')); F.go('stamp'); } }] };
    }
    const brave = S.attr.膽識 >= 3 || S.eng >= 3;
    return { img: 'imm', blocks: [...ask, p('不夠一萬銖。', 'bad')], choices: [
      { text: '打開手機銀行給他看卡裡的餘額', ico: 'phone', x: '要電量', why: S.battery < 3 ? '手機沒電了' : '',
        fn: (J, F) => { J.add('battery', -2); J.learn('k_funds'); J.flash.push(p('他盯著螢幕看了很久，終於拿起了章。', 'warn')); F.go('stamp'); } },
      { text: '跟他解釋', ico: 'info', x: brave ? '膽識或英語夠高' : '膽識和英語都不夠',
        fn: (J, F) => { J.learn('k_funds'); if (!brave) { J.end('refused'); return; } J.flash.push(p('你冷靜地解釋了你的行程和住處。他揮揮手。', 'good')); F.go('stamp'); } },
    ] };
  },
};

// ---------- 機場出口 ----------
const curb = {
  enter(J, arg, F) {
    const S = J.S;
    S.place = S.flags.landEntry ? '曼谷・Krung Thep Aphiwat 中央車站' : `曼谷・${airName(S)}`;
    S.zone = 'air';
  },
  view(J, arg, F) {
    const S = J.S;
    if (S.flags.landEntry && !S.flags.landArrived) return { img: 'train', o: { tod: 'night' }, blocks: [p('入境辦好了。夜車還在月台上等著。')], choices: [{ text: '回到車上', ico: 'train', fn: go('land.train2') }] };
    if (S.cs === 'jay' && !S.flags.jayAsked) return { img: 'curb', blocks: [p('你走出入境大廳，手機震了一下。')], choices: [{ text: '看手機', ico: 'phone', fn: go('jay.call') }] };
    const late = isNight(S.h), net = S.esim || S.flags.sim, land = !!S.flags.landEntry, bkk = TRANS[S.trans].air === 'BKK' && !land;
    const rate = Math.round(500 * AIRPORT_THB_PER_CNY);
    const ride = (n, tire, text, why = '') => ({ thb: n, tire, text, why });
    const rides = land
      ? [['搭地鐵＋計程車', 'train', '約 200 ฿', ride(200, 1.2, '你在早高峰的地鐵裡被擠成了沙丁魚。')],
        ['叫 Grab', 'phone', '約 250 ฿，要網路', ride(250, 0.8, 'Grab 司機一路放著泰國流行歌。', net ? '' : '沒有網路')]]
      : bkk
        ? [['搭機場快線，再轉計程車', 'train', '約 45 + 150 ฿', ride(195, 1.3, '機場快線高架穿過城市，窗外的高樓一棟接一棟。', late ? '快線已經停了' : '')],
          ['排官方計程車', 'walk', '跳錶約 300 ＋ 機場附加費 50 ＋ 過路費 75 ฿', ride(425, 1, '司機一上車就把跳錶打開了。')],
          ['叫 Grab', 'phone', '約 500 ฿，要網路', ride(500, 1, 'Grab 很快就到了。', net ? '' : '沒有網路')]]
        : [['搭 A4 機場巴士到考山路', 'train', '約 60 ฿', ride(60, 1.4, '巴士塞在車陣裡，晃了一個多小時。', late ? '這個時間沒有巴士了' : '')],
          ['排官方計程車', 'walk', '約 350 ฿', ride(350, 0.9, '計程車開上高速公路，城市的燈光越來越密。')],
          ['叫 Grab', 'phone', '約 400 ฿，要網路', ride(400, 0.9, 'Grab 很快就到了。', net ? '' : '沒有網路')]];
    return {
      img: 'curb',
      blocks: [p(`${clock(S.h)}。熱浪撲面而來，空氣又濕又黏。`), net ? p('手機一開機就有網路了。', 'good') : p('手機沒有網路，只能連機場 Wi-Fi。', 'sys'), p(`身上的泰銖：${thb(S.thb)} ฿`, 'sys')],
      choices: [
        { grp: '在這裡' },
        { text: '買觀光 SIM 卡', ico: 'phone', x: net ? '已經有網路' : '299 ฿・8 天', why: net ? '已有網路' : '', fn: (J, F) => { J.payTHB(299); S.flags.sim = 1; J.flash.push(p('有網路了。')); F.go('curb'); } },
        { text: '在換匯櫃台換 ¥500 的泰銖', ico: 'money', x: `約 ${thb(rate)} ฿（${land ? '車站' : '機場'}匯率比市區差）`, why: S.cny < 500 ? '人民幣現金不夠' : '',
          fn: (J, F) => { S.cny -= 500; S.thb += rate; J.learn('k_rate'); J.flash.push(p(`你換到了 ${thb(rate)} 銖。`)); F.go('curb'); } },
        { text: '用銀聯卡在 ATM 提 3,000 ฿', ico: 'money', x: '手續費 220 ฿', why: S.card * FX.THB < 3300 ? '卡裡錢不夠' : '',
          fn: (J, F) => { S.card -= Math.round(3220 / FX.THB); S.thb += 3000; J.flash.push(p('ATM 吐出了 3,000 銖，扣了 220 銖手續費。')); F.go('curb'); } },
        { text: '看家族群', ico: 'phone', x: S.msgs.some((m) => !m.done) ? '有新訊息' : '', fn: go('family', 'curb') },
        { grp: '去市區' },
        ...rides.map(([text, ico, x, r]) => ({ text, ico, x, why: r.why, fn: go('ride', r) })),
        { text: '「Taxi? Taxi? Cheap cheap!」', ico: 'warn', x: '出口拉客的司機',
          fn: (J, F) => { if (J.knows('k_taxi')) { J.flash.push(p('你想起了攻略，搖搖頭走開了。')); F.go('curb'); } else F.go('tout'); } },
        ...(late ? [{ text: '在機場長椅上等到天亮', ico: 'bed', x: '省錢，但睡不好', fn: (J, F) => { J.sleep('bench'); J.flash.push(p('天亮了，你的脖子痠得要命。')); F.go('curb'); } }] : []),
      ],
    };
  },
};

const ride = {
  enter(J, r) {
    const S = J.S;
    if (S.thb < r.thb) return;
    S.thb -= r.thb; S.flags.rode = 1;
    J.advance(1, { tiring: 1.6 * r.tire, weight: 1 });
    S.place = '往市區的路上'; S.zone = 'street';
  },
  view(J, r) {
    const S = J.S;
    if (!S.flags.rode) return { img: 'curb', blocks: [p(`你身上只有 ${thb(S.thb)} 泰銖，不夠付車費。先換錢或去 ATM 提款。`, 'bad')], choices: [{ text: '回到大廳', ico: 'back', fn: go('curb') }] };
    return { img: 'ride', blocks: [p(r.text), p(`你花了 ${r.thb} 銖。`, 'sys')],
      choices: [{ text: '抵達考山路', ico: 'walk', fn: (J, F) => F.go(S.cs === 'jay' && S.flags.jayDecline ? 'jay.flat' : 'city') }] };
  },
};

// ---------- 抵達（開幕結束，接第一個國家） ----------
const city = {
  enter(J) { const S = J.S; S.place = '曼谷・考山路'; S.zone = 'street'; S.loc = 'abroad'; },
  view(J) {
    const S = J.S, spent = S.start - J.money();
    return {
      img: 'khaosan',
      blocks: [
        p('計程車在考山路口停下。霓虹燈、油煙、音樂、香茅的味道一下子全湧上來。', 'story'), p('你終於到了。', 'story'),
        { kind: 'table', rows: [['旅程到現在花了', `¥${Math.round(spent).toLocaleString('en-US')}`], ['剩下的錢', `約 ¥${Math.round(J.money()).toLocaleString('en-US')}`],
          ['護照上的章', `${S.stamps.length} 個`], ['學到的旅行知識', `${S.know.length} 條`]] },
        p('曼谷的部分還沒開放。入境章已經存好了，之後可以從這裡繼續。', 'sys'),
      ],
      choices: [{ text: '回到標題', ico: 'back', fn: toTitle }],
    };
  },
};

// ---------- 結局 ----------
const end = {
  view(J) {
    const S = J.S, e = ENDINGS[S.ending], diary = J.slot('diary'), stamp = J.slot('stamp');
    return {
      img: 'dark',
      blocks: [{ kind: 'endTitle', text: e.title }, p(e.text, 'story'),
        p(e.hard ? '這是一個壞結局。你只能回到最近的入境章，或者從頭開始。旅行知識會保留。' : '旅行知識會保留到下一次。', 'sys')],
      choices: [
        ...(!e.hard && diary ? [{ text: `回到日記：${diary.label}`, ico: 'pen', fn: (J, F) => loadSlot(J, F, 'diary') }] : []),
        ...(stamp ? [{ text: `回到入境章：${stamp.label}`, ico: 'star', fn: (J, F) => loadSlot(J, F, 'stamp') }] : []),
        { text: '重新開始', ico: 'pass', fn: (J, F) => { J.newGame(); F.go('intro'); } },
        { text: '回到標題', ico: 'back', fn: toTitle },
      ],
    };
  },
};

export default { airport, flight, imm, curb, ride, city, [END]: end };
