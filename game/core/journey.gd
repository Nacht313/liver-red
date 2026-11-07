## 旅程的規則：時間流逝、數值、上限鎖、錢、旅行知識、睡覺、存檔、結局。
## 照網頁版 src/game/journey/journey.js 一比一移植。不碰節點，無視窗也能測。
class_name Journey
extends RefCounted

signal changed
## 跳提示：key 是翻譯代號，args 是佔位符
signal toast(key: String, args: Dictionary)
signal ended(kind: String)

const STATS := ["energy", "food", "faith"]
const LOCK_FLOOR := 50.0  # 鎖住的上限最低 50（設計摘要）
const STOCK_LOCK_FLOOR := 1.0  # 例外：股票虧損的鎖最低到 1（2026-11-07 定案）

var S: JourneyState
var db: DataDB
var store: SaveStore
var rand: Callable
var meta: Dictionary


func _init(p_db: DataDB, p_store: SaveStore = null, p_rand: Callable = Callable()) -> void:
	db = p_db
	store = p_store if p_store else SaveStore.new()
	rand = p_rand if p_rand.is_valid() else randf
	var m: Variant = store.get_slot("meta")
	meta = m if m is Dictionary else {"know": []}


func new_game() -> JourneyState:
	S = JourneyState.fresh(db, meta.know)
	return S


func has(id: String) -> bool:
	return Bag.carried(S, id)


# ---------- 存檔 ----------
func save(slot: String, where_key: String) -> void:
	store.set_slot(slot, {"label": {"day": S.day, "where": where_key}, "s": S.to_dict()})


func slot(name: String) -> Variant:
	return store.get_slot(name)


## 讀檔：回到存檔當時的狀態，旅行知識用目前記得的（知識跨輪保留）
func load(name: String) -> bool:
	var sv: Variant = store.get_slot(name)
	if not (sv is Dictionary):
		return false
	S = JourneyState.from_dict(sv.s)
	S.over = false
	S.ending = null
	for k in meta.know:
		if not S.know.has(k):
			S.know.append(k)
	changed.emit()
	return true


func clear_all() -> void:
	meta = {"know": []}
	for s in ["meta", "diary"]:
		store.set_slot(s, null)


# ---------- 數值與上限鎖 ----------
func cap(stat: String) -> float:
	var c := 100.0
	for l in S.locks:
		if l.stat == stat or l.stat == "all":
			c = minf(c, float(l.cap))
	return c


func add(stat: String, n: float) -> void:
	var top := cap(stat) if stat in STATS else 100.0
	S.set(stat, clampf(float(S.get(stat)) + n, 0.0, top))


func lock(src: String, stat: String, cap_value: float, how_key: String) -> void:
	for l in S.locks:
		if l.src == src:
			return
	var floor_v := STOCK_LOCK_FLOOR if src.begins_with("stock") else LOCK_FLOOR
	S.locks.append({"src": src, "stat": stat, "cap": maxf(floor_v, cap_value), "how": how_key, "fresh": 1})
	for k in STATS:
		S.set(k, minf(float(S.get(k)), cap(k)))
	toast.emit("toast.locked", {"how": how_key})


func unlock(src: String) -> void:
	S.locks = S.locks.filter(func(l): return l.src != src)


func check_locks() -> void:
	if S.family >= 100:
		lock("family", "faith", 75, "lock.family.how")
	if S.energy <= 0:
		end("tired")
	elif S.faith <= 0:
		end("faith")


# ---------- 錢 ----------
func money() -> float:
	var fx: Dictionary = db.c["FX"]
	return S.card + S.cny + S.thb / float(fx.THB) + S.usd * float(fx.USD)


func cash_thb() -> float:
	var fx: Dictionary = db.c["FX"]
	return S.thb + S.cny * float(fx.THB) + S.usd * float(fx.USD) * float(fx.THB)


## 付人民幣：先刷卡，不夠再用現金。錢歸零就結束
func pay_cny(n: float) -> void:
	if S.card >= n:
		S.card -= n
	else:
		S.cny -= n - S.card
		S.card = 0
	if money() <= 0.5:
		end("money")
	changed.emit()


## 付泰銖：先用泰銖現金，不夠的部分刷卡
func pay_thb(n: float) -> void:
	if S.thb >= n:
		S.thb -= n
		changed.emit()
	else:
		var rest := n - S.thb
		S.thb = 0
		pay_cny(ceilf(rest / float(db.c["FX"]["THB"])))


# ---------- 旅行知識 ----------
func learn(k: String) -> bool:
	if not db.know.has(k):
		push_error("Journey: unknown knowledge " + k)
		return false
	if S.know.has(k):
		return false
	S.know.append(k)
	if not meta.know.has(k):
		meta.know.append(k)
		store.set_slot("meta", meta)
	toast.emit("toast.learned", {})
	return true


func knows(k: String) -> bool:
	return S.know.has(k)


# ---------- 時間 ----------
func _hot() -> bool:
	return S.loc != "home" and S.loc != "plane"


## 時間往前走。opts：sleep、charging、tiring（每小時精力消耗，預設 1.6）、weight（負重影響）、phone（每小時耗電）
func advance(hours: float, opts := {}) -> void:
	var left := hours
	while left > 1e-9 and not S.over:
		var st := minf(1.0, left)
		left -= st
		if S.loc == "home":
			S.food = maxf(S.food, minf(cap("food"), 80))
		else:
			add("food", -(1.0 if opts.get("sleep") else 2.2) * st)
		if not opts.get("sleep"):
			var mul := (Bag.weight_factor(S, db) if opts.get("weight") else 1.0) * (1.2 if S.hyg < 45 else 1.0) * (1.2 if S.food < 30 else 1.0)
			add("energy", -float(opts.get("tiring", 1.6)) * st * mul)
			S.hyg = clampf(S.hyg - (2.2 if _hot() else 1.2) * st * (1.3 if opts.has("tiring") else 1.0), 0, 100)
		S.battery = clampf(S.battery + (25.0 if opts.get("charging") else -float(opts.get("phone", 0.8))) * st, 0, 100)
		var unread := S.msgs.filter(func(m): return not m.done).size()
		S.family = clampf(S.family + 0.12 * st + unread * 0.08 * st, 0, 100)
		S.h += st
		if S.h >= 24:
			S.h -= 24
			S.day += 1
			on_new_day()
	if not S.over:
		check_locks()
	changed.emit()


func until(h: float) -> void:
	if S.h < h:
		advance(h - S.h)


## 休息、讀書、辦事：時間走到下一個分段（在家會順便充電）
func next_seg() -> bool:
	var h := TimeUtil.hours_to_next_seg(S.h)
	if h > 0:
		advance(h, {"charging": S.loc == "home"})
	return h > 0


func on_new_day() -> void:
	S.r_today = 0
	if S.loc == "home":
		S.hyg = 95
	for t in S.thoughts:
		if t.got < t.need:
			t.got += 1
			if t.got >= t.need:
				S.attr["nerve"] += 1
				S.flags["thought_done"] = 1
	for o in S.orders:
		if not o.get("arrived", false) and S.day >= o.arrive:
			o["arrived"] = true  # 到樓下的快遞櫃，要自己去拿
	if S.loc == "home" and S.day >= 4 and not S.flags.has("nag%d" % S.day):
		S.flags["nag%d" % S.day] = 1
		S.family = clampf(S.family + 4, 0, 100)
	if S.day % 2 == 0:
		push_msg()


func push_msg(from_key := "", text_key := "") -> void:
	if from_key == "":
		var m: Dictionary = db.family[S.msgs.size() % db.family.size()]
		from_key = m.from
		text_key = m.text
	S.msgs.push_front({"from": from_key, "text": text_key, "day": S.day, "done": false})


## 睡到隔天 07:30。kind 決定睡眠品質：[精力至少恢復到, 信念變化]
func sleep(kind: String) -> void:
	var wake := 7.5
	var hrs := wake - S.h if S.h < wake else 24 - S.h + wake
	advance(hrs, {"sleep": true, "charging": kind != "rough" and kind != "bench"})
	if S.over:
		return
	var q: Array = {"home": [95, 4], "hostel": [90 if has("plugs") else 75, 3], "guest": [95, 5], "hotel": [100, 8], "cs": [92, 6],
		"train": [60, 0], "rough": [35, -10], "bench": [45, -6]}.get(kind, [70, 0])
	S.energy = minf(cap("energy"), maxf(S.energy, q[0]))
	add("faith", q[1])
	if kind in ["rough", "bench", "train"]:
		S.hyg = clampf(S.hyg - 10, 0, 100)
	changed.emit()


func write_diary(where_key: String) -> void:
	S.diary.append({"day": S.day, "key": "diary.wrote", "args": {"where": where_key}})
	save("diary", where_key)


# ---------- 結局 ----------
func end(kind: String) -> void:
	if S.over:
		return
	if not db.endings.has(kind):
		push_error("Journey: unknown ending " + kind)
		return
	S.over = true
	S.ending = kind
	ended.emit(kind)
