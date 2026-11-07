## 旅程狀態（一局遊戲的所有資料）。照網頁版 src/game/journey/journey.js 的 freshState()。
## 只有資料，沒有規則；規則在 Journey。存檔就是 to_dict() 的 JSON。
class_name JourneyState
extends RefCounted

var day := 0
var h := 22.0
var place_key := "home.place.bedroom"
var zone := "home"
var loc := "home"
var card := 0.0
var cny := 500.0
var thb := 0.0
var usd := 0.0
var start := 0.0
var tier := 0
var energy := 70.0
var food := 70.0
var faith := 55.0
var battery := 80.0
var hyg := 85.0
var family := 10.0
var locks: Array = []
var attr: Dictionary = {}
var eng := 2.0
## 物品 id → 位置：分層 id、"home"（不帶）、"worn"（穿在身上）、"lost"（丟了）
var items: Dictionary = {}
## 格子背包的擺放：物品 id → {l, x, y, r}
var grid: Dictionary = {}
var orders: Array = []
var know: Array = []
var researched: Array = []
var r_today := 0
var dest: Variant = null
var trans: Variant = null
var dep: Variant = null
var dep_mul := 1.0
var extra_bag := false
var stay: Variant = null
var cs: Variant = null
var cs_tried: Dictionary = {}
var refs := 0
var tdac := false
var tdac_addr: Variant = null
var ins := false
var esim := false
var laos_visa: Variant = null
var msgs: Array = []
var diary: Array = []
var photos: Array = []
var thoughts: Array = []
var flags: Dictionary = {}
var over := false
var ending: Variant = null
## 主角性別（"m"／"f"）。這一版只有男性；台詞代號可以有 @f 後綴的女性版本。
var gender := "m"
var resume := "home"

const FIELDS := ["day", "h", "place_key", "zone", "loc", "card", "cny", "thb", "usd", "start", "tier", "energy", "food", "faith",
	"battery", "hyg", "family", "locks", "attr", "eng", "items", "grid", "orders", "know", "researched", "r_today", "dest", "trans",
	"dep", "dep_mul", "extra_bag", "stay", "cs", "cs_tried", "refs", "tdac", "tdac_addr", "ins", "esim", "laos_visa", "msgs",
	"diary", "photos", "thoughts", "flags", "over", "ending", "gender", "resume"]


static func fresh(db: DataDB, meta_know: Array) -> JourneyState:
	var S := JourneyState.new()
	for id in db.items:
		var it: Dictionary = db.items[id]
		if it.get("own", 0):
			if it.get("must", 0):
				S.items[id] = "day" if id == "passport" else "pocket"
			else:
				S.items[id] = "home"
	for a in db.c["ATTRS"]:
		S.attr[a] = 1
	S.know = meta_know.duplicate()
	S.thoughts = [{"n": "thought.cage.name", "eff": "thought.cage.eff", "need": 3, "got": 0}]
	return S


func to_dict() -> Dictionary:
	var d := {}
	for f in FIELDS:
		var v: Variant = get(f)
		d[f] = v.duplicate(true) if v is Array or v is Dictionary else v
	return d


static func from_dict(d: Dictionary) -> JourneyState:
	var S := JourneyState.new()
	for f in FIELDS:
		if d.has(f):
			var v: Variant = d[f]
			S.set(f, v.duplicate(true) if v is Array or v is Dictionary else v)
	# JSON 讀回來的整數會變成小數：把計數類欄位轉回整數
	S.day = int(S.day)
	S.r_today = int(S.r_today)
	S.refs = int(S.refs)
	S.tier = int(S.tier)
	return S
