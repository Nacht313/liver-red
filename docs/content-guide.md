# 內容撰寫指南（給策劃）

> 這份寫的是**捲軸場景**（加拉達橋）。開幕這類文字場景的劇情寫在 `src/story/opening/nodes.js`，條件和效果的寫法在 `src/game/journey/rules.js` 開頭，格式說明在 `nodes.js` 開頭。改完一樣跑 `npm test`。

劇情、價錢、位置都寫在 `src/scenes/<場景>/index.js`。只要照下面的格式改，不用碰引擎。改完跑 `npm test`，資料寫錯的地方會被指出來。

## Spot

```js
{ id: 'simit', name: 'Simit 小販', x: 330, type: '對話',
  trigger: { kind: 'interact' },   // interact：走到旁邊按 E；pass：經過觸發 { kind:'pass', dir: 1 }；time：時間到 { kind:'time', at: 68 }
  reveal: 140,                     // 走到多近會冒出記號（場景像素）
  visibleIf: { flag: 'food' },     // 不成立時完全不出現（可省略）
  onOpen: [ ... ],                 // 打開時執行的效果（可省略）
  doneOn: 'effect',                // 要等效果 { done: 'simit' } 才算互動完成（可省略，預設一打開就算）
  start: 'simit',                  // 第一張卡
  design: { cond: '無', cost: '₺25、2 分鐘', reward: '食物' } }  // 只給設定表看的說明
```

場景寬 1800，高 320。x 是 spot 在世界裡的水平位置。

## 互動卡

```js
'simit.price': {
  title: 'Simit 小販', tag: '對話',
  out: '上一個選擇的結果，用綠字顯示。', bad: true,  // bad 讓結果變紅字
  body: [
    { p: '敘述。' },
    { say: '「[[Merhaba]]! Taze!」' },           // [[字]] 是可以學的外語單字，要先登記在 words
    { p: '只有晚上才會出現的句子。', when: { t: { gte: 70 } } },
  ],
  onEnter: [{ log: '…' }],                       // 進到這張卡時執行
  choices: [
    { text: '買一個', cost: { money: 25, min: 1 },  // min 分鐘、money 錢、bat 電量、en 精力（正數是增加）
      req: { word: 'kaç para' }, reqText: '還不會問價錢',   // 不能選時顯示原因
      effects: [{ flag: 'food' }, { log: '買了 simit' }],
      goto: 'simit.bought' },                   // 沒有 goto 就關掉卡片；'@summary' 是結算
    { text: '看他釣魚', random: { p: 0.5, then: 'fisher.caught', else: 'fisher.nothing' } },
  ],
}
```

## 條件

| 寫法 | 意思 |
|---|---|
| `{ word: 'merhaba' }` | 已學會單字 |
| `{ flag: 'food' }` / `{ noFlag: 'food' }` | 旗標為真／為假 |
| `{ t: { gte: 40, lt: 80 } }` | 場景時間（從開始算的分鐘） |
| `{ money: { gte: 25 } }` | 錢；電量 `bat`、精力 `en` 同理 |
| `{ spot: 'cat', is: 'done' }` | spot 狀態 |
| `{ all: [...] }` `{ any: [...] }` `{ not: {...} }` | 組合；直接寫陣列等於 all |

## 效果

| 寫法 | 意思 |
|---|---|
| `{ learn: 'balık', how: '邊吃邊懂了' }` | 學會單字 |
| `{ flag: 'food' }` / `{ flag: 'food', set: 0 }` | 設定／清除旗標 |
| `{ mem: 2 }` | 回憶值 |
| `{ log: '…' }` `{ toast: '…' }` | 寫進經過紀錄／跳提示 |
| `{ done: 'shoe' }` | 把 spot 標成已互動 |
| `{ photo: { name: '清真寺剪影', kind: 'view' } }` | 拍照（`portrait` 是近拍） |

## 真實性

價錢、規定、營業時間要寫來源和查證日期（註解或 `docs/research/`）。上線前要再查一次。
