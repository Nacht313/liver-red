# 架構

## 原則

- **邏輯和畫面分開**：`src/game/` 不碰 DOM／canvas，Node 可以直接測。畫面透過 hooks 跟邏輯溝通。
- **內容是資料**：spot 和互動卡寫在 `src/scenes/<id>/index.js`，用條件和效果的小語言描述，不寫函式。新增劇情不需要改引擎。
- **不打包**：原生 ES modules，沒有建置步驟，也不需要 npm 套件。靠 http server 就能跑。

## 一幀的流程

```
main.js tick(now)
 ├─ art.tick(dt)                 路人、渡輪等裝飾的動畫
 ├─ game.step(dt)                走路 → 花時間 → 經過觸發 → 發現 spot
 ├─ game.advance(1) 每 3 秒      站著不動也會天黑
 ├─ renderer.frame(now)
 │   ├─ 背景層 art.background    底圖 + 水面波光 + 海鷗 + 渡輪 + 依時間打光（暖色／入夜壓暗／窗戶燈）
 │   ├─ 近景層 art.foreground    橋、欄杆、路燈柱、道具、路人 + 玩家
 │   ├─ gradeForeground          近景用同一套光線參數調色（source-atop）
 │   ├─ 合成 + lampGlow          路燈光暈（lighter）
 │   └─ markers                  spot 記號、除錯範圍框
 └─ panels.prompt()              玩家旁邊有 spot 就顯示「E + 名稱」
```

狀態有變化時，`Game` 呼叫 `hooks.change()`，介面重畫 HUD、互動卡、設定表、筆記本。

## Game（src/game/game.js）

| 方法 | 用途 |
|---|---|
| `step(dt)` | 每幀走路、經過觸發、發現 |
| `advance(min)` | 花時間；處理時間觸發和場景結束 |
| `walkTo(wx)` / `walkHold` | 點畫面走路／方向鍵 |
| `nearSpot()` / `interact()` | E 互動 |
| `trigger(id, force)` | 打開 spot；卡片開著時會排隊 |
| `view()` | 目前卡片的畫面資料（標題、內文、選項和不能選的原因） |
| `choose(i)` | 選選項：付代價 → 套效果 → 換卡或關閉 |
| `stateOf(spot)` | hidden / unseen / seen / done |

## Spot 和互動卡的寫法

見 `docs/content-guide.md`。資料會被 `tests/unit/scene-data.test.js` 檢查：卡片連結、孤兒卡、單字登記、條件和效果的寫法。

## 新增一個場景

1. `src/scenes/<id>/index.js`：資料（照 galata 的格式）。
2. `src/scenes/<id>/art.js`：`IMAGES`、`LAMPS`、`background(r)`、`foreground(r)`、`ferryVisible(r)`（沒有可以回傳 false）、`tick(dt)`。
3. `assets/scenes/<id>/`：素材。
4. 在 `tests/unit/scene-data.test.js` 的 `scenes` 陣列加進去。
5. 目前 `main.js` 直接載入 galata；有第二個場景時要加場景切換（見 roadmap）。

## 旅程和文字場景（src/game/journey/、src/story/）

開幕這類「選單式」的段落用 DoL 式文字場景：左側狀態欄、插圖、敘述、編號選項。

| 檔案 | 用途 |
|---|---|
| `journey/journey.js` | `Journey`：旅程狀態（第幾天、幾點、精力／飽食／信念／電量／衛生／家裡、錢、背包、旅行知識）、時間流逝、上限鎖、付錢、睡覺、存檔（日記、入境章）、結局 |
| `journey/bag.js` | 背包分層、總重、手提行李重量、重心 |
| `journey/time.js` | 日期、時鐘、一天的分段 |
| `journey/rules.js` | 劇情節點的條件、效果、文字變數（寫法說明在檔案開頭） |
| `journey/flow.js` | `Flow`：目前在哪個節點、產生畫面資料、選項之後去哪裡 |
| `story/opening/data.js` | 開幕的資料表：知識、物品、交通、住宿、結局（純資料，可轉 JSON） |
| `story/opening/nodes.js` | 劇情節點（純資料，策劃可以直接改） |
| `story/opening/screens-*.js` | 清單類畫面（查資料、網購、訂票、機場、入境…）：由資料表產生選項 |
| `story/opening/actions.js` | 節點用 `{ do: '名稱' }` 呼叫的複雜規則 |
| `ui/textgame.js`、`ui/journey-side.js`、`render/paint.js` | 介面、側欄、SVG 插圖 |

規則：

- 劇情節點和資料表必須能 `JSON.stringify` 來回不變（`tests/unit/opening.test.js` 會檢查），之後搬 Godot 時直接帶走。
- 清單畫面的 `view()` 只能讀狀態；改狀態寫在選項的 `fn` 或畫面的 `enter()`。亂數也只能在這兩個地方擲。
- 上一個動作的結果用 `J.flash` 帶到下一個畫面最上面。
- 存檔：睡在家裡寫日記（`zgh_diary`）、泰國入境蓋章（`zgh_stamp`）；旅行知識跨輪保留（`zgh_meta`）。
