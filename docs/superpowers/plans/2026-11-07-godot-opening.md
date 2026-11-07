# Godot 版開場 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `game/` 建一個 Godot 4.7.2 專案，做出高品質、可以完整玩的開場：主角在家裡（橫向捲軸）準備出國，到下樓出發為止。

**Architecture:** 規則層（`game/core/`，`RefCounted`，不碰節點）照網頁版 `src/game/journey/` 一比一移植，可以用無視窗模式測試。內容層是 JSON 資料（`game/data/`）加 CSV 翻譯表（`game/i18n/strings.csv`）：資料只放文字代號，文字本身都在翻譯表。表現層是 Godot 場景（`game/scenes/`），透過 autoload `Game` 讀寫狀態，透過 signal 收到變化。

**Tech Stack:** Godot 4.7.2、GDScript、Godot 內建 CSV 翻譯、JSON；Node 20+ 跑資料匯出腳本；Python（`~/VideoStudio/envs/manim/bin/python`，有 numpy）合成音效；本機 Anima 或 gpt-image-2.5 生圖。

**Spec:** `docs/superpowers/specs/2026-11-07-godot-opening-design.md`

## Global Constraints

- Godot 版本固定 **4.7.2**；執行檔 `/Applications/Godot.app/Contents/MacOS/Godot`（下文寫作 `$GODOT`）。
- 基礎解析度 **480×270**，`display/window/stretch/mode="viewport"`，`scale_mode="integer"`，視窗預設 1920×1080。
- 規則行為以網頁版 `src/game/journey/`、`src/story/opening/` 為準；數字一律來自 `src/story/opening/data.js`，不手抄。
- 玩家看得到的文字**只能**來自 `game/i18n/strings.csv`（欄位 `keys,zh_TW`）。`.gd`、`.tscn`、`.json` 裡不得出現中日韓文字；有變數的句子用 `{name}` 佔位符配 `String.format()`，不拼接字串。
- 介面文字：台灣繁體中文、台灣用語；不得出現開發用語（demo、測試、尚未實作、TODO）。
- 主角性別是設定值 `JourneyState.gender = "m"`；台詞代號可以有 `@f` 後綴的女性版本，這一版只寫男性。
- 鎖住的上限最低 50；股票虧損的鎖例外最低 1（這一版沒有股票，但 `lock()` 照網頁版保留例外）。
- 同一場景只用一張底圖，時段由程式打光；前景和背景吃同一套光線參數。
- 音效全由 `tools/audio/synth_sfx.py` 合成；音樂只用 OpenGameArt 的 CC0 曲子，每首下載前先向策劃確認檔名、來源、大小，記進 `game/CREDITS.md`。
- 檔案 200–400 行為宜，超過 400 行就拆。
- 推上 GitHub 前要先問策劃。

## Review Focus

1. **連按和亂按**：對話逐字顯示時連按確認、判定欄滑進來時按 Esc、手機開著時按 J。預期：一次只開一個介面，按鍵不會穿透到後面的場景，也不會重複觸發同一個效果（例如付兩次錢）。→ Task 6、Task 8 的測試。
2. **錢在家裡花光**：網購或訂房把錢花完。預期：立刻進結局畫面，不會卡在手機介面或對話框裡。→ Task 7 的 `test_money_runs_out_mid_phone`。
3. **讀檔回到中間狀態**：在出發前一晚寫日記，隔天錯過時間後讀檔。預期：回到床邊、時間是寫日記那晚、旅行知識保留，介面全部關閉。→ Task 11 的測試。
4. **文字太長**：翻譯成英文後句子變長、名字很長。預期：對話框自動換行和分頁，不會超出框外。→ Task 6 的 `test_long_text_pages`。
5. **背包拖曳放到不合法的位置**：放到格子外、重疊、放進沒有腰包的腰包層。預期：物品彈回原位，狀態不變。→ Task 10 的測試。

---

## 檔案結構

```
game/
  project.godot                 專案設定、autoload、翻譯表、輸入
  CLAUDE.md                     給 Claude Code 的規則（兩人共用）
  README.md                     新手說明：安裝、執行、改台詞、同步、跑測試
  CREDITS.md                    字型、音樂的作者和授權
  core/                         規則層（RefCounted，不碰節點）
    journey_state.gd            JourneyState：狀態欄位、newGame、to_dict/from_dict
    time_util.gd                TimeUtil：dateStr、clock、seg、tod、hours_to_next_seg
    bag.gd                      Bag：carried、total_kg、cabin_kg、bad_center、grid 擺放
    journey.gd                  Journey：add、cap、lock、advance、sleep、pay、learn、end、on_new_day
    rules.gd                    Rules：test(cond)、apply(effects)、fill(text)
    checks.gd                   Checks：chance(attr, bonus)、roll()
    story_runner.gd             StoryRunner：節點、對話行、選項、判定、開介面
    data_db.gd                  DataDB：載入 data/opening/*.json
    save_store.gd               SaveStore：user:// 的日記、meta 存檔
  autoload/
    game.gd                     Game：持有 Journey、DataDB、StoryRunner、SaveStore；signal
    audio.gd                    Audio：play_sfx(name)、play_music(name)、blip(voice)
  data/opening/                 由 tools/export_opening_data.mjs 產生的 JSON（不要手改）
  data/story/opening.json       劇情節點（手寫，只放代號和規則）
  data/home.json                家裡的可互動物品：位置、名稱代號、互動節點
  i18n/strings.csv              所有文字（匯出的＋手寫的）
  scenes/title/                 標題畫面
  scenes/home/                  家：捲軸場景、主角、互動物品、打光、樓梯間
  scenes/ui/                    dialogue_box、check_panel、day_card、phone/、backpack/、journal/、end_card、outing_card、hud_prompt
  art/                          生成並後處理過的圖
  audio/sfx/、audio/music/
  fonts/
  tests/run_tests.gd            測試執行器（extends SceneTree）
  tests/test_case.gd            assert 小工具
  tests/test_*.gd               各模組測試
tools/export_opening_data.mjs   網頁版資料 → game/data/opening/*.json ＋ strings.csv 的匯出區段
tools/audio/synth_sfx.py        合成音效 → game/audio/sfx/*.wav
```

測試指令（之後簡稱 `run-tests`）：

```bash
$GODOT --headless --path game --import && $GODOT --headless --path game --script res://tests/run_tests.gd
```

結束碼 0 才算通過；`run_tests.gd` 會印出每項 `ok`／`FAIL` 和總數。

---

### Task 1：專案骨架、測試執行器、翻譯表

**Files:**
- Create: `game/project.godot`、`game/CLAUDE.md`、`game/README.md`、`game/tests/run_tests.gd`、`game/tests/test_case.gd`、`game/tests/test_i18n.gd`、`game/i18n/strings.csv`、`game/scenes/title/title.tscn`、`game/scenes/title/title.gd`
- Modify: `CLAUDE.md`（加一段「Godot 版在 game/，先讀 game/CLAUDE.md」）、`.gitignore`（加 `game/i18n/*.translation`：這是 Godot 匯入 CSV 時產生的檔案，不進版本紀錄；測試前一律先 `--import`）

**Interfaces:**
- Produces: `TestCase`（`class_name TestCase extends RefCounted`）：`eq(a, b, msg)`、`ok(cond, msg)`、`fail_count: int`；`run_tests.gd` 載入 `res://tests/test_*.gd`，對每個 `test_` 開頭的方法建立新實例執行。
- Produces: 翻譯代號命名規則：`<領域>.<id>.<欄位>`，例如 `item.passport.name`、`ui.title.new_game`、`story.dinner.mom_1`。

- [ ] **Step 1：寫失敗的測試** `game/tests/test_i18n.gd`
  - `test_every_key_has_zh_tw`：讀 `res://i18n/strings.csv`，每一列 `zh_TW` 非空、代號不重複。
  - `test_no_cjk_outside_csv`：掃 `res://` 下所有 `.gd`、`.tscn`、`.json`（略過 `tests/` 和 `i18n/`），內容不得含 `[㐀-鿿　-〿＀-￯]`。
  - `test_placeholder_format`：`tr("ui.test.format").format({"amount": 3})` 結果含 `3`（CSV 放一列 `ui.test.format`）。
- [ ] **Step 2：跑 `run-tests`**，預期 FAIL（專案還不存在）。
- [ ] **Step 3：建立專案**。`project.godot`：名稱 key `ui.app.name`、主場景 `res://scenes/title/title.tscn`、480×270、stretch viewport integer、`internationalization/locale/translations=["res://i18n/strings.zh_TW.translation"]`、預設 locale `zh_TW`、輸入動作 `move_left`(←,A)、`move_right`(→,D)、`interact`(E,Enter,Space)、`cancel`(Esc,X)、`journal`(J)、`phone`(P)、`choice_up`/`choice_down`(↑↓)。標題場景先只放一個 `Label`，文字用 `ui.app.name`。
- [ ] **Step 4：寫 `game/CLAUDE.md`**：專案結構、上面的 Global Constraints、`run-tests` 指令、「資料 JSON 不手改，改 `src/story/opening/data.js` 再跑匯出」、「新文字先加進 strings.csv」。寫 `game/README.md` 的「安裝 Godot 4.7.2、打開 game/project.godot、按右上角 ▶ 執行」三段，其他段落留到 Task 15。
- [ ] **Step 5：跑 `run-tests`**，預期 PASS；再用 `$GODOT --path game` 開一次，確認標題字顯示（截圖）。
- [ ] **Step 6：Commit** `feat(godot): 專案骨架、測試執行器、翻譯表`

---

### Task 2：資料匯出（網頁版 → JSON ＋ 翻譯表）

**Files:**
- Create: `tools/export_opening_data.mjs`、`game/data/opening/*.json`（產物）、`tests/unit/export.test.js`、`game/core/data_db.gd`、`game/tests/test_data.gd`
- Modify: `game/i18n/strings.csv`（匯出腳本只改寫 `# BEGIN generated`／`# END generated` 之間的列）、`package.json`（加 `"export:godot": "node tools/export_opening_data.mjs"`）

**Interfaces:**
- Consumes: `src/story/opening/data.js` 的所有 export。
- Produces: JSON 檔 `items.json`、`layers.json`、`trans.json`、`stays.json`、`nights.json`、`hosts.json`、`stops.json`、`research.json`、`know.json`、`endings.json`、`family.json`、`tips.json`、`constants.json`（FX、匯率、PACK_KG、DAY_KG、CABIN_LIMIT_KG、EXTRA_BAG_*、LAST_MINUTE、START_DATE、grid 尺寸 SIZE／GRID 從原型抄進 data.js 再匯出）。文字欄位換成代號：`ITEMS.passport.n` → `"name": "item.passport.name"`；`KNOW.k_tdac` → `"know.k_tdac"`。
- Produces: `DataDB`（`class_name DataDB extends RefCounted`）：`static func load_all() -> DataDB`；屬性 `items: Dictionary`、`layers`、`trans`、`stays`、`nights: Array`、`hosts`、`stops: Array`、`research: Array`、`know: Dictionary`、`endings`、`family: Array`、`tips: Array`、`c: Dictionary`（constants）。

- [ ] **Step 1：寫失敗的 Node 測試** `tests/unit/export.test.js`：
  - `export: 每個中文欄位都變成代號，且代號出現在 strings.csv`
  - `export: 數字和 data.js 一致`（例：`trans.fsc.p === 1700`、`items.laptop.kg === 1.9`、`constants.CABIN_LIMIT_KG === 7`）
  - `export: 重跑兩次結果相同`（產物檔案內容不變）
- [ ] **Step 2：`npm test`** 預期 FAIL。
- [ ] **Step 3：實作 `tools/export_opening_data.mjs`**。先把原型的 `SIZE`、`GRID`（`prototypes/liver-red-demo-v3.html:1398,1400`）加進 `src/story/opening/data.js` 當 `ITEM_SIZE`、`LAYER_GRID`。代號規則：`<表名單數>.<id>.<欄位>`；`n`→`name`、`d`→`desc`、`visa`→`visa`。CSV 用 RFC 4180 引號規則。
- [ ] **Step 4：`npm test`** PASS；`npm run export:godot` 產生檔案。
- [ ] **Step 5：寫失敗的 Godot 測試** `game/tests/test_data.gd`：`test_load_all`（`DataDB.load_all().trans["fsc"]["p"] == 1700`）、`test_names_translate`（`tr(db.items["passport"]["name"]) != db.items["passport"]["name"]`）。
- [ ] **Step 6：實作 `game/core/data_db.gd`**，跑 `run-tests` PASS。
- [ ] **Step 7：Commit** `feat(godot): 資料匯出與 DataDB`

---

### Task 3：旅程規則層（移植 journey.js、bag.js、time.js）

**Files:**
- Create: `game/core/journey_state.gd`、`game/core/time_util.gd`、`game/core/bag.gd`、`game/core/journey.gd`、`game/core/save_store.gd`、`game/tests/test_journey.gd`、`game/tests/test_bag.gd`

**Interfaces:**
- Consumes: `DataDB`（Task 2）。
- Produces: `JourneyState extends RefCounted`：欄位照網頁版 `freshState()`（`day, h, place_key, zone, loc, card, cny, thb, usd, start, energy, food, faith, battery, hyg, family, locks: Array, attr: Dictionary（鍵用 "knowledge","nerve","craft","empathy","charm"）, eng, items: Dictionary, grid: Dictionary（Task 10 用）, orders, know: Array, researched, r_today, dest, trans, dep, dep_mul, extra_bag, stay, cs, cs_tried, refs, tdac, tdac_addr, ins, esim, laos_visa, msgs, diary: Array, photos: Array, thoughts, flags, over, ending, gender="m", resume`）；`func to_dict() -> Dictionary`、`static func from_dict(d) -> JourneyState`。
- Produces: `Journey extends RefCounted`：`var S: JourneyState`、`var db: DataDB`、`var rand: Callable`（預設 `randf`）、`signal changed`、`signal toast(key: String, args: Dictionary)`、`signal ended(kind: String)`；方法 `new_game()`、`cap(stat) -> float`、`add(stat, n)`、`lock(src, stat, cap, how_key)`、`unlock(src)`、`money() -> float`、`cash_thb() -> float`、`pay_cny(n)`、`pay_thb(n)`、`learn(k) -> bool`、`knows(k) -> bool`、`advance(hours, opts := {})`、`until(h)`、`next_seg() -> bool`、`sleep(kind)`、`push_msg(from_key, text_key)`、`write_diary(where_key)`、`end(kind)`、`has(id) -> bool`。
- Produces: `TimeUtil`（static）：`date_str(day, short:=false) -> String`（短格式 `M/D`；長格式用翻譯代號 `ui.date.long` = `20XX/{m}/{d} 星期{w}`）、`clock(h) -> String`、`seg_key(h) -> String`、`tod(h) -> String`、`hours_to_next_seg(h) -> float`、`is_night(h) -> bool`。
- Produces: `Bag`（static，參數 `S, db`）：`carried`、`layer_sum`、`big_used`、`total_kg`、`cabin_kg`、`bad_center`、`weight_factor`、`layer_open`、`overfull`、`fix_waist`、`try_put`。
- Produces: `SaveStore extends RefCounted`：`func _init(dir := "user://")`、`get_slot(name) -> Variant`、`set_slot(name, value)`；檔名 `zgh_meta.json`、`zgh_diary.json`。`Journey` 用 `save(slot, label_key)`、`load(slot) -> bool`、`clear_all()`。

- [ ] **Step 1：寫失敗的測試**：把 `tests/unit/journey.test.js` 裡和開場有關的 12 項逐項翻成 GDScript（名稱照抄、斷言數字照抄）：時鐘和日期、上限鎖最低 50 與股票例外 1、家人壓力鎖、先刷卡再用現金與錢歸零、泰銖不夠刷卡、在家飽食不降、精力歸零結束、睡覺跨日與思想櫃、網購兩天後到、知識跨輪保留（兩個 Journey 共用一個 `SaveStore` 暫存資料夾）、讀檔、背包三項。存檔測試用 `SaveStore.new("user://test_saves/")`，測完刪除。
- [ ] **Step 2：`run-tests`** 預期 FAIL。
- [ ] **Step 3：實作**。行為逐行對照網頁版；`advance` 一次最多走 1 小時的迴圈照抄。
- [ ] **Step 4：`run-tests`** PASS。
- [ ] **Step 5：Commit** `feat(godot): 旅程規則層`

---

### Task 4：劇情小語言與 StoryRunner

**Files:**
- Create: `game/core/rules.gd`、`game/core/checks.gd`、`game/core/story_runner.gd`、`game/data/story/opening.json`（先放測試用的最小劇情）、`game/tests/test_rules.gd`、`game/tests/test_story.gd`、`docs/story-format.md`

**Interfaces:**
- Consumes: `Journey`（Task 3）。
- Produces: `Rules`（static）：`test(cond, J) -> bool`、`apply(effects: Array, J, actions: Dictionary)`、`fill(key, J, args := {}) -> String`（`tr(key).format(args ＋ 內建值)`；內建值 `date`、`clock`、`total_kg`、`cabin_kg`、`cash_thb`、`thb`）。條件和效果的種類照 `src/game/journey/rules.js` 開頭的清單，另外加效果 `{"check": {...}}`（見下）和 `{"open": "phone"|"backpack"|"journal"|"outing", "arg": ...}`。
- Produces: `Checks`（static）：`chance(J, attr: String, bonus := 0) -> int` = `clamp(25 + attr*10 + round((eng-2)*5) + round((faith-50)/5) + bonus, 5, 95)`（網頁版原型 `chanceOf`）；`roll(J, chance) -> Dictionary` 回傳 `{"roll": int 1..100, "win": bool, "crit": bool}`，`crit = roll <= chance/4`。
- Produces: 劇情節點格式（`opening.json`）：
  ```json
  { "nodes": { "dinner": {
      "on_enter": [ ...效果 ],
      "lines": [ {"who": "mom", "text": "story.dinner.mom_1", "when": {...}} ],
      "choices": [ {"text": "story.dinner.c_10k", "sub": "...", "when": {}, "req": {}, "req_text": "...", "effects": [], "goto": "night0"} ],
      "check": {"attr": "empathy", "bonus": 0, "text": "check.friend.prompt", "win": "friend.win", "lose": "friend.lose"}
  } } }
  ```
  `who` 對應 `data/speakers.json`（名字代號、頭像路徑、說話聲音高）。
- Produces: `StoryRunner extends RefCounted`：`signal line(who: String, text: String)`、`signal choices(list: Array)`（每項 `{text, sub, why}`，已翻譯）、`signal check_started(info: Dictionary)`（`attr, level, chance, text`）、`signal check_resolved(result: Dictionary)`、`signal open_ui(kind: String, arg)`、`signal finished`；方法 `start(node_id)`、`advance()`（下一行）、`choose(i)`、`is_busy() -> bool`。一次只跑一個節點；`is_busy()` 為真時其他互動一律忽略。

- [ ] **Step 1：寫失敗的測試**：`test_rules.gd` 照 `journey.test.js` 的「條件和效果的小語言」逐條翻；`test_story.gd`：
  - `test_lines_then_choices`：最小劇情兩行台詞、兩個選項，`line` 發兩次後才發 `choices`。
  - `test_choice_effects_once`：選項效果 `{"pay": 100}`；連續呼叫 `choose(0)` 兩次，`card` 只少 100。
  - `test_check_flow`：`rand` 固定回傳 0.0，`check` 走 `win`；固定 0.99 走 `lose`；`check_started.chance` 等於 `Checks.chance`。
  - `test_unknown_effect_errors`：未知效果 `push_error` 並略過，不當機。
  - `test_graph`：`opening.json` 每個 `goto`、`win`、`lose` 都指向存在的節點；每個文字代號都在 strings.csv。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**。`docs/story-format.md` 用策劃讀得懂的方式寫格式（照 `docs/content-guide.md` 的風格）。
- [ ] **Step 4：`run-tests`** PASS。
- [ ] **Step 5：Commit** `feat(godot): 劇情小語言與 StoryRunner`

---

### Task 5：家（捲軸場景、主角走路、互動提示）＋ autoload Game

**Files:**
- Create: `game/autoload/game.gd`、`game/scenes/home/home.tscn`、`home.gd`、`player.tscn`、`player.gd`、`interactable.gd`、`game/scenes/ui/hud_prompt.tscn`、`.gd`、`game/data/home.json`、`game/tests/test_home_data.gd`
- Modify: `game/project.godot`（autoload `Game`）、`title.gd`（「新的旅程」進到 home）

**Interfaces:**
- Consumes: `Journey`、`DataDB`、`StoryRunner`、`SaveStore`。
- Produces: autoload `Game`：`var J: Journey`、`var story: StoryRunner`、`var db: DataDB`、`var store: SaveStore`、`var ui_open: String`（`""`／`"dialogue"`／`"check"`／`"phone"`／`"backpack"`／`"journal"`／`"card"`）；`func can_move() -> bool`（`ui_open == ""`）；`func request_ui(kind) -> bool`（已開別的就回 false）、`func release_ui(kind)`。
- Produces: `home.json`：`{"width": 1920, "areas": [{"id":"bedroom","x0":0,"x1":520}, ...], "objects": [{"id":"desk_pc","x":180,"name":"home.desk_pc.name","node":"obj.desk_pc","when":{}}]}`。區域：`bedroom`、`living`、`dining`、`door`、`stairwell`（樓梯間在大門外，`x` 從 1560 起；下樓是走到最右邊 `exit`）。
- Produces: `Interactable`（`extends Area2D`）：`@export var object_id: String`；主角進入範圍 26 px 內顯示 `hud_prompt`（`[E] 名稱`）。

- [ ] **Step 1：寫失敗的測試** `test_home_data.gd`：`test_objects_inside_areas`（每個物品的 `x` 在某個區域內）、`test_object_nodes_exist`（`node` 都在 `opening.json`）、`test_name_keys`。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作場景**。先用色塊當佔位美術（每個區域不同底色、物品是有名字的方塊），主角是 16×32 的色塊，走路速度 62 px/s（網頁版 `WALK_SPEED`），`Camera2D` 跟隨並限制在 `0..width`。走路花遊戲時間照網頁版：走完整個家 1920 px 約 4 分鐘（`advance` 以小時計，0.07 h）。
- [ ] **Step 4：`run-tests`** PASS；開遊戲：從房間走到樓梯間，靠近書桌出現提示，按 E 印出節點 id（暫時），截圖。
- [ ] **Step 5：Commit** `feat(godot): 家的捲軸場景與互動提示`

---

### Task 6：Undertale 式對話框

**Files:**
- Create: `game/scenes/ui/dialogue_box.tscn`、`dialogue_box.gd`、`game/data/speakers.json`、`game/tests/test_dialogue_box.gd`
- Modify: `home.gd`（互動 → `Game.story.start(node)`）

**Interfaces:**
- Consumes: `StoryRunner` 的 `line`、`choices`、`finished` signal。
- Produces: `DialogueBox`（`extends CanvasLayer`）：`func show_line(who: String, text: String)`、`func show_choices(list: Array)`、`func skip_or_next()`、`signal choice_made(i: int)`；逐字速度 `chars_per_sec = 30`；每 2 個非空白字元呼叫一次 `Audio.blip(speaker.voice)`（Task 14 前先是空函式）。
- 版面：畫面下方 460×76，黑底、3 px 白框；頭像 48×48 在左；文字區最多 3 行，超過自動分頁（`▼` 提示）。

- [ ] **Step 1：寫失敗的測試**（以節點實例化，不開視窗）：
  - `test_typewriter_then_next`：`show_line` 後立刻 `skip_or_next()` → 文字全出；再呼叫一次 → 發出「下一行」。
  - `test_mash_does_not_skip_choices`：連續呼叫 `skip_or_next()` 十次，不會自動選到選項。
  - `test_long_text_pages`：用 300 字的英文字串（`Translation` 臨時加一列 `test.long`），分頁數 ≥ 2，每頁的 `Label.get_line_count() <= 3`。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**；字型先用 Godot 預設字型，Task 13 再換像素字。
- [ ] **Step 4：`run-tests`** PASS；開遊戲按書桌，看到逐字對話，截圖。
- [ ] **Step 5：Commit** `feat(godot): Undertale 式對話框`

---

### Task 7：開場劇情與家裡的行動（主線串起來）

**Files:**
- Modify: `game/data/story/opening.json`、`game/i18n/strings.csv`、`game/data/home.json`、`game/core/story_runner.gd`（章節動作表）
- Create: `game/core/opening_actions.gd`（網頁版 `src/story/opening/actions.js` 的 GDScript 版）、`game/scenes/ui/outing_card.tscn`、`.gd`、`game/scenes/ui/day_card.tscn`、`.gd`、`game/scenes/ui/end_card.tscn`、`.gd`、`game/tests/test_playthrough.gd`

**內容**（台詞從網頁版 `nodes.js`、`screens-home.js` 搬，代號化；新寫的自言自語是草稿，策劃之後改）：
- 開頭：深夜房間（自言自語：拒信、畢業證書）→ 走到飯廳 → 晚飯對話（含新的膽識判定，Task 8 前先走 `lose` 分支）→ 選旅費（`startFunds`）→ 回房間上床 → 日期卡 → 早上。
- 物品和行動對照：

| 物品 | 行動 |
|---|---|
| 書桌電腦 | 開手機同一套 App（Task 9；之前先顯示「電腦還沒開機」的自言自語） |
| 床 | 休息到下一段時間；晚上睡覺（寫日記存檔） |
| 背包 | 打包（Task 10；之前先跳過） |
| 窗戶、畢業照、獎狀、冰箱便條、書架 | 自言自語（回憶草稿各 1–3 句） |
| 爸爸（客廳） | 晚上的閒聊；家族群訊息的現場版 |
| 媽媽（飯廳） | 出發前幾天的叮嚀；第 4 天起「什麼時候走」 |
| 書架上的英文小說 | 讀書練英語（判定在 Task 8） |
| 大門 | 出門辦事：銀行換泰銖、領現金、跟朋友吃飯 → `outing_card` |
| 樓梯間快遞櫃 | 網購到貨後去拿（`orders` 的 `got` 改為在這裡領取才進背包。**［決定］** 這是和網頁版不同的地方：網頁版到貨就自動進家裡） |
| 樓梯間鄰居、小廣告 | 自言自語、鄰居閒聊 |
| 樓梯最下面（社區大門） | 出發日、時間未過 `latest`：出發 → 結尾卡；其他日子：「還不是時候」 |

- 出發前一晚、出發當天的敘事照網頁版 `depart` 節點（零食、爸爸「到了報平安」）。
- 結局：錢花完、精力歸零、信念歸零 → `end_card`。

**Interfaces:**
- Produces: `OpeningActions`（static）：`start_funds`、`depart_prep`、`set_place`、`default_pack`，以及搬自網頁版清單畫面的行動：`buy_item(id)`、`book_trans(k, days, mul, bag)`、`book_stay(kind, nights_i)`、`cancel_stay()`、`research(id) -> Dictionary`、`bank_exchange()`、`bank_withdraw()`、`errand(kind)`（`ins`／`esim`／`laos`／`tdac`）、`friend_dinner(won: bool)`、`study(won: bool)`、`pick_up_parcels() -> Array`。全部回傳後由 `Journey.changed` 通知畫面。
- Produces: `DayCard.show(day)`、`OutingCard.show(title_key, body_key, args)`、`EndCard.show(kind)`，三者都 `Game.request_ui("card")`。

- [ ] **Step 1：寫失敗的測試** `test_playthrough.gd`（直接驅動 `StoryRunner` 和 `OpeningActions`，不開場景）：
  - `test_intro_to_morning`：開頭 → 選 ¥50,000 → `S.card == 50000`、`S.day == 1`、`S.h == 7.5`。
  - `test_full_prep_to_departure`：查「泰國入境規定」、訂全服務航空五天後、訂青旅 3 晚、銀行換匯、休息睡覺到出發日、TDAC 在可以填的時候填、在社區大門出發 → `S.flags.departed == 1`，存檔 meta 有新知識。
  - `test_parcel_pickup`：買防盜腰包，兩天後 `S.items` 還沒有 `belt`，在快遞櫃領取後才有。
  - `test_missed_departure`：一直睡過出發日 → 票作廢（`trans == null`）。
  - `test_money_runs_out_mid_phone`：¥10,000 開局，連續 `buy_item("camera")` 等到錢不夠 → `S.over`、`ending == "money"`，且 `Game.ui_open` 被清空（用 `Game` 的測試替身）。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**，台詞全部寫進 strings.csv。
- [ ] **Step 4：`run-tests`** PASS；開遊戲從標題玩到出發（訂票等先用 `debug` 旗標在 `test_playthrough` 裡做，畫面上的入口在 Task 9 接上），截圖結尾卡。
- [ ] **Step 5：Commit** `feat(godot): 開場劇情與家裡的行動`

---

### Task 8：判定欄（極樂迪斯科式）

**Files:**
- Create: `game/scenes/ui/check_panel.tscn`、`check_panel.gd`、`game/tests/test_check_panel.gd`
- Modify: `opening.json`（朋友吃飯、讀書、沙發衝浪讀檔案、晚飯膽識判定的 `check`）、`strings.csv`（屬性插話草稿）

**Interfaces:**
- Consumes: `StoryRunner.check_started`、`check_resolved`。
- Produces: `CheckPanel`（`extends CanvasLayer`）：從右邊滑入，寬度佔畫面 40%（192 px），0.35 秒 `Tween`（`TRANS_CUBIC`、`EASE_OUT`）；顯示屬性名＋等級、成功率、內心聲音文字、選項；擲骰時數字跳動 0.6 秒後停在結果；結束後滑出並 `Game.release_ui("check")`。

- [ ] **Step 1：寫失敗的測試**：`test_slides_in_and_out`（`show` 後 `position.x` 由 480 變 288；`hide` 後回 480）、`test_esc_ignored_while_rolling`（擲骰動畫中 `cancel` 不關閉、不重擲）、`test_result_matches_runner`（面板顯示的成功或失敗和 `check_resolved.win` 一致）。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**；判定的四個地方接上（朋友吃飯：共情；讀書：學識；讀沙發衝浪檔案：共情；晚飯：膽識，成功信念 +5、失敗信念 −3 **［決定］**）。
- [ ] **Step 4：`run-tests`** PASS；開遊戲觸發晚飯判定，截圖面板滑入的畫面。
- [ ] **Step 5：Commit** `feat(godot): 判定欄`

---

### Task 9：手機（App 框架＋開場用到的 App）

**Files:**
- Create: `game/scenes/ui/phone/phone.tscn`、`phone.gd`、`app_base.gd`、`apps/map.gd`、`apps/web.gd`、`apps/trip.gd`、`apps/hotel.gd`、`apps/cs.gd`、`apps/shop.gd`、`apps/chat.gd`、`apps/immig.gd`、`apps/bank.gd`、`apps/photos.gd`（每個 App 一個 `.gd` ＋ 共用的列表元件 `phone_row.tscn`）、`game/data/asia_map.json`（原型 `MAPV/LAND/CTRY/CITIES` 匯出，`prototypes/liver-red-demo-v3.html:1299-1392`）、`game/tests/test_phone.gd`
- Modify: `home.json`（書桌電腦開大螢幕外框）、`tools/export_opening_data.mjs`（加地圖匯出）

**Interfaces:**
- Consumes: `OpeningActions`（Task 7）、`DataDB`。
- Produces: `Phone`（`extends CanvasLayer`）：`func open(app := "home", arg = null, big_screen := false)`、`func close()`；按 P 開關；開著時場景變暗、主角不能走；電量每次開 App 扣 `battery`（在家有 Wi-Fi，充電中扣 0；用電腦 `big_screen` 不扣）。
- Produces: `AppBase`（`extends Control`）：`func build(arg)`、`signal go(app, arg)`、`signal back()`。
- 各 App 的規則照網頁版：`map`→`dest`（只有曼谷可選，其他顯示簽證說明或「？？？」）；`web`→`research`（文章內容＝知識條目）；`trip`→`trans`＋`date`＋保險；`hotel`→`stay`＋`nights`；`cs`→沙發衝浪（Jay 秒回、其他人照網頁版）；`shop`→網購；`chat`→家族群（視訊、傳照片、不回）；`immig`→TDAC／eSIM／寮國電子簽；`bank`→餘額（換匯在大門的出門辦事）；`photos`→照片牆。

- [ ] **Step 1：寫失敗的測試**：`test_only_one_ui`（日記本開著時 `Phone.open` 回 false）、`test_book_from_trip_app`（模擬點擊列→ `S.trans == "fsc"`、`S.dep == S.day + 5`）、`test_battery_drain_home_vs_pc`、`test_map_only_bangkok_open`。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**，外觀照原型手機的 CSS（`prototypes/liver-red-demo-v3.html:173-261`），縮到 480×270 的比例；App 圖示用生成圖或簡單像素圖。
- [ ] **Step 4：`run-tests`** PASS；開遊戲從書桌電腦訂一次票、按 P 用手機看家族群，截圖。
- [ ] **Step 5：Commit** `feat(godot): 手機與開場用到的 App`

---

### Task 10：格子背包

**Files:**
- Create: `game/scenes/ui/backpack/backpack.tscn`、`backpack.gd`、`item_tile.gd`、`game/core/bag_grid.gd`、`game/tests/test_bag_grid.gd`
- Modify: `home.json`（背包物品打開背包介面）

**Interfaces:**
- Consumes: `Bag`、`DataDB.items[*].size`、`DataDB.c.LAYER_GRID`。
- Produces: `BagGrid`（static）：`fits(S, db, id, layer, x, y, rot) -> bool`、`put(S, id, layer, x, y, rot)`、`remove(S, id)`（回到床上＝`home`）、`auto_place(S, db, id, layers: Array) -> bool`、`sync(S, db)`（`items` 有分層但 `grid` 沒位置的自動擺好）。`S.grid[id] = {"l": layer, "x": int, "y": int, "r": 0|1}`。
- 介面：左邊「床上」放還沒裝的東西，右邊大背包（上中下）、隨身小包、腰包（沒買腰包就上鎖顯示）、褲袋；滑鼠拖曳，拖曳中按 R 旋轉；底部顯示總重、手提重量、重心警告。

- [ ] **Step 1：寫失敗的測試**：`test_fits_bounds`、`test_no_overlap`、`test_waist_locked_without_belt`、`test_invalid_drop_returns`（放到不合法位置後 `S.items` 和 `S.grid` 都不變）、`test_auto_place_default_pack`（`default_pack` 後每件都有 `grid` 位置或回到床上）。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**，照原型的拖曳行為（`prototypes/liver-red-demo-v3.html:1886-1952`）。
- [ ] **Step 4：`run-tests`** PASS；開遊戲把筆電拖進中層、旋轉毛巾，截圖。
- [ ] **Step 5：Commit** `feat(godot): 格子背包`

---

### Task 11：日記本、照片、存檔讀檔、標題畫面

**Files:**
- Create: `game/scenes/ui/journal/journal.tscn`、`journal.gd`、`game/core/journal_entries.gd`、`game/tests/test_journal.gd`、`game/tests/test_save_load.gd`
- Modify: `title.gd`／`title.tscn`（新的旅程、讀取日記、清除存檔、「你記得 N 條旅行知識」）、`opening.json`（在事件發生時加日記條目；窗外夜景、飯桌、房間三個拍照點）

**Interfaces:**
- Produces: `JournalEntries`（static）：`add(J, entry_key: String, args := {})`，條目存在 `S.diary`（`{day, key, args}`）；拍照 `J.take_photo(spot_id)` 存 `S.photos`（`{day, spot, tod}`），耗電 2%。
- Produces: `Journal`（`extends CanvasLayer`）：全螢幕，左頁文字、右頁照片，← → 翻頁，J 或 Esc 闔上；翻頁音效。照片用拍照當下的場景底圖＋打光參數重繪，不存截圖 **［決定］**（存檔小、翻譯不受影響）。

- [ ] **Step 1：寫失敗的測試**：`test_entries_on_events`（決定出國、選旅費、朋友吃飯後各有一條）、`test_diary_save_resume`（睡前存檔 → 改狀態 → 讀檔：時間、地點回到床邊，`ui_open == ""`，meta 知識保留）、`test_clear_all`。
- [ ] **Step 2：`run-tests`** FAIL。
- [ ] **Step 3：實作**。
- [ ] **Step 4：`run-tests`** PASS；開遊戲寫日記、重開讀檔、翻日記本，截圖。
- [ ] **Step 5：Commit** `feat(godot): 日記本、存檔讀檔、標題畫面`

---

### Task 12：時段打光

**Files:**
- Create: `game/scenes/home/lighting.gd`、`game/scenes/home/lighting.gdshader`、`game/tests/test_lighting.gd`
- Modify: `home.tscn`（背景、前景、角色共用同一組光線參數）

**Interfaces:**
- Produces: `Lighting`（static）：`params(h: float) -> Dictionary`（`sky_tint: Color`、`ambient: float`、`lamp: float`、`window_glow: float`），數值移植網頁版 `src/render/lighting.js` 的曲線；shader uniform 同名。室內燈在 18:30–23:30 亮。

- [ ] **Step 1：寫失敗的測試**：`test_night_darker_than_day`（`params(22).ambient < params(12).ambient`）、`test_lamps_on_evening`、`test_continuous`（每 0.25 小時取樣，相鄰差值 < 0.15）。
- [ ] **Step 2–4：實作並跑測試**；開遊戲在白天、黃昏、深夜各截一張。
- [ ] **Step 5：Commit** `feat(godot): 時段打光`

---

### Task 13：美術和字型

**Files:**
- Create: `tools/art/home_prompts/*.txt`（提示詞）、`tools/art/make_home.command`（在 Mac 上跑的生成腳本）、`game/art/home/*.png`、`game/art/chars/*.png`、`game/art/ui/*.png`、`game/fonts/*`、`game/CREDITS.md`（字型授權）
- Modify: `home.tscn`、`player.tscn`、各 UI 場景（換掉色塊）、`docs/art-pipeline.md`（加 Godot 版和 gpt-image-2.5 的流程）

**清單**（全部 480×270 尺度的像素圖；生成後用 `tools/art/pixelate.py`、`key_sprite.py` 處理）：
- 家的長條背景一張（1920×270，白天光線；其他時段靠 Task 12 打光）、樓梯間和社區大門一張。
- 角色：主角（男，剛畢業）站立 1 張、走路 4 張、背背包版本；媽媽、爸爸、鄰居站立 2 張；每人頭像 48×48 一般和一個表情。
- 互動物品：書桌電腦、床、背包、窗、畢業照、獎狀、冰箱便條、書架、電視、快遞櫃。
- UI：對話框外框、手機外框和 App 圖示、日記本內頁、日期卡、判定欄底紋。
- 字型：下載前先跟策劃確認，候選「俐方體 11 號」與「縫合像素字體」（OFL），兩者都試，選清楚的那個；授權寫進 `CREDITS.md`。

- [ ] **Step 1：寫失敗的測試** `test_assets.gd`：`home.json` 和 `speakers.json` 引用的每張圖都存在；所有 `.png` 的匯入設定是 `filter=false`（像素不模糊）。
- [ ] **Step 2：生成和後處理**（在 Mac 上用 Anima；Anima 守不住的再用 gpt-image-2.5）；每批生成後截圖給策劃看，滿意再換進場景。
- [ ] **Step 3：`run-tests`** PASS；開遊戲完整走一遍，截圖。
- [ ] **Step 4：Commit** `feat(godot): 開場美術與字型`

---

### Task 14：音效合成與音樂

**Files:**
- Create: `tools/audio/synth_sfx.py`、`game/audio/sfx/*.wav`、`game/autoload/audio.gd`、`game/tests/test_audio.gd`
- Modify: `project.godot`（autoload `Audio`）、各場景（接上音效）、`game/CREDITS.md`

**Interfaces:**
- Produces: `synth_sfx.py`：`python synth_sfx.py --out game/audio/sfx` 產生 `blip_low.wav`、`blip_mid.wav`、`blip_high.wav`、`step_1..4.wav`、`door_open.wav`、`door_close.wav`、`select.wav`、`confirm.wav`、`cancel.wav`、`dice.wav`、`check_win.wav`、`check_lose.wav`、`page_flip.wav`、`phone_tap.wav`、`shutter.wav`、`stamp.wav`、`zipper.wav`、`day_card.wav`，44.1 kHz 16-bit mono，固定亂數種子（重跑結果相同）。
- Produces: `Audio`：`play_sfx(name: String)`、`blip(voice: String)`（音高 ±5% 隨機）、`play_music(name: String, fade := 1.0)`、`stop_music(fade := 1.0)`；音量分 `Music`、`SFX` 兩條 bus。
- 音樂：在 OpenGameArt 找 CC0 曲子 2–3 首（家裡白天、家裡晚上、出發）。**每首下載前先列出檔名、網址、大小請策劃確認**；授權和作者寫進 `CREDITS.md`。音樂沒到位前，`play_music` 找不到檔案就安靜略過。

- [ ] **Step 1：寫失敗的測試**：`test_all_sfx_exist`（清單上的每個檔案都在、長度 0.02–2 秒）、`test_missing_music_is_silent`（`play_music("nope")` 不報錯）。
- [ ] **Step 2–3：實作 `synth_sfx.py`、跑一次產生檔案、實作 `audio.gd`、接到各場景**。
- [ ] **Step 4：`run-tests`** PASS；開遊戲聽一遍，把音效清單和試聽方式回報給策劃。
- [ ] **Step 5：找音樂**：列出候選曲給策劃確認 → 下載 → 接上 → Commit `feat(godot): 音效與音樂`

---

### Task 15：一起開發的設定與最終驗收

**Files:**
- Modify: `game/README.md`（補完：改台詞、跑測試、用 GitHub Desktop 同步、兩人改到同一個檔案時怎麼辦、怎麼請 Claude Code 幫忙）、`game/CLAUDE.md`（定稿）、根目錄 `README.md`、`docs/roadmap.md`
- Create: `.github/workflows/ci.yml` 加一個 `godot` job（用官方 4.7.2 Linux 執行檔跑 `run-tests`）

- [ ] **Step 1：完整試玩**：Claude 從標題開始玩到出發，三條路線各一次（全服務航空、廉航＋網購、睡過頭錯過出發），加一次錢花光的結局；每條路線截 4 張圖。
- [ ] **Step 2：`run-tests` 和 `npm test` 都 PASS。**
- [ ] **Step 3：把截圖和試玩紀錄交給策劃**，請策劃自己玩一次。
- [ ] **Step 4：GitHub**：問策劃要不要現在建私人倉庫並推上去；同意才做，並照 README 的步驟陪策劃邀請朋友。
- [ ] **Step 5：Commit** `docs(godot): 新手說明與 CI`
