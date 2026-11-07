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
