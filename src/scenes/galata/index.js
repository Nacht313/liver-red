// 加拉達橋・黃昏（伊斯坦堡，六月下旬）
// 這個檔案只有資料：版面、時間、單字、spot 和互動卡。改劇情、價錢、位置都在這裡改，不用動引擎。
//
// 寫法說明見 docs/content-guide.md。條件（req / visibleIf / when）見 src/game/conditions.js，
// 效果（effects / onOpen / onEnter）見 src/game/game.js 的 applyEffects。

const SUNSET = 68; // 20:38 日落（六月下旬的伊斯坦堡）

export default {
  id: 'galata',
  name: '加拉達橋',
  time: {
    startMin: 19 * 60 + 30, // 19:30 開始
    sunset: SUNSET,
    end: 150,               // 22:00 強制結束
    crossMinutes: 8,        // 走完整座橋（約 490 公尺）要幾分鐘
  },
  world: { width: 1800, height: 320, deck: 250, horizon: 182 },
  start: { x: 40, money: 1200, bat: 64, en: 55 },

  // 物價（2026 年，伊斯坦堡觀光區）：simit ₺25、茶 ₺30、魚麵包 ₺300。上線前要再查一次。
  words: {
    'merhaba': '你好', 'teşekkürler': '謝謝', 'simit': '芝麻圈麵包', 'çay': '茶', 'kaç para': '多少錢',
    'hayır': '不', 'balık': '魚', 'kedi': '貓', 'ezan': '叫拜', 'istavrit': '竹莢魚',
  },

  // ---------- spot ----------
  // trigger.kind: interact（走到旁邊按 E）、pass（往某方向經過就觸發）、time（時間到就觸發）
  // reveal：走到多近會冒出記號；visibleIf：不成立時這個 spot 完全不出現
  // doneOn: 'effect' 代表要等某個效果 { done: id } 才算互動完成
  spots: [
    { id: 'boats', name: '魚麵包船', x: 120, type: '購買', trigger: { kind: 'interact' }, reveal: 170, start: 'boats',
      design: { cond: '無', cost: '₺300、15 分鐘', reward: '精力 +20、單字 balık' } },
    { id: 'simit', name: 'Simit 小販', x: 330, type: '對話', trigger: { kind: 'interact' }, reveal: 140, start: 'simit',
      design: { cond: '無', cost: '₺25、2 分鐘', reward: '食物、單字 merhaba／simit／kaç para' } },
    { id: 'mosque', name: '新清真寺', x: 520, type: '觀察', trigger: { kind: 'interact' }, reveal: 200, start: 'mosque',
      design: { cond: '叫拜時段（20:38–20:50）不能進去', cost: '10–20 分鐘', reward: '回憶' } },
    { id: 'shoe', name: '掉刷子的擦鞋匠', x: 870, type: '事件', trigger: { kind: 'pass', dir: 1 }, reveal: 0, start: 'shoe',
      visibleIf: { noFlag: 'shoeDone' }, onOpen: [{ flag: 'shoeShown' }], doneOn: 'effect',
      design: { cond: '只觸發一次', cost: '可能 ₺50–400', reward: '單字 hayır（查手機）' } },
    { id: 'view', name: '清真寺剪影', x: 1025, type: '拍照', trigger: { kind: 'interact' }, reveal: 110, start: 'view', doneOn: 'effect',
      design: { cond: '需要電量', cost: '電量 2%、2 分鐘', reward: '相片（分數看光線和渡輪）' } },
    { id: 'fisher', name: '釣魚的大叔', x: 1180, type: '對話', trigger: { kind: 'interact' }, reveal: 150, start: 'fisher',
      design: { cond: '會說 merhaba 才肯聊', cost: '10 分鐘', reward: '單字 istavrit、回憶' } },
    { id: 'cay', name: '茶攤', x: 1300, type: '購買', trigger: { kind: 'interact' }, reveal: 150, start: 'cay',
      design: { cond: '無', cost: '₺30、20 分鐘', reward: '精力 +15、單字 çay／hayır／teşekkürler' } },
    { id: 'cat', name: '橋邊的貓', x: 1460, type: '隱藏', trigger: { kind: 'interact' }, reveal: 90, start: 'cat',
      visibleIf: [{ flag: 'food' }, { t: { gte: 40 } }],
      design: { cond: '身上有食物，且 20:10 之後', cost: '一份 simit', reward: '回憶、單字 kedi' } },
    { id: 'ezan', name: '日落叫拜', x: null, type: '事件', trigger: { kind: 'time', at: SUNSET }, reveal: 0, start: 'ezan',
      visibleIf: { noFlag: 'ezanDone' }, onOpen: [{ flag: 'ezanDone' }],
      design: { cond: '只觸發一次，在哪裡都會聽到', cost: '5 分鐘', reward: '回憶、單字 ezan' } },
    { id: 'exit', name: '卡拉柯伊', x: 1740, type: '出口', trigger: { kind: 'interact' }, reveal: 160, start: 'exit',
      design: { cond: '無', cost: '結束場景', reward: '結算' } },
  ],

  // ---------- 互動卡 ----------
  // body：{ p } 敘述、{ say } 對白；[[字]] 是可以學的單字；when 是顯示條件
  // choice：text、cost {min, money, bat, en}、req + reqText、effects、goto（下一張卡）、random {p, then, else}
  // 沒有 goto 的選項會關掉卡片
  cards: {
    boats: {
      title: '魚麵包船', tag: '購買',
      body: [
        { p: '金角灣邊停著兩艘晃得很厲害的船，船上的人在炭火上烤鯖魚，夾進麵包裡從船舷遞上來。' },
        { say: '「[[Balık]] ekmek! Sıcak, sıcak!」' },
      ],
      choices: [
        { text: '買一份魚麵包，坐在碼頭邊吃', cost: { money: 300, min: 15, en: 20 },
          effects: [{ mem: 2 }, { learn: 'balık', how: '邊吃邊懂了' }, { log: '在碼頭吃了魚麵包' }], goto: 'boats.ate' },
        { text: '只是看他們烤魚', cost: { min: 5 }, effects: [{ log: '看船上烤魚' }] },
        { text: '離開' },
      ],
    },
    'boats.ate': { title: '魚麵包船', out: '烤得很香，擠了檸檬。你吃得滿手都是油。', choices: [{ text: '離開' }] },

    simit: {
      title: 'Simit 小販', tag: '對話',
      body: [
        { p: '紅色小推車上疊著一圈圈芝麻麵包。小販看到你背著大背包，笑了一下。' },
        { say: '「[[Merhaba]]! [[Simit]]? Taze!」' },
      ],
      choices: [
        { text: '指著麵包問價錢：「Kaç para?」', req: { word: 'kaç para' }, reqText: '你還不知道怎麼問價錢（點對話裡的字可以猜，或用手機查）',
          cost: { min: 1 }, goto: 'simit.price' },
        { text: '直接遞錢比手勢買一個', cost: { money: 25, min: 2 },
          effects: [{ flag: 'food' }, { log: '比手勢買了 simit' }], goto: 'simit.gesture' },
        { text: '用手機查「多少錢」怎麼說', cost: { bat: 3, min: 1 }, effects: [{ learn: 'kaç para', how: '手機翻譯' }], goto: 'simit' },
        { text: '離開' },
      ],
    },
    'simit.price': {
      title: 'Simit 小販', out: '他比了兩根手指和五根手指：「Yirmi beş.」二十五里拉。',
      body: [{ say: '「Yirmi beş lira. [[Teşekkürler]]!」' }],
      choices: [
        { text: '買一個（₺25）', cost: { money: 25, min: 1 }, effects: [{ flag: 'food' }, { log: '買了一個 simit' }, { toast: '背包裡多了一個 simit' }] },
        { text: '不買了' },
      ],
    },
    'simit.gesture': {
      title: 'Simit 小販', out: '他收了錢，用紙包好遞給你。',
      body: [{ p: '（你不確定有沒有被多收錢。）' }],
      choices: [{ text: '離開' }],
    },

    mosque: {
      title: '新清真寺', tag: '觀察',
      body: [{ p: '碼頭後面那座灰色的大清真寺，台階上坐滿了餵鴿子的人。入口掛著牌子：請脫鞋，女性請包頭巾。' }],
      choices: [
        { text: '坐在台階上看人和鴿子', cost: { min: 10, en: 5 }, effects: [{ mem: 1 }, { log: '在清真寺台階坐了一會' }], goto: 'mosque.steps' },
        { text: '脫鞋進去看看', req: { not: { t: { gte: SUNSET, lt: SUNSET + 12 } } }, reqText: '正在叫拜和禮拜，現在不開放參觀',
          cost: { min: 20 }, effects: [{ mem: 2 }, { log: '進了新清真寺' }], goto: 'mosque.inside' },
        { text: '離開' },
      ],
    },
    'mosque.steps': { title: '新清真寺', out: '鴿子突然一起飛起來，又落回同一個地方。', choices: [{ text: '離開' }] },
    'mosque.inside': { title: '新清真寺', out: '裡面很安靜，地毯很軟。藍色磁磚一直鋪到圓頂。', choices: [{ text: '出來' }] },

    view: {
      title: '清真寺剪影', tag: '拍照',
      body: [
        { p: '從這裡看，山丘上的清真寺正好壓在夕陽前面。光還有點平，再等等也許更好。', when: { t: { lt: 40 } } },
        { p: '從這裡看，山丘上的清真寺正好壓在夕陽前面。現在是最好的光。', when: { t: { gte: 40, lt: SUNSET + 2 } } },
        { p: '太陽下去了，天空在變藍，清真寺只剩剪影。', when: { t: { gte: SUNSET + 2, lt: SUNSET + 30 } } },
        { p: '天已經黑了，只剩剪影和燈。', when: { t: { gte: SUNSET + 30 } } },
      ],
      choices: [
        { text: '拍一張', cost: { bat: 2, min: 2 }, effects: [{ photo: { name: '清真寺剪影', kind: 'view' } }, { done: 'view' }] },
        { text: '等一下光線', cost: { min: 15 }, goto: 'view' },
        { text: '離開' },
      ],
    },

    shoe: {
      title: '掉刷子的擦鞋匠', tag: '事件',
      body: [{ p: '走在你前面的擦鞋匠，木箱上的刷子「啪」一聲掉在你腳邊。他好像沒發現，繼續往前走。' }],
      choices: [
        { text: '撿起來，叫住他還給他', effects: [{ log: '把刷子還給擦鞋匠' }], goto: 'shoe.polish' },
        { text: '不理他，繞過去繼續走', effects: [{ mem: 1 }, ...endShoe('沒理會掉刷子的擦鞋匠')], goto: 'shoe.ignored' },
      ],
    },
    'shoe.polish': {
      title: '掉刷子的擦鞋匠', tag: '事件',
      out: '他很誇張地道謝，拉著你坐下：「你是好人！我幫你擦鞋，免費！」刷了幾下，他抬頭。',
      body: [{ say: '「Four hundred lira, my friend. Special polish.」' }],
      choices: [
        { text: '付 ₺400', cost: { money: 400 }, effects: endShoe('付了 ₺400 擦鞋費'), goto: 'shoe.paid' },
        { text: '用土耳其語拒絕：「Hayır!」', req: { word: 'hayır' }, reqText: '你不知道土耳其語的「不」怎麼說',
          effects: [{ mem: 1 }, ...endShoe('用 hayır 拒絕了擦鞋匠')], goto: 'shoe.refused' },
        { text: '查手機「不」怎麼說', cost: { bat: 3, min: 1 }, effects: [{ learn: 'hayır', how: '手機翻譯' }], goto: 'shoe.polish' },
        { text: '塞給他 ₺50 趕快走', cost: { money: 50 }, effects: endShoe('給了 ₺50 脫身'), goto: 'shoe.bribe' },
      ],
    },
    'shoe.paid': { title: '掉刷子的擦鞋匠', bad: true, out: '他收了錢就走了。你後來才知道，這是伊斯坦堡很有名的騙局。', choices: [{ text: '離開' }] },
    'shoe.refused': { title: '掉刷子的擦鞋匠', out: '他愣了一下，聳聳肩，收起箱子走了。', choices: [{ text: '繼續走' }] },
    'shoe.bribe': { title: '掉刷子的擦鞋匠', bad: true, out: '他嘟囔了幾句，還是讓你走了。', choices: [{ text: '離開' }] },
    'shoe.ignored': { title: '掉刷子的擦鞋匠', out: '你走過去後回頭看，他撿起刷子，又走到另一個觀光客前面。', choices: [{ text: '繼續走' }] },

    fisher: {
      title: '釣魚的大叔', tag: '對話',
      body: [
        { p: '一排釣竿伸出欄杆。大叔腳邊的水桶裡有幾條銀色的小魚在跳。' },
        { p: '他看了你一眼，沒有說話。', when: { not: { word: 'merhaba' } } },
      ],
      choices: [
        { text: '打招呼：「Merhaba!」', req: { word: 'merhaba' }, reqText: '需要先學會 merhaba', cost: { min: 10 },
          effects: [{ mem: 2 }, { flag: 'fishTalk' }, { log: '跟釣魚大叔聊天' }], goto: 'fisher.talk' },
        { text: '站在旁邊看他釣', cost: { min: 10 }, random: { p: 0.5, then: 'fisher.caught', else: 'fisher.nothing' } },
        { text: '離開' },
      ],
    },
    'fisher.talk': {
      title: '釣魚的大叔', out: '他笑了，把水桶推過來給你看。',
      body: [{ say: '「[[İstavrit]]! Bak, bak.」' }, { p: '他用手比了一條魚的長度，又指了指橋下的餐廳。' }],
      choices: [
        { text: '謝謝他：「Teşekkürler!」', req: { word: 'teşekkürler' }, reqText: '還不會說謝謝', effects: [{ mem: 1 }, { log: '向釣魚大叔道謝' }] },
        { text: '點點頭離開' },
      ],
    },
    'fisher.caught': { title: '釣魚的大叔', out: '釣竿一沉，他甩上來一條小魚，丟進水桶。', onEnter: [{ log: '看大叔釣到一條魚' }], choices: [{ text: '離開' }] },
    'fisher.nothing': { title: '釣魚的大叔', out: '等了很久，魚線一直沒動。', onEnter: [{ log: '看大叔釣魚，沒有收穫' }], choices: [{ text: '離開' }] },

    cay: {
      title: '茶攤', tag: '購買',
      body: [
        { p: '鬱金香形狀的小玻璃杯，兩層的茶壺在小爐子上冒著煙。幾個老人坐在矮凳上。' },
        { say: '「[[Çay]]? Otur, otur.」' },
      ],
      choices: [
        { text: '買一杯茶坐下來', cost: { money: 30, min: 20, en: 15 },
          effects: [{ mem: 2 }, { learn: 'çay', how: '喝了才知道' }, { log: '在茶攤坐了二十分鐘' }], goto: 'cay.sit' },
        { text: '離開' },
      ],
    },
    'cay.sit': {
      title: '茶攤', out: '你想再付第二杯的錢，旁邊的老人按住你的手。',
      body: [{ say: '「[[Hayır]], [[hayır]]! Misafirsin.」' }, { p: '他搖著頭把錢推回來，自己付了。' }],
      choices: [
        { text: '「Teşekkürler!」', req: { word: 'teşekkürler' }, reqText: '還不會說謝謝（點上面的字猜）', effects: [{ mem: 2 }, { log: '向老人道謝' }] },
        { text: '笑著點頭' },
      ],
    },

    cat: {
      title: '橋邊的貓', tag: '隱藏',
      body: [{ p: '一隻橘貓從欄杆下鑽出來，盯著你的背包，顯然聞到了 simit 的味道。' }],
      choices: [
        { text: '撕一半 simit 給牠', req: { flag: 'food' }, reqText: '沒有食物',
          effects: [{ flag: 'food', set: 0 }, { mem: 3 }, { learn: 'kedi', how: '路人告訴你' }, { log: '餵了一隻貓' }], goto: 'cat.fed' },
        { text: '拍牠', cost: { bat: 2, min: 1 }, effects: [{ photo: { name: '橋邊的貓', kind: 'portrait' } }] },
        { text: '離開' },
      ],
    },
    'cat.fed': { title: '橋邊的貓', out: '牠吃完，在你腳邊蹭了一圈才走。旁邊賣茶的人說：「Kedi seni sevdi.」', choices: [{ text: '離開' }] },

    ezan: {
      title: '日落叫拜', tag: '事件',
      body: [
        { p: '太陽落進山丘後面。先是新清真寺，接著兩岸幾十座清真寺一起響起叫拜聲，在水面上來回疊著。' },
        { say: '（路邊的人說：「[[Ezan]].」）' },
      ],
      choices: [
        { text: '停下來聽完', cost: { min: 5 }, effects: [{ mem: 3 }, { learn: 'ezan', how: '聽了才懂' }, { log: '停下來聽日落叫拜' }] },
        { text: '拿手機錄一段', cost: { bat: 4, min: 5 }, effects: [{ mem: 2 }, { learn: 'ezan' }, { log: '錄了一段叫拜聲' }, { toast: '錄好了一段 3 分鐘的錄音' }] },
        { text: '繼續走' },
      ],
    },

    exit: {
      title: '卡拉柯伊', tag: '出口',
      body: [{ p: '橋走完了。往上是加拉達塔的坡，往右是卡拉柯伊的小酒館和你的青旅。' }],
      choices: [{ text: '下橋，結束這個場景', goto: '@summary' }, { text: '再待一下' }],
    },
  },
};

function endShoe(msg) {
  return [{ flag: 'shoeDone' }, { flag: 'shoeShown', set: 0 }, { done: 'shoe' }, { log: msg }];
}
