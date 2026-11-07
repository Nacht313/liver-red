# 劇情怎麼寫（Godot 版，給策劃）

劇情放在 `game/data/story/opening.json`，文字放在 `game/i18n/strings.csv`。**JSON 裡只寫文字代號，不寫中文**；中文寫在 CSV，之後翻譯成別的語言只要在 CSV 多開一欄。

改完跑 `bash game/tests/run.sh`：代號沒翻譯、跳到不存在的節點，都會被抓出來。

## 一個節點

```json
"dinner": {
  "on_enter": [ { "flag": "ate_dinner" } ],
  "lines": [
    { "who": "mom", "text": "story.dinner.mom_1" },
    { "who": "me",  "text": "story.dinner.me_1", "when": { "no_flag": "told_parents" } }
  ],
  "choices": [
    { "text": "story.dinner.c_10k", "sub": "story.dinner.c_10k_sub",
      "effects": [ { "do": "start_funds", "n": 10000 } ], "goto": "night0" },
    { "text": "story.dinner.c_1m", "req": { "flag": "second_run" }, "req_text": "story.dinner.c_1m_why" }
  ],
  "goto": "下一個節點（沒有選項時）"
}
```

- `lines`：一句一句說。`who` 是說話的人（`me` 是主角自言自語、`mom`、`dad`…）。`when` 不成立的句子會跳過。
- `choices`：說完之後的選項。`sub` 是右邊的小字說明。`req` 不成立時選項變灰，顯示 `req_text`。
- 選項可以帶判定：`"check": { "attr": "empathy", "bonus": 0, "text": "check.friend.prompt", "win": "成功節點", "lose": "失敗節點" }`。
- 整個節點也可以是判定：在節點上寫 `"check": {...}`，說完台詞就跳出判定欄。
- 屬性代號：`knowledge` 學識、`nerve` 膽識、`craft` 手藝、`empathy` 共情、`charm` 魅力。

## CSV 裡的句子

```
keys,zh_TW
story.dinner.mom_1,「簽證要的錢，我們出。」
ui.bank.got,你換到了 {amount} 泰銖。
```

- 有數字或名字的地方用 `{名稱}`，不要把句子拆成好幾段拼起來（別的語言語序不同）。
- 內建可以直接用的：`{date}` 日期、`{date_short}`、`{clock}` 時間、`{total_kg}` 背包總重、`{cabin_kg}` 手提重量、`{cash_thb}`、`{thb}`。
- 女性主角的版本：同一個代號加 `@f`（例如 `story.dinner.me_1@f`）。這一版只寫男性。
- 句子裡有逗號要用雙引號包起來（試算表軟體會自動處理）。

## 條件

| 寫法 | 意思 |
|---|---|
| `{ "know": "k_lcc" }` `{ "no_know": "k_lcc" }` | 知道／不知道某條旅行知識 |
| `{ "flag": "x" }` `{ "no_flag": "x" }` | 旗標 |
| `{ "has": "belt" }` | 身上帶著某個物品 |
| `{ "hour": { "gte": 17 } }` `{ "day": { "gte": 4 } }` | 時間 |
| `{ "faith": { "lt": 30 } }` | 數值：energy food faith battery hyg family card cny thb eng |
| `{ "attr": "nerve", "gte": 3 }` | 屬性 |
| `{ "is": { "trans": "land" } }` | 狀態欄位等於某個值（`null` 代表還沒有） |
| `{ "v": "cabin_kg", "gt": 7 }` | 計算值：cabin_kg total_kg cash_thb money |
| `{ "all": [...] }` `{ "any": [...] }` `{ "not": {...} }`，直接寫陣列等於 all | 組合 |

## 效果

| 寫法 | 意思 |
|---|---|
| `{ "add": { "faith": 10, "energy": -4 } }` | 數值增減（會被上限鎖限制） |
| `{ "attr": "empathy", "add": 1 }` | 屬性 |
| `{ "pay": 120 }` `{ "pay_thb": 299 }` | 付錢 |
| `{ "know": "k_lcc" }` | 學到旅行知識（跨輪保留） |
| `{ "flag": "x" }` `{ "flag": "x", "set": 0 }` | 設定／清除旗標 |
| `{ "set": { "cs": "jay" } }` | 設定狀態欄位（只限訂票訂房這類欄位） |
| `{ "time": 0.5, "tiring": 2 }` `{ "until": 22.5 }` `{ "sleep": "home" }` | 花時間、等到幾點、睡覺 |
| `{ "diary": "home.place.bedroom" }` | 寫日記存檔 |
| `{ "fam_msg": ["family.0.from", "family.0.text"] }` | 家族群新訊息 |
| `{ "toast": "toast.xxx" }` | 跳提示 |
| `{ "open": "phone", "arg": "trip" }` | 打開介面：phone、backpack、journal、outing |
| `{ "end": "money" }` | 結局 |
| `{ "do": "名稱", ... }` | 比較複雜的規則（程式在 `game/core/opening_actions.gd`） |
