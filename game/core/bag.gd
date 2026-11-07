## 背包：每件物品放在哪一層、重量、手提行李重量、重心。照網頁版 src/game/journey/bag.js。
## 格子擺放在 BagGrid（Task 10）；這裡只管「在哪一層」和重量。
class_name Bag
extends RefCounted

const BIG := ["top", "mid", "bot"]


static func carried(S: JourneyState, id: String) -> bool:
	var l: Variant = S.items.get(id)
	return l != null and l != "home" and l != "lost"


static func layer_sum(S: JourneyState, db: DataDB, layer: String) -> Dictionary:
	var kg := 0.0
	var L := 0.0
	for id in S.items:
		if S.items[id] == layer:
			kg += float(db.items[id]["kg"])
			L += float(db.items[id]["L"])
	return {"kg": kg, "L": L}


static func big_used(S: JourneyState, db: DataDB) -> bool:
	for l in BIG:
		if layer_sum(S, db, l).L > 0:
			return true
	return false


static func _bags_kg(S: JourneyState, db: DataDB) -> float:
	var k := 0.0
	if big_used(S, db):
		k += float(db.c["PACK_KG"])
	if layer_sum(S, db, "day").L > 0:
		k += float(db.c["DAY_KG"])
	return k


## 身上全部的重量（含背包本身）
static func total_kg(S: JourneyState, db: DataDB) -> float:
	var k := 0.0
	for id in S.items:
		if carried(S, id):
			k += float(db.items[id]["kg"])
	return k + _bags_kg(S, db)


## 手提行李：不含褲袋、腰包和穿在身上的東西
static func cabin_kg(S: JourneyState, db: DataDB) -> float:
	var k := 0.0
	for id in S.items:
		var l: Dictionary = db.layers.get(S.items[id], {})
		if not l.is_empty() and not l.get("body", 0):
			k += float(db.items[id]["kg"])
	return k + _bags_kg(S, db)


## 1 公斤以上的東西放在上層或下層，重心不穩
static func bad_center(S: JourneyState, db: DataDB) -> bool:
	for id in S.items:
		if (S.items[id] == "top" or S.items[id] == "bot") and float(db.items[id]["kg"]) >= 1:
			return true
	return false


static func weight_factor(S: JourneyState, db: DataDB) -> float:
	var k := total_kg(S, db)
	var f := 1.0 if k <= 8 else (1.25 if k <= 11 else (1.55 if k <= 14 else 2.0))
	return f * (1.12 if bad_center(S, db) else 1.0)


## 分層能不能用：腰包要先買到（在家裡也算）
static func layer_open(S: JourneyState, db: DataDB, layer: String) -> bool:
	var need: Variant = db.layers.get(layer, {}).get("need")
	if need == null:
		return true
	var at: Variant = S.items.get(need)
	return at != null and at != "lost"


## 塞不下的分層 id；都塞得下回傳 ""
static func overfull(S: JourneyState, db: DataDB) -> String:
	for k in db.layers:
		if layer_sum(S, db, k).L > float(db.layers[k]["L"]) + 1e-9:
			return k
	return ""


## 腰包沒帶時，放腰包的東西退回褲袋
static func fix_waist(S: JourneyState) -> void:
	if carried(S, "belt"):
		return
	for id in S.items:
		if S.items[id] == "waist":
			S.items[id] = "pocket"


## 依序找第一個塞得下的分層放進去，回傳分層 id；都不行回傳 ""
static func try_put(S: JourneyState, db: DataDB, id: String, layers: Array) -> String:
	for l in layers:
		if not layer_open(S, db, l):
			continue
		if layer_sum(S, db, l).L + float(db.items[id]["L"]) <= float(db.layers[l]["L"]):
			S.items[id] = l
			return l
	return ""
