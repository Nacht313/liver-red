// 開幕的資料表：旅行知識、查資料主題、物品、背包分層、交通、住宿、第一站、家人訊息、結局。
// 只有資料，沒有函式，可以直接轉成 JSON（之後搬 Godot 用）。
//
// 真實性：數字沿用原型（prototypes/liver-red-demo-v3.html，標註「2026/10 查證」）。
// 標「示意」的是遊戲用估計。上線前每一條都要重查，來源整理到 docs/research/opening-sources.md。

export const FX = { THB: 4.55, USD: 7.2 };   // 1 人民幣 ≈ 4.55 泰銖；1 美元 ≈ 7.2 人民幣（2026-10）
export const BANK_THB_PER_CNY = 4.4;         // 國內銀行換泰銖的匯率（比市場差）
export const AIRPORT_THB_PER_CNY = 4.3;      // 機場、車站換匯櫃台（最差）

export const KNOW = {
  k_tdac: '泰國：中泰互免簽證，每次停留 30 天，180 天內累計不超過 90 天。入境前要在網上填 TDAC 數位入境卡，最早抵達前 3 天才能填，免費。',
  k_funds: '泰國移民局可能抽查入境資金：免簽旅客每人 10,000 泰銖（或等值外幣、可證明的付款文件）。2026 年 7 月觀光局再次提醒。',
  k_onward: '泰國入境時可能被問住哪裡、什麼時候離開。有訂房紀錄和離境票會比較順利。',
  k_lcc: '廉航的手提行李通常只有 7 公斤，而且是兩件加起來。超重在櫃台加購托運比網上貴很多。穿在身上和口袋裡的不算。',
  k_pbank: '行動電源只能隨身帶上飛機，絕對不能放在托運行李裡。',
  k_bkk: '曼谷有兩個機場：廉航多半飛廊曼（DMK），全服務航空多半飛素萬那普（BKK）。BKK 有機場快線，計程車要另付 50 銖機場附加費和過路費。',
  k_taxi: '機場出口有人喊「Taxi? Taxi?」的多半是黑車，要價是跳錶的兩三倍。要排官方計程車隊伍。',
  k_lock: '很多青旅的置物櫃要自備掛鎖。',
  k_plug: '泰國的插座大多能插兩孔扁頭，但中國的三孔扁頭（筆電常見）常常插不進去。',
  k_temple: '泰國寺廟要遮住肩膀和膝蓋。',
  k_water: '泰國的自來水不能直接喝，便利店的水很便宜。',
  k_rate: '機場換匯的匯率最差，市區的換匯店最好。在國內銀行換也行，但匯率普通。',
  k_scam: '嘟嘟車司機說「寺廟今天關門」然後載你去寶石店，是曼谷最經典的騙局。',
  k_job: '網上「東南亞高薪、包機票包住宿、不要求經驗」的招聘，很多是電詐集團。真的工作不會要你把護照交給公司保管。',
  k_cs: '沙發衝浪的危險信號：評價都很新、照片很少、一直要你換到別的聊天軟體、主動說要開車來接你。',
  k_land: '陸路：昆明南每天有 D87、D83 兩班動車到萬象，約 9.5 小時。磨丁口岸不辦落地簽，要提前辦寮國電子簽。萬象的 Khamsavath 站每晚 18:25 有 134 次直通曼谷，隔天 07:20 到。',
  k_region: '周邊免簽：馬來西亞每次 30 天（要填 MDAC），新加坡 30 天（要填 SG Arrival Card），格魯吉亞、哈薩克也免簽。日本、韓國、申根都要申請簽證。',
  k_quota: '中國居民每人每年購匯額度是 5 萬美元。',
};

export const RESEARCH = [
  { id: 'r_entry', n: '泰國入境規定', src: '泰國移民局・旅客須知', k: ['k_tdac', 'k_funds', 'k_onward'] },
  { id: 'r_air', n: '廉航與行李規定', src: '背包客論壇・廉航行李經驗談', k: ['k_lcc', 'k_pbank'] },
  { id: 'r_bkk', n: '曼谷機場到市區', src: '曼谷自由行攻略', k: ['k_bkk', 'k_taxi'] },
  { id: 'r_stay', n: '曼谷住宿與考山路', src: '青旅評價整理', k: ['k_lock', 'k_cs'] },
  { id: 'r_life', n: '泰國生活常識', src: '旅遊論壇・泰國生活', k: ['k_plug', 'k_temple', 'k_water', 'k_rate'] },
  { id: 'r_scam', n: '東南亞騙局與安全', src: '外交部領事服務・安全提醒', k: ['k_scam', 'k_job'] },
  { id: 'r_land', n: '陸路去泰國', src: '中老鐵路購票須知', k: ['k_land'] },
  { id: 'r_region', n: '周邊國家概況', src: '中國領事服務網・免簽國家', k: ['k_region', 'k_quota'] },
];

// kg、L 是真實重量和體積的近似；price 是網購價（示意）。own：家裡本來就有。must：一定要帶。
export const ITEMS = {
  passport: { n: '護照', kg: 0.05, L: 0.1, must: 1, own: 1, d: '豬肝紅色的普通護照' },
  phone: { n: '手機', kg: 0.2, L: 0.2, must: 1, own: 1 },
  wallet: { n: '錢包（現金＋銀聯卡）', kg: 0.1, L: 0.2, must: 1, own: 1 },
  charger: { n: '手機充電器', kg: 0.12, L: 0.2, own: 1 },
  laptop: { n: '筆電＋三孔充電器', kg: 1.9, L: 2.8, own: 1, d: '遠程工作必備，但很重' },
  tees: { n: 'T 恤 ×3', kg: 0.6, L: 3, own: 1 },
  under: { n: '內衣褲襪 ×4', kg: 0.4, L: 2, own: 1 },
  pants: { n: '長褲', kg: 0.5, L: 1.5, own: 1, d: '進寺廟要遮住膝蓋' },
  shorts: { n: '短褲 ×2', kg: 0.4, L: 1.5, own: 1 },
  jacket: { n: '薄外套', kg: 0.5, L: 2.5, own: 1, d: '車上和飛機上冷氣很強' },
  sandals: { n: '夾腳拖', kg: 0.3, L: 1.2, own: 1 },
  toilet: { n: '盥洗包', kg: 0.6, L: 1.5, own: 1 },
  towel: { n: '家裡的浴巾', kg: 0.7, L: 3, own: 1, d: '又大又重' },
  umbrella: { n: '雨傘', kg: 0.4, L: 1, own: 1 },
  novel: { n: '中文小說', kg: 0.4, L: 1, own: 1, d: '讀書能恢復信念' },
  notebook: { n: '日記本', kg: 0.25, L: 0.5, own: 1, d: '睡在床上時可以寫日記存檔' },
  snacks: { n: '媽媽塞的零食', kg: 1.2, L: 3, own: 1, d: '吃一次飽足大增' },
  meds: { n: '常備藥', kg: 0.2, L: 0.5, own: 1 },
  belt: { n: '防盜腰包', kg: 0.1, L: 0.2, price: 59, d: '解鎖「貼身腰包」欄位' },
  pbank: { n: '行動電源 20000mAh', kg: 0.4, L: 0.4, price: 129, d: '只能隨身帶上飛機' },
  adapter: { n: '萬用轉換插頭', kg: 0.1, L: 0.2, price: 39, d: '讓筆電的三孔插頭能用' },
  qtowel: { n: '速乾毛巾', kg: 0.2, L: 0.6, price: 39, d: '比浴巾輕得多' },
  rain: { n: '輕量雨衣', kg: 0.25, L: 0.6, price: 49 },
  lock: { n: '掛鎖', kg: 0.1, L: 0.1, price: 25, d: '鎖青旅的置物櫃' },
  plugs: { n: '耳塞＋眼罩', kg: 0.03, L: 0.1, price: 19, d: '多人房睡得比較好' },
  repel: { n: '防蚊液', kg: 0.15, L: 0.2, price: 29, d: '東南亞有登革熱' },
  uke: { n: '尤克里里', kg: 0.6, L: 4, price: 299, d: '可以在街頭或酒吧賣藝' },
  gopro: { n: '運動相機（二手）', kg: 0.2, L: 0.3, price: 1200, d: '拍 vlog 發自媒體' },
  camera: { n: '微單相機（二手）', kg: 0.7, L: 1.5, price: 3200, d: '拍照賣圖庫、幫人拍合照' },
  sleepbag: { n: '輕量睡袋', kg: 0.8, L: 5, price: 199 },
  tent: { n: '單人帳篷', kg: 1.5, L: 5, price: 399 },
};

// body：貼身（不算手提行李重量）。need：要先有某個物品才能用這一層。big：大背包。
export const LAYERS = {
  pocket: { n: '褲袋', L: 0.6, theft: '高', speed: '最快', body: 1 },
  waist: { n: '貼身腰包', L: 1.5, theft: '最低', speed: '最快', body: 1, need: 'belt' },
  day: { n: '隨身小包', L: 8, theft: '中', speed: '快' },
  top: { n: '大背包上層', L: 10, theft: '高', speed: '快', big: 1 },
  mid: { n: '大背包中層', L: 18, theft: '中', speed: '中', big: 1 },
  bot: { n: '大背包下層', L: 12, theft: '低', speed: '慢', big: 1 },
};
export const PACK_KG = 1.4;  // 40 L 背包本身
export const DAY_KG = 0.3;   // 隨身小包本身
export const CABIN_LIMIT_KG = 7;

// 一鍵預設打包（原型的預設，故意不完美：重的東西在上層、浴巾在下層）
export const DEFAULT_PACK = {
  charger: 'top', laptop: 'mid', tees: 'mid', under: 'mid', pants: 'mid', shorts: 'bot', jacket: 'top', sandals: 'bot',
  toilet: 'top', towel: 'bot', umbrella: 'top', novel: 'mid', notebook: 'top', snacks: 'top', meds: 'top', belt: 'pocket',
  pbank: 'top', adapter: 'top', qtowel: 'mid', rain: 'top', lock: 'top', plugs: 'top', repel: 'top', uke: 'top',
  gopro: 'day', camera: 'day', sleepbag: 'bot', tent: 'bot',
};

// 去曼谷的交通。p 是單程人民幣（示意，2026-10 查過的價位帶）。
// air：抵達的機場；lcc：廉航（手提 7 公斤）；arriveDays：出發後第幾天抵達泰國。
// airportAt：幾點要到機場；departAt：起飛；hours：飛行時數（國內時間）；latest：最晚幾點要出門。
export const TRANS = {
  fsc: { n: '全服務航空直飛曼谷素萬那普', p: 1700, d: '含 20 公斤托運，有餐和 USB 充電。10:00 起飛，當地 13:00 抵達。', air: 'BKK', arriveDays: 0, airportAt: 8, departAt: 10, hours: 4, latest: 9 },
  lcc: { n: '廉航直飛曼谷廊曼', p: 780, d: '20:00 起飛，當地 22:30 抵達。', air: 'DMK', lcc: 1, arriveDays: 0, airportAt: 17, departAt: 20, hours: 3.5, latest: 18 },
  red: { n: '紅眼廉航飛曼谷廊曼', p: 520, d: '23:00 起飛，當地凌晨 01:30 抵達。最便宜，也最累。', air: 'DMK', lcc: 1, arriveDays: 1, airportAt: 21, departAt: 23, hours: 3.5, latest: 22 },
  tra: { n: '廉航經吉隆坡轉機', p: 640, d: '09:00 起飛，在吉隆坡轉機，當地 19:00 抵達廊曼。', air: 'DMK', lcc: 1, arriveDays: 0, airportAt: 7, departAt: 9, hours: 11, latest: 8 },
  land: { n: '陸路：高鐵＋中老鐵路＋泰寮直通車', p: 1180, d: '高鐵到昆明，動車到萬象，夜車到曼谷。約 4 天，會多蓋兩個章。', air: 'LAND', arriveDays: 2, latest: 8.5 },
};
export const EXTRA_BAG_ONLINE = 250;   // 廉航網上加購 20 kg 托運
export const EXTRA_BAG_COUNTER = 450;  // 機場櫃台加購
export const LAST_MINUTE = 1.25;       // 後天出發的臨時票加價

// 飛行途中：tod 窗外時段、en 精力、food 飽食、text 敘述。
export const FLIGHT = {
  fsc: { tod: 'day', en: -8, food: 12, charge: 1, text: '空服員送來了雞肉飯。座位上有 USB，你把手機充滿了。' },
  lcc: { tod: 'night', en: -14, food: 0, text: '廉航上的泡麵要 60 塊，你忍住了。座位很窄，沒有插座。' },
  red: { tod: 'night', en: -28, food: 0, text: '機艙燈全關了。你靠著窗，怎麼也睡不著。' },
  tra: { tod: 'dusk', en: -26, food: 25, pay: 30, text: '你在吉隆坡機場的地板上坐了四個小時，轉機。吃了一碗叻沙。' },
};

// 曼谷住宿（每晚泰銖，示意）。NIGHTS：[晚數, 折扣, 可否退]
export const STAYK = {
  hostel: { n: '考山路青旅 8 人房', p: 350, d: '床頭有插座，置物櫃要自備鎖' },
  guest: { n: '巷子裡的民宿單人房', p: 900, d: '安靜，有獨立衛浴' },
  hotel: { n: '考山路附近的酒店', p: 1800, d: '有泳池和冷氣' },
};
export const NIGHTS = [[1, 1, 1], [3, 1, 1], [7, 0.9, 0], [14, 0.85, 0], [30, 0.75, 0]];

// 沙發衝浪 host。need：至少要幾則評價才肯接（新帳號是 0 則）。
export const HOSTS = {
  nok: { n: 'Nok', star: '4.9', refs: 42, need: 1, d: '朱拉隆功大學的學生，公寓裡堆滿了書。' },
  tom: { n: 'Tom', star: '4.7', refs: 18, need: 1, d: '在曼谷教英文的英國人，冰箱裡只有啤酒和芒果。' },
  pim: { n: 'Pim', star: '4.5', refs: 6, need: 0, d: '插畫師，住考山路旁的巷子。願意接新人。' },
  jay: { n: 'Jay', star: '5.0', refs: 3, need: 0, d: '「Welcome! I can pick you up from the airport with my car 😊 add my LINE」' },
};

// 第一站（第一輪用清單；第三輪換成亞洲地圖）。res：查過哪個主題才看得到簽證說明。
export const STOPS = [
  { id: 'bkk', n: '泰國・曼谷', visa: '免簽 30 天', col: '#6cc27a', open: 1 },
  { id: 'kul', n: '馬來西亞・吉隆坡', visa: '免簽 30 天', col: '#6cc27a', res: 'r_region' },
  { id: 'sin', n: '新加坡', visa: '免簽 30 天，物價很高', col: '#6cc27a', res: 'r_region' },
  { id: 'tbs', n: '格魯吉亞・第比利斯', visa: '免簽', col: '#6cc27a', res: 'r_region' },
  { id: 'vte', n: '寮國・萬象', visa: '要辦電子簽或落地簽', col: '#c9c25a', res: 'r_land' },
  { id: 'tyo', n: '日本・東京', visa: '要事先申請簽證', col: '#e0954a', res: 'r_region' },
];

export const FAMILY_MSGS = [
  ['媽媽', '東西收拾好了沒？藥要記得帶。'],
  ['二姨', '聽說你要出國玩？你表姐考上公務員了，你也該想想了。'],
  ['爸爸', '錢省著點花。'],
  ['家族群', '（奶奶轉發了一篇〈泰國十大騙局，第七個最可怕〉）'],
  ['媽媽', '你高中同學小林進了國企，他媽媽在群裡發了紅包。'],
  ['大學室友', '我拿到研究所錄取了！你出去玩得開心啊。'],
  ['媽媽', '到了記得報平安。'],
];

export const TIPS = [
  '有些問題，只有出發以後才會知道答案。',
  '背包裡每一公克，都要扛一整年。',
  '手機沒電的時候，你會發現自己有多依賴它。',
  '把護照放在最難被偷的地方。',
  '睡在床上的晚上，可以寫日記存檔。',
  '入境泰國時，可能會被要求出示 10,000 銖的資金。',
];

// 結局。hard：壞結局，不能回到日記，只能回到入境章或重來。
export const ENDINGS = {
  tired: { title: '你撐不住了', text: '連續的奔波讓你在路邊坐了很久。你打開航空公司的 App，訂了回國的單程機票。' },
  faith: { title: '你想回家了', text: '你在床上躺了一整天，什麼都不想做。第二天，你告訴爸媽你要回去了。' },
  money: { title: '錢花完了', text: '卡裡的最後一筆錢扣掉之後，媽媽打來電話：「機票我買好了。」你遵守了約定。' },
  refused: { title: '入境被拒', text: '你被帶進了旁邊的小房間。兩個小時後，航空公司的人把你送上了回程的飛機。\n\n你學到了：入境泰國時，身上要有 10,000 銖現金或等值的證明。' },
  cs: { title: '灰色的車', hard: 1, text: 'Jay 很熱情，遞給你一瓶水，說路上要開一個小時。\n你喝了幾口，窗外的路燈開始變得模糊……\n\n醒來的時候，你不知道自己在哪裡。護照和手機都不見了。' },
  csDrink: { title: '那杯酒', hard: 1, text: '酒有點苦。你只記得天花板的吊扇一直在轉。\n\n醒來的時候，你躺在一條陌生的巷子裡，背包、護照、手機都不見了。' },
};

export const ATTRS = ['學識', '膽識', '手藝', '共情', '魅力'];
export const START_DATE_UTC = [2030, 5, 28]; // 第 0 天 = 6 月 28 日（年份對玩家顯示成 20XX）
