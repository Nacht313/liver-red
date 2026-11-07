// 開幕・出發前的預訂畫面：第一站、交通、住宿、沙發衝浪、出國手續、TDAC、銀行。
// 第一輪是選單形式；第二輪搬進手機（訂票、訂房、沙發衝浪、出入境、銀行 App），規則不變。

import { TRANS, STAYK, NIGHTS, HOSTS, STOPS, FX, LAST_MINUTE, EXTRA_BAG_ONLINE, EXTRA_BAG_COUNTER, BANK_THB_PER_CNY } from './data.js';
import { dateStr } from '../../game/journey/time.js';
import { nextSeg, tdacOpen, arrivalDay } from './actions.js';
import { p, back, thb, yuan, homeView, stayName } from './ui-helpers.js';

// ---------- 第一站（第一輪用清單，第三輪換成亞洲地圖） ----------
const dest = {
  view(J) {
    const S = J.S;
    return homeView(J, [p('顏色表示對中國普通護照的態度。沒查過的地方，你只知道個大概。', 'sys')], [
      { grp: '第一站' },
      ...STOPS.map((s) => ({
        text: s.n, ico: 'plane', dot: s.col, x: !s.res || S.researched.includes(s.res) ? s.visa : '？？？（上網查資料可以知道更多）', why: s.open ? '' : '尚未開放',
        fn: (J, F) => { S.dest = s.id; J.flash.push(p(`第一站定了：**${s.n}**。接下來查資料、訂交通和住宿。`)); F.go('prep'); },
      })),
      { gap: 1 }, back(),
    ]);
  },
};

// ---------- 交通 ----------
const trans = {
  view(J) {
    const lk = J.knows('k_lcc');
    return {
      img: 'airport', o: { tod: 'day' }, blocks: [p('怎麼去曼谷？價格是單程。交通方式會影響你抵達時的狀態。')],
      choices: [
        ...Object.entries(TRANS).map(([k, t]) => ({ text: t.n, ico: k === 'land' ? 'train' : 'plane', x: `¥${t.p}　${t.d}${t.lcc ? (lk ? ' 手提只有 7 公斤。' : ' 行李規定：？') : ''}`, fn: (J, F) => F.go('date', k) })),
        { gap: 1 }, back(),
      ],
    };
  },
};
const date = {
  view(J, k) {
    const S = J.S, t = TRANS[k], lk = t.lcc && J.knows('k_lcc');
    const book = (d, mul, bag) => (J, F) => {
      J.payCNY(Math.round(t.p * mul) + (bag ? EXTRA_BAG_ONLINE : 0)); if (S.over) return;
      Object.assign(S, { trans: k, dep: S.day + d, depMul: mul, tdac: false, extraBag: !!bag });
      J.flash.push(p(`訂好了：${dateStr(S.dep, true)} 出發。`)); F.go('prep');
    };
    return {
      img: 'airport', o: { tod: 'day' }, blocks: [p(`${t.n}。什麼時候出發？`)],
      choices: [
        { text: `後天・${dateStr(S.day + 2, true)}`, ico: 'plane', x: `${yuan(t.p * LAST_MINUTE)}（臨時訂，貴 25%）`, fn: book(2, LAST_MINUTE) },
        { text: `五天後・${dateStr(S.day + 5, true)}`, ico: 'plane', x: yuan(t.p), fn: book(5, 1) },
        ...(lk ? [{ text: '五天後＋20 公斤托運', ico: 'bag', x: `${yuan(t.p + EXTRA_BAG_ONLINE)}（機場櫃台加購要 ¥${EXTRA_BAG_COUNTER}）`, fn: book(5, 1, 1) }] : []),
        back('trans'),
      ],
    };
  },
};
const booked = {
  view(J) {
    const S = J.S, t = TRANS[S.trans];
    return {
      img: 'airport', o: { tod: 'day' },
      blocks: [
        p(`**交通**：${t.n}，${dateStr(S.dep, true)} 出發${S.extraBag ? '（已加購托運）' : ''}`), p(`**住宿**：${stayName(S)}`),
        p(`入境卡：${S.tdac ? '已填' : '還沒填（抵達前 3 天內才能填）'}${S.trans === 'land' ? `　寮國電子簽：${S.laosVisa != null ? '已申請' : '還沒申請'}` : ''}`, 'sys'),
      ],
      choices: [back()],
    };
  },
};

// ---------- 住宿 ----------
const stay = {
  view(J) {
    const S = J.S, busy = S.stay ? '先取消目前的訂單' : '';
    return {
      img: 'khaosan', o: { tod: 'day' },
      blocks: [p('到了曼谷住哪裡？住處會影響每晚恢復多少，也決定能不能寫日記存檔。泰國入境卡要填住址。'), p(`從卡裡付款，按 1 人民幣 ≈ ${FX.THB} 泰銖計算。目前：${stayName(S)}`, 'sys')],
      choices: [
        ...(S.stay ? [{
          text: '取消目前的訂單', ico: 'warn', x: S.stay.refund ? '全額退款' : '不可退款', why: S.stay.refund ? '' : '不可退的訂單',
          fn: (J, F) => { S.card += Math.round(S.stay.thb / FX.THB); S.stay = null; J.flash.push(p('訂單取消了，錢退回卡裡。')); F.go('stay'); },
        }] : []),
        ...Object.entries(STAYK).map(([k, s]) => ({ text: s.n, ico: 'bed', x: `每晚 ${s.p} ฿　${s.d}`, why: busy, fn: (J, F) => F.go('nights', k) })),
        { text: '沙發衝浪', ico: 'heart', x: `免費，靠評價和直覺判斷。你的評價：${S.refs} 則`, why: busy, fn: (J, F) => F.go('cs') },
        { text: '不訂，到了再找', ico: 'walk', x: '彈性高，但現場價更貴，深夜可能客滿', why: busy, fn: (J, F) => { S.cs = null; J.flash.push(p('你決定到了再說。')); F.go('prep'); } },
        back(),
      ],
    };
  },
};
const nights = {
  view(J, k) {
    const S = J.S, s = STAYK[k];
    return {
      img: 'khaosan', o: { tod: 'day' }, blocks: [p(`${s.n}。訂幾晚？訂得越久越便宜，但長訂不能退。泰國免簽每次最多停留 30 天。`)],
      choices: [
        ...NIGHTS.map(([n, d, ref]) => {
          const price = Math.round(s.p * n * d);
          return {
            text: `${n} 晚`, ico: 'bed', x: `${thb(price)} ฿（約 ${yuan(price / FX.THB)}）${d < 1 ? `・省 ${Math.round((1 - d) * 100)}%` : ''}・${ref ? '可免費取消' : '不可退'}`,
            fn: (J, F) => {
              J.payCNY(Math.round(price / FX.THB)); if (S.over) return;
              S.stay = { kind: k, nights: n, thb: price, refund: !!ref }; S.cs = null;
              J.flash.push(p(`訂好了：${s.n}，${n} 晚。`)); F.go('prep');
            },
          };
        }),
        back('stay'),
      ],
    };
  },
};

// 沙發衝浪：設計摘要寫「沒有考核」。新帳號 0 則評價，挑人的 host 不會接。
// Pim 接不接受新人、由什麼決定，待策劃定案；目前她這週已經有客人。
const cs = {
  view(J) {
    const S = J.S, careful = S.attr.共情 >= 3 || J.knows('k_cs');
    const host = (k) => {
      const h = HOSTS[k];
      return {
        text: `${h.n}　★${h.star}・${h.refs} 則評價`, ico: k === 'jay' ? 'warn' : 'heart', x: h.d,
        why: S.refs < h.need ? `只接受至少 ${h.need} 則評價的旅客` : S.csTried[k] ? '已經問過了' : '',
        fn: (J, F) => {
          if (k === 'jay') { S.cs = 'jay'; S.stay = null; J.flash.push(p('Jay 秒回：「Of course! See you!」')); F.go('prep'); return; }
          S.csTried[k] = 1;
          J.flash.push(p(`${h.n} 回覆：「Sorry, I already have guests this week. Maybe next time!」`, 'sys'));
          F.go('cs');
        },
      };
    };
    return homeView(J, [
      p(`沙發衝浪 App。你的帳號：**${S.refs} 則評價**。評價越少，願意接你的 host 越少。`),
      ...(careful ? [p('Jay 的 3 則評價都是上個月寫的，寫評價的帳號都沒有照片。他一直要你換到 LINE 聊，還主動說要開車來接你。', 'warn')] : []),
    ], [
      ...['nok', 'tom', 'pim', 'jay'].map(host),
      ...(careful ? [] : [{ text: '花時間仔細讀每個 host 的檔案', ico: 'info', fn: (J, F) => { S.attr.共情 = Math.max(S.attr.共情, 3); J.learn('k_cs'); F.go('cs'); } }]),
      back('stay'),
    ]);
  },
};

// ---------- 手續、銀行 ----------
const errand = {
  view(J) {
    const S = J.S;
    const tdacWhy = S.tdac ? '已填' : !S.trans ? '要先訂交通' : !tdacOpen(S) ? `抵達前 3 天內才能填（${dateStr(Math.max(S.day, arrivalDay(S) - 3), true)} 起）` : '';
    const paid = (fx) => (J, F) => { fx(); F.go('errand'); };
    return homeView(J, [p('出國前要辦的事。', 'sys')], [
      { text: '買 30 天旅遊保險', ico: 'heart', x: '¥150，生病、受傷時的醫療費', why: S.ins ? '已買' : '', fn: paid(() => { J.payCNY(150); S.ins = true; }) },
      { text: '買泰國 8 天流量 eSIM', ico: 'phone', x: '¥45，落地就有網路', why: S.esim ? '已買' : '', fn: paid(() => { J.payCNY(45); S.esim = true; }) },
      {
        text: '申請寮國電子簽', ico: 'pass', x: S.laosVisa != null ? (S.day >= S.laosVisa ? '已批准' : `審核中，${dateStr(S.laosVisa, true)} 下來`) : '約 ¥260，3 個工作天',
        why: S.laosVisa != null ? '已申請' : '', fn: paid(() => { nextSeg(J); J.payCNY(260); S.laosVisa = S.day + 3; }),
      },
      { text: '填泰國 TDAC 數位入境卡', ico: 'pass', x: '免費，要填航班和住址', why: tdacWhy, fn: (J, F) => F.go('tdac') },
      { gap: 1 }, back(),
    ]);
  },
};
const tdac = {
  view(J) {
    const S = J.S, addr = S.stay ? STAYK[S.stay.kind].n : S.cs === 'jay' ? '沙發主人 Jay 的公寓' : null;
    if (addr) {
      return homeView(J, [p(`TDAC 要填航班和在泰國的住址：${addr}。`)], [
        { text: '填好送出', ico: 'pen', fn: (J, F) => { S.tdac = true; S.tdacAddr = addr; J.add('battery', -3); J.learn('k_tdac'); J.flash.push(p('TDAC 填好了。QR 碼存在相簿裡。', 'good')); F.go('errand'); } },
        back('errand'),
      ]);
    }
    return homeView(J, [p('TDAC 要填在泰國的住址，可是你還沒訂住宿。')], [
      { text: '隨便填一間考山路青旅的地址', ico: 'pen', x: '其實沒訂', fn: (J, F) => { S.tdac = true; S.tdacAddr = 'fake'; F.go('errand'); } },
      { text: '先去訂住宿', ico: 'bed', fn: (J, F) => F.go('stay') },
      back('errand'),
    ]);
  },
};
const bank = {
  view(J) {
    const S = J.S, got = Math.round(1000 * BANK_THB_PER_CNY), short = S.card < 1000 ? '卡裡錢不夠' : '';
    return homeView(J, [p('銀行櫃台。')], [
      { text: '換 ¥1,000 的泰銖現金', ico: 'money', x: `約 ${thb(got)} ฿（銀行匯率普通）`, why: short,
        fn: (J, F) => { nextSeg(J); S.card -= 1000; S.thb += got; J.flash.push(p(`你換到了 ${thb(got)} 泰銖。`)); F.go('prep'); } },
      { text: '領 ¥1,000 人民幣現金', ico: 'money', x: '到了再換，市區匯率比較好', why: short,
        fn: (J, F) => { S.card -= 1000; S.cny += 1000; J.flash.push(p('你領了 1,000 元現金。')); F.go('prep'); } },
      back('prep', '回家'),
    ]);
  },
};

export default { dest, trans, date, booked, stay, nights, cs, errand, tdac, bank };
