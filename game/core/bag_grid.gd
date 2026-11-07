## 格子背包（Keep Driving 式）：每件物品照尺寸佔格子，可以旋轉，不能重疊。
## 照原型 prototypes/liver-red-demo-v3.html 的 dims／occ／fits／putAt／tryAuto／syncPos。
## S.grid[id] = {l: 分層, x, y, r: 0 或 1（旋轉）}；S.items[id] 跟著改成分層 id。
class_name BagGrid
extends RefCounted


static func grid_size(db: DataDB, layer: String) -> Vector2i:
	var g: Array = db.c.LAYER_GRID.get(layer, [0, 0])
	return Vector2i(int(g[0]), int(g[1]))


static func dims(db: DataDB, id: String, r: int) -> Vector2i:
	var s: Array = db.items[id].get("size", [1, 1])
	return Vector2i(int(s[1]), int(s[0])) if r else Vector2i(int(s[0]), int(s[1]))


## 腰包層：要先穿上防盜腰包
static func layer_open(S: JourneyState, layer: String) -> bool:
	return layer != "waist" or S.items.get("belt") == "worn"


## 某一層每一格被誰佔了（id 或空字串）
static func occupancy(S: JourneyState, db: DataDB, layer: String) -> Array:
	var gs := grid_size(db, layer)
	var g := []
	for y in gs.y:
		var row := []
		row.resize(gs.x)
		row.fill("")
		g.append(row)
	for id in S.grid:
		var p: Dictionary = S.grid[id]
		if p.l != layer:
			continue
		var d := dims(db, id, int(p.r))
		for y in d.y:
			for x in d.x:
				var yy := int(p.y) + y
				var xx := int(p.x) + x
				if yy < gs.y and xx < gs.x:
					g[yy][xx] = id
	return g


static func fits(S: JourneyState, db: DataDB, id: String, layer: String, x: int, y: int, r: int) -> bool:
	if not db.c.LAYER_GRID.has(layer) or not layer_open(S, layer) or db.items[id].get("worn", 0):
		return false
	var gs := grid_size(db, layer)
	var d := dims(db, id, r)
	if x < 0 or y < 0 or x + d.x > gs.x or y + d.y > gs.y:
		return false
	var g := occupancy(S, db, layer)
	for j in d.y:
		for i in d.x:
			var o: String = g[y + j][x + i]
			if o != "" and o != id:
				return false
	return true


static func put(S: JourneyState, id: String, layer: String, x: int, y: int, r: int) -> void:
	S.grid[id] = {"l": layer, "x": x, "y": y, "r": r}
	S.items[id] = layer


## 拖曳放下：放得下就放，放不下回傳 false，狀態不變
static func drop(S: JourneyState, db: DataDB, id: String, layer: String, x: int, y: int, r: int) -> bool:
	if not fits(S, db, id, layer, x, y, r):
		return false
	put(S, id, layer, x, y, r)
	return true


## 拿出來放回床上（一定要帶的東西拿不出來）
static func remove(S: JourneyState, id: String, db: DataDB = null) -> void:
	var must := false
	if db:
		must = db.items[id].get("must", 0) == 1
	elif id in ["passport", "phone", "wallet"]:
		must = true
	if must:
		return
	S.grid.erase(id)
	if S.items.get(id) != "lost":
		S.items[id] = "home"


static func auto_place(S: JourneyState, db: DataDB, id: String, layers: Array) -> bool:
	for l in layers:
		for r in [0, 1]:
			var gs := grid_size(db, l)
			for y in gs.y:
				for x in gs.x:
					if fits(S, db, id, l, x, y, r):
						put(S, id, l, x, y, r)
						return true
	return false


## 分層有了但格子還沒有位置的，自動擺好；擺不下的回到床上
static func sync(S: JourneyState, db: DataDB) -> void:
	for id in S.items.keys():
		var l: String = S.items[id]
		if db.items[id].get("worn", 0):
			S.grid.erase(id)
			continue
		if db.c.LAYER_GRID.has(l):
			if not S.grid.has(id) or S.grid[id].l != l:
				S.grid.erase(id)
				if not auto_place(S, db, id, [l, "day", "top", "mid", "bot", "pocket"]):
					S.items[id] = "home"
		else:
			S.grid.erase(id)
