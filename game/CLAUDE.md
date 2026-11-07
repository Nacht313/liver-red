# 豬肝紅冒險・Godot 版（給 Claude Code 看）

這個資料夾是 Godot 4.7.2 專案。兩位開發者都是新手，主要靠 Claude Code 寫程式。先讀根目錄的 `CLAUDE.md`（遊戲是什麼、不能違反的規則），再讀這份。

設計：`docs/superpowers/specs/2026-11-07-godot-opening-design.md`
計畫：`docs/superpowers/plans/2026-11-07-godot-opening.md`

## 指令

```bash
bash game/tests/run.sh            # 全部測試（會先匯入資源）；只跑某個檔：bash game/tests/run.sh bag
npm run export:godot              # 網頁版資料 → game/data/opening/*.json 和 strings.csv 的自動區段
/Applications/Godot.app/Contents/MacOS/Godot --path game   # 開遊戲
```

Godot 遇到腳本錯誤時結束碼仍是 0，所以一律用 `run.sh`：它只認最後一行「N 項，0 項失敗」。

## 結構

| 路徑 | 內容 |
|---|---|
| `core/` | 規則層（`RefCounted`，不碰節點）：旅程狀態、時間、背包、劇情小語言、判定。無視窗也能測。 |
| `autoload/` | `Game`（持有規則層，管「一次只開一個介面」）、`Audio` |
| `data/opening/` | **匯出的資料，不要手改**。改 `src/story/opening/data.js` 再跑 `npm run export:godot`。 |
| `data/story/` | 劇情節點（手寫）：只放文字代號和規則。格式見 `docs/story-format.md`。 |
| `i18n/strings.csv` | **所有玩家看得到的文字**。一列一個代號，一欄一種語言（目前只有 `zh_TW`）。 |
| `scenes/` | 場景和介面 |
| `tests/` | 測試：`test_*.gd` 裡 `test_` 開頭的方法 |

## 不能違反

1. **文字只放在 `i18n/strings.csv`。** `.gd`、`.tscn`、`.json` 的程式碼和資料裡不能寫中文（註解可以）。測試 `test_no_cjk_outside_csv` 會抓。
2. **有變數的句子用佔位符**：CSV 寫「你換到了 {amount} 泰銖。」，程式寫 `tr("key").format({"amount": n})`。不要拼接字串，因為不同語言的語序不同。
3. **代號命名**：`<領域>.<id>.<欄位>`，例如 `item.passport.name`、`ui.title.new_game`、`story.dinner.mom_1`。女性主角的版本加 `@f` 後綴（這一版不寫）。
4. **規則以網頁版為準**：`src/game/journey/`、`src/story/opening/`。數字來自 `src/story/opening/data.js`。
5. **一次只開一個介面**：對話、判定、手機、背包、日記本、卡片都要透過 `Game.request_ui()`／`Game.release_ui()`。
6. **同一場景只用一張底圖**，時段由打光處理。
7. 改規則先寫失敗的測試，再寫程式；完成前跑 `bash game/tests/run.sh`。
8. 介面文字是台灣繁體中文；玩家看得到的地方不能有開發用語。
