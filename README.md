# 豬肝紅冒險

拿著「探險者護照」的高難度像素背包旅行遊戲。

目前可以玩的是**加拉達橋・黃昏**（伊斯坦堡）捲軸場景：從埃米諾努碼頭走到卡拉柯伊，在日落前後和攤販、釣客、茶攤、騙子、貓互動，用猜的學土耳其語。

## 執行

```bash
python3 -m http.server 8000
```

打開 http://localhost:8000/ 。（ES modules 不能直接雙擊 index.html 打開。）

操作：點畫面或 ← → 走路，走到記號旁按 E 或 Enter 互動，數字鍵選選項。手機點提示框。

## 測試

```bash
npm test                    # 單元測試，不需要安裝套件（Node 20 以上）
python3 tests/e2e/run.py    # 瀏覽器端對端測試（pip install playwright && python -m playwright install chromium）
```

## 目錄

| 路徑 | 內容 |
|---|---|
| `src/game/` | 遊戲邏輯（可在 Node 測試） |
| `src/scenes/` | 場景資料和畫面 |
| `src/render/` `src/ui/` | 畫面管線、統一光影、介面 |
| `assets/` | 素材（Anima 生成後處理） |
| `tools/art/` | 生圖和去背腳本（在 Mac 上跑） |
| `prototypes/` | 早期單檔原型（參考用） |
| `docs/` | 設計摘要、架構、內容撰寫指南、美術流程、路線圖、現實研究 |

開發者（包括 Claude）請先讀 `CLAUDE.md`。
