// 開幕的劇情節點（只有資料）。清單類的畫面（查資料、網購、訂票、機場、入境…）在 screens-*.js。
//
// 節點：{ img 插圖, o 插圖參數, place 地點, zone, loc, resume（讀檔回到哪裡）, onEnter 效果,
//         body: [{ story | p | sys | say | note | good | warn | bad | msg: '文字', when: 條件, from: 訊息的寄件人 }],
//         choices: [{ text, ico, x 說明, when 顯示條件, req 可選條件, reqText, effects, goto, arg }] }
// 文字可以用 **粗體** 和 {date} {clock} {cabinKg} 這類變數；條件和效果的寫法見 src/game/journey/rules.js 開頭。

const funds = (n, line, x) => ({
  text: `¥${n.toLocaleString('en-US')}`, ico: 'money', x,
  effects: [{ do: 'startFunds', n }, { flash: line, kind: 'story' }], goto: 'night0',
});

export default {
  // ---------- 開場 ----------
  intro: {
    img: 'room', o: { tod: 'night' }, place: '家・你的房間', zone: 'home',
    body: [
      { story: '六月的最後幾天，宿舍已經搬空了。' },
      { story: '你把畢業證書塞進抽屜。手機裡躺著第十一封「很遺憾地通知您」。' },
      { story: '網上的人說，經濟會一直壞下去，AI 會拿走大部分的工作。房子、車子、孩子……你算了算，覺得這輩子大概都買不起。' },
      { story: '你突然想通了一件事：這些都不是你真正想要的。' },
      { story: '**是一個籠子在尋找一隻鳥。**' },
    ],
    choices: [{ text: '走出房間', ico: 'walk', goto: 'dinner' }],
  },

  dinner: {
    img: 'dinner', place: '家・飯桌', zone: 'home',
    body: [
      { story: '晚飯的時候，你說你想出去走走。不是一個月，可能是一年，也可能更久。' },
      { story: '爸爸放下筷子，很久沒說話。' },
      { story: '媽媽先開口：' }, { say: '「簽證要的錢，我們出。」' }, { say: '「但是錢花完了，你就給我回來。」' },
      { sys: '他們能拿出多少？' },
    ],
    choices: [
      funds(10000, '¥10,000 是媽媽偷偷取的。你得邊走邊賺。', '家裡不寬裕。這筆錢是媽媽偷偷從存摺裡取的，親戚都不知道。'),
      funds(50000, '¥50,000，爸爸說省著點花。', '普通家庭的一筆大錢。爸爸說：省著點花。'),
      funds(150000, '¥150,000，原本是買車的錢。', '他們說，這原本是準備給你買車的錢。'),
      { ...funds(1000000, '¥1,000,000。這筆錢從哪裡來，你沒有問。', '二週目才有的選擇。'), req: { flag: 'secondRun' }, reqText: '二週目開放' },
    ],
  },

  night0: {
    img: 'room', o: { tod: 'night' }, place: '家・你的房間',
    body: [
      { story: '那天晚上，你很久沒睡著。' },
      { note: '新的念頭：**一個籠子在尋找一隻鳥**\n放進思想櫃，需要 3 天消化。（在「屬性」裡查看）' },
    ],
    choices: [{
      text: '睡覺', ico: 'bed',
      effects: [{ sleep: 'home' }, { flash: '第二天早上。離畢業典禮已經過了兩天。\n你決定先把出發前的事情準備好。' }], goto: 'prep',
    }],
  },

  // ---------- 出發 ----------
  depart: {
    img: 'dinner', zone: 'home', place: '家・門口', resume: 'prep',
    onEnter: [{ do: 'departPrep' }],
    body: [
      { story: '媽媽一大早就起來煮了麵。她什麼也沒說，只是趁你不注意，往你的隨身小包裡塞了一大包零食。', when: { flag: 'stuffed' } },
      { sys: '隨身小包重了 1.2 公斤。', when: { flag: 'stuffed' } },
      { story: '媽媽一大早就起來煮了麵。她看到你把零食帶上了，笑了一下。', when: { noFlag: 'stuffed' } },
      { story: '爸爸站在門口：' }, { say: '「到了報平安。」' },
    ],
    choices: [
      { text: '出門', ico: 'walk', when: { not: { is: { trans: 'land' } } }, effects: [{ set: { loc: 'transit' } }], goto: 'airport' },
      { text: '出門', ico: 'walk', when: { is: { trans: 'land' } }, effects: [{ set: { loc: 'transit' } }], goto: 'land.kunming' },
    ],
  },

  exit: {
    img: 'imm', place: '國內機場・邊檢', zone: 'air',
    body: [{ p: '邊檢員翻著你的護照：' }, { say: '「去泰國做什麼？一個人？有回程票嗎？」' }],
    choices: [{
      text: '「旅遊，一個人。回程還沒定。」', ico: 'info',
      effects: [{ stamp: { c: '中國', t: '出境' } }, { know: 'k_job' }], goto: 'exit.leaflet',
    }],
  },
  'exit.leaflet': {
    img: 'imm',
    body: [
      { p: '他看了你一會兒，從抽屜裡抽出一張單子遞給你。' },
      { note: '**出境旅客反詐提示**\n如果有人在國外給你介紹「高薪、輕鬆、包吃住」的工作，千萬不要去。不要把護照交給任何人保管。' },
      { say: '「注意安全。」' }, { p: '章蓋下去了。' },
    ],
    choices: [{ text: '登機', ico: 'plane', goto: 'flight' }],
  },

  // ---------- 陸路 ----------
  'land.kunming': {
    img: 'train', o: { tod: 'day' }, place: '高鐵上', zone: 'train', loc: 'transit',
    onEnter: [{ time: 8, tiring: 1.2 }, { pay: 45 }, { add: { food: 35 } }],
    body: [
      { p: '高鐵一路往西南開。窗外的山越來越多，越來越綠。你在車上買了一盒 45 塊的盒飯。' },
      { p: '傍晚你到了昆明。明早 08:08 的 D87 開往萬象。' },
    ],
    choices: [
      { text: '住車站旁邊的快捷酒店', ico: 'bed', x: '¥140', effects: [{ pay: 140 }, { until: 22.5 }, { sleep: 'hotel' }], goto: 'land.border' },
      { text: '在車站的椅子上等到天亮', ico: 'bed', x: '免費，但很累', effects: [{ until: 22.5 }, { sleep: 'bench' }], goto: 'land.border' },
    ],
  },
  'land.border': {
    img: 'border', o: { tod: 'day' }, place: '磨憨／磨丁口岸', zone: 'train',
    onEnter: [{ until: 8.1 }, { time: 3.5, tiring: 1 }, { stamp: { c: '中國', t: '出境（陸路）' } }, { do: 'checkLaosVisa' }],
    body: [
      { p: '列車在磨丁停下，所有人下車辦寮國入境。' },
      { say: '「No visa? No visa on arrival here. E-visa only.」', when: { noFlag: 'laosOk' } },
      { bad: '你的電子簽還在審核中。', when: [{ noFlag: 'laosOk' }, { not: { is: { laosVisa: null } } }] },
      { bad: '你根本沒申請寮國電子簽。', when: [{ noFlag: 'laosOk' }, { is: { laosVisa: null } }] },
      { sys: '你被請回了中國那一側。', when: { noFlag: 'laosOk' } },
      { p: '你把電子簽的列印本遞過去。', when: { flag: 'laosOk' } },
    ],
    choices: [
      { text: '回昆明，改買機票飛曼谷', ico: 'plane', x: '約 ¥900，又是一天', when: { noFlag: 'laosOk' },
        effects: [{ know: 'k_land' }, { pay: 900 }, { do: 'rerouteToFlight' }, { add: { faith: -10 } }], goto: 'airport' },
      { text: '蓋章，回到車上', ico: 'pass', when: { flag: 'laosOk' },
        effects: [{ stamp: { c: '寮國', t: '入境（陸路）' } }, { time: 5.5, tiring: 1 }, { do: 'localTime' }], goto: 'land.laos' },
    ],
  },
  'land.laos': {
    img: 'train', o: { tod: 'dusk' }, place: '中老鐵路',
    body: [{ p: '寮國的章蓋在了護照上。列車穿過一條又一條隧道，出隧道的時候，窗外全是梯田和霧。' }, { good: '信念 +10' }],
    choices: [{ text: '抵達萬象', ico: 'train', effects: [{ add: { faith: 10 } }], goto: 'land.vte' }],
  },
  'land.vte': {
    img: 'river', o: { tod: 'dusk' }, place: '寮國・萬象・湄公河邊', zone: 'street', loc: 'abroad',
    onEnter: [{ until: 17 }],
    body: [{ p: '萬象比你想像的安靜。河對岸就是泰國，燈一盞一盞亮起來。' }, { sys: '明晚 18:25，Khamsavath 站有直通曼谷的 134 次夜車。' }],
    choices: [
      { text: '吃一碗米粉，住河邊的小旅館', ico: 'bed', x: '約 ¥75', effects: [{ pay: 75 }, { add: { food: 30 } }, { until: 22.5 }, { sleep: 'guest' }], goto: 'land.night' },
      { text: '省錢，在河邊長椅上過夜', ico: 'warn', x: '免費', effects: [{ until: 22.5 }, { sleep: 'bench' }], goto: 'land.night' },
    ],
  },
  'land.night': {
    img: 'train', o: { tod: 'night' }, place: '134 次夜車', zone: 'train',
    onEnter: [{ until: 17.5 }],
    body: [{ p: '你買了二等臥鋪上鋪（784 銖，用人民幣按車站匯率付）。在廊開，所有人下車辦泰國入境。' }],
    choices: [{ text: '下車排隊', ico: 'pass', effects: [{ time: 1.5 }, { pay: 182 }, { flag: 'landEntry' }], goto: 'imm' }],
  },
  'land.train2': {
    img: 'train', o: { tod: 'night' }, place: '134 次夜車', zone: 'train',
    body: [{ p: '你回到車上，爬上了上鋪。冷氣很強，燈一直亮著。' }],
    choices: [{
      text: '睡到曼谷', ico: 'bed',
      effects: [{ flag: 'landArrived' }, { sleep: 'train' }, { flash: '列車在 07:20 開進了曼谷的 Krung Thep Aphiwat 中央車站。' }], goto: 'curb',
    }],
  },

  // ---------- 泰國入境之後 ----------
  stamp: {
    img: 'imm', zone: 'air', resume: 'curb',
    onEnter: [{ do: 'stampThailand' }],
    body: [
      { p: '「咚」的一聲。**泰國・允許停留至 {visaUntil}**。' },
      { note: '入境章已記錄。之後如果出事，可以從這裡重新開始。' },
    ],
    choices: [{ text: '走出入境大廳', ico: 'walk', goto: 'curb' }],
  },

  'jay.call': {
    img: 'curb', zone: 'air',
    onEnter: [{ flag: 'jayAsked' }, { famMsg: ['Jay（LINE）', "I'm at the airport! Grey car, gate 6. Come quick 😊"] }],
    body: [
      { p: '手機響了。是 Jay：' },
      { msg: "I'm at the airport! Grey car, gate 6. Come quick 😊", from: 'Jay・LINE' },
      { warn: '你想起來，主動說要開車接人，是危險信號之一。', when: { know: 'k_cs' } },
    ],
    choices: [
      { text: '去 6 號門找他', ico: 'walk', effects: [{ end: 'cs' }] },
      { text: '說謝謝，但你自己搭車過去', ico: 'warn', effects: [{ flag: 'jayDecline' }, { flash: 'Jay 回了一句「OK」，之後就再也沒回你。' }], goto: 'curb' },
      { text: '取消借宿，自己找地方住', ico: 'back', effects: [{ set: { cs: null } }, { know: 'k_cs' }, { flash: '你封鎖了 Jay。今晚得自己找地方住了。' }], goto: 'curb' },
    ],
  },

  tout: {
    img: 'curb', zone: 'air',
    body: [{ p: '司機帶你走到停車場的角落。上車後他說：' }, { say: '「No meter. 1,200 baht.」' }],
    choices: [
      { text: '付錢', ico: 'money', x: '1,200 ฿', effects: [{ know: 'k_taxi' }, { add: { faith: -8 } }], goto: 'ride', arg: { thb: 1200, tire: 0.9, text: '你看著窗外，越想越氣。' } },
      { text: '下車', ico: 'walk', effects: [{ know: 'k_taxi' }, { add: { faith: -3 } }, { flash: '你在司機的叫罵聲中拖著背包走回了大廳。' }], goto: 'curb' },
    ],
  },

  'jay.flat': {
    img: 'khaosan', o: { tod: 'night' }, place: '曼谷・Jay 的公寓', zone: 'street',
    body: [{ p: 'Jay 給的地址在一棟舊公寓。他開門的時候已經喝了不少，桌上擺著兩個杯子。' }, { say: '「Drink first! Then I show you your room.」' }],
    choices: [
      { text: '找藉口拿著背包離開', ico: 'warn',
        effects: [{ set: { cs: null } }, { add: { faith: -8 } }, { know: 'k_cs' }, { flash: '你下樓的時候腿還在發抖。今晚得自己找地方住了。' }], goto: 'city' },
      { text: '喝一杯，不好意思拒絕', ico: 'food', effects: [{ end: 'csDrink' }] },
    ],
  },
};
