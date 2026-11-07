## 格子背包介面（全螢幕）：左邊是床，右邊是大背包上中下三層、隨身小包、腰包、褲袋。
## 用滑鼠把東西拖進格子；拖的時候按 R 旋轉；放不下會彈回原處；拖回床上就是不帶。Esc 關閉。
class_name Backpack
extends CanvasLayer

signal closed
signal sfx(name: String)

const CELL := 14
const BED := Rect2(8, 26, 150, 214)
## 各層在畫面上的左上角
const LAYOUT := {"top": Vector2(196, 44), "mid": Vector2(196, 88), "bot": Vector2(196, 154),
	"day": Vector2(300, 44), "waist": Vector2(300, 112), "pocket": Vector2(300, 162)}
const COLORS := {"passport": "c86a6a", "phone": "8db4ea", "wallet": "d8b46a", "laptop": "9fb0c8", "camera": "9fb0c8", "gopro": "9fb0c8",
	"pbank": "9fb0c8", "charger": "9fb0c8", "adapter": "9fb0c8", "uke": "d89a5a", "novel": "a8c27a", "notebook": "a8c27a",
	"snacks": "e8a05a", "meds": "e07a8a", "tent": "7aa88a", "sleepbag": "7aa88a"}

var J: Journey
var ui: UiLock
var _root: Control
var _info: Label
var _drag := ""
var _drag_r := 0
var _ghost: ColorRect


func _init() -> void:
	layer = 18
	visible = false
	_root = Control.new()
	_root.size = Vector2(480, 270)
	add_child(_root)


func setup(p_journey: Journey, p_ui: UiLock) -> void:
	J = p_journey
	ui = p_ui


func open() -> bool:
	if not ui.request("backpack"):
		return false
	BagGrid.sync(J.S, J.db)
	visible = true
	sfx.emit("zipper")
	_render()
	return true


func close() -> void:
	_drag = ""
	Bag.fix_waist(J.S)
	BagGrid.sync(J.S, J.db)
	visible = false
	ui.release("backpack")
	J.changed.emit()
	closed.emit()


func _label(text: String, pos: Vector2, size: int, color := Color.WHITE) -> Label:
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.text = text
	l.position = pos
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	_root.add_child(l)
	return l


func _rect(r: Rect2, color: Color) -> ColorRect:
	var c := ColorRect.new()
	c.position = r.position
	c.size = r.size
	c.color = color
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(c)
	return c


func _render() -> void:
	for c in _root.get_children():
		c.queue_free()
	_rect(Rect2(0, 0, 480, 270), Color("2a2230"))
	_label(tr("ui.bag.title"), Vector2(10, 6), 12, Color("d8b46a"))
	# 床
	_rect(BED, Color("e4dccc"))
	_label(tr("ui.bag.bed"), BED.position + Vector2(4, 2), 9, Color("7a6e5e"))
	var bx := BED.position.x + 4
	var by := BED.position.y + 16
	var row_h := 0
	for id in J.S.items:
		if J.S.items[id] != "home" or id == _drag:
			continue
		var d := BagGrid.dims(J.db, id, 0)
		if bx + d.x * CELL > BED.end.x - 4:
			bx = BED.position.x + 4
			by += row_h * CELL + 3
			row_h = 0
		_item(id, Vector2(bx, by), 0)
		bx += d.x * CELL + 3
		row_h = maxi(row_h, d.y)
	# 背包各層
	for l in LAYOUT:
		var gs := BagGrid.grid_size(J.db, l)
		var p: Vector2 = LAYOUT[l]
		var open := BagGrid.layer_open(J.S, l)
		_label(tr(J.db.layers[l].name), p + Vector2(0, -11), 8, Color("f3e3c8"))
		_rect(Rect2(p, Vector2(gs.x * CELL, gs.y * CELL)), Color("3c2414") if open else Color("2a2026"))
		for y in gs.y:
			for x in gs.x:
				_rect(Rect2(p + Vector2(x * CELL, y * CELL), Vector2(1, CELL)), Color(1, 1, 1, 0.08))
		if not open:
			_label(tr("ui.bag.need_belt"), p + Vector2(2, 2), 8, Color(0.7, 0.6, 0.5))
	for id in J.S.grid:
		if id == _drag:
			continue
		var g: Dictionary = J.S.grid[id]
		_item(id, LAYOUT[g.l] + Vector2(int(g.x) * CELL, int(g.y) * CELL), int(g.r))
	# 底部：重量
	var k := Bag.total_kg(J.S, J.db)
	var word := tr("ui.bag.light") if k <= 8 else (tr("ui.bag.heavy") if k <= 11 else tr("ui.bag.very_heavy"))
	var foot := tr("ui.bag.weight").format({"kg": "%.1f" % k, "word": word, "cabin": "%.1f" % Bag.cabin_kg(J.S, J.db)})
	if Bag.bad_center(J.S, J.db):
		foot += "  " + tr("ui.bag.bad_center")
	_label(foot, Vector2(170, 236), 9, Color("f3e3c8") if not Bag.bad_center(J.S, J.db) else Color("e0954a"))
	_label(tr("ui.bag.hint"), Vector2(170, 250), 8, Color(0.6, 0.6, 0.65))
	_info = _label("", Vector2(380, 44), 8, Color(0.85, 0.85, 0.9))
	_info.size = Vector2(94, 180)
	_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART


func _item(id: String, pos: Vector2, r: int) -> void:
	var d := BagGrid.dims(J.db, id, r)
	var c := _rect(Rect2(pos + Vector2(1, 1), Vector2(d.x * CELL - 2, d.y * CELL - 2)), Color(COLORS.get(id, "c8b8a0")))
	c.set_meta("item", id)
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.text = tr(J.db.items[id].name)
	l.add_theme_font_size_override("font_size", 6)
	l.add_theme_color_override("font_color", Color("1b1820"))
	l.size = c.size
	l.clip_text = true
	l.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	c.add_child(l)


## 滑鼠位置對到哪一層的哪一格；不在任何格子上回傳 {}
func _cell_at(p: Vector2) -> Dictionary:
	for l in LAYOUT:
		var gs := BagGrid.grid_size(J.db, l)
		var r := Rect2(LAYOUT[l], Vector2(gs.x * CELL, gs.y * CELL))
		if r.has_point(p):
			var c: Vector2 = (p - LAYOUT[l]) / CELL
			return {"l": l, "x": int(c.x), "y": int(c.y)}
	return {}


func _item_at(p: Vector2) -> String:
	for c in _root.get_children():
		if c is ColorRect and c.has_meta("item") and Rect2(c.position, c.size).has_point(p):
			return c.get_meta("item")
	return ""


func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var p: Vector2 = _root.get_local_mouse_position()
		if event.pressed and _drag == "":
			var id := _item_at(p)
			if id != "":
				begin_drag(id)
				_update_ghost(p)
		elif not event.pressed and _drag != "":
			drop_at(p)
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and _drag != "":
		_update_ghost(_root.get_local_mouse_position())
	elif event is InputEventMouseMotion:
		var id := _item_at(_root.get_local_mouse_position())
		if _info and id != "":
			var it: Dictionary = J.db.items[id]
			_info.text = "%s\n%s kg・%s L\n%s" % [tr(it.name), str(it.kg), str(it.L), tr(it.desc) if it.has("desc") else ""]
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R and _drag != "":
			rotate_drag()
			_update_ghost(_root.get_local_mouse_position())
			get_viewport().set_input_as_handled()
		elif event.is_action_pressed("cancel"):
			close()
			get_viewport().set_input_as_handled()


func _update_ghost(p: Vector2) -> void:
	if _ghost == null:
		return
	var d := BagGrid.dims(J.db, _drag, _drag_r)
	_ghost.size = Vector2(d.x * CELL, d.y * CELL)
	_ghost.position = p - Vector2(CELL / 2.0, CELL / 2.0)
	var c := _cell_at(p)
	var good := not c.is_empty() and BagGrid.fits(J.S, J.db, _drag, c.l, c.x, c.y, _drag_r)
	_ghost.color = Color(0.42, 0.76, 0.48, 0.6) if good else (Color(0.88, 0.35, 0.35, 0.6) if not c.is_empty() else Color(1, 1, 1, 0.4))


## 開始拖一件物品（滑鼠按下）
func begin_drag(id: String) -> void:
	_drag = id
	_drag_r = int(J.S.grid.get(id, {}).get("r", 0))
	_render()
	_ghost = _rect(Rect2(Vector2.ZERO, Vector2(CELL, CELL)), Color(1, 1, 1, 0.5))


func rotate_drag() -> void:
	_drag_r = 1 - _drag_r


## 放下（滑鼠放開）：格子上放得下就放；床上就是不帶；其他地方彈回原處
func drop_at(p: Vector2) -> void:
	var id := _drag
	_drag = ""
	var c := _cell_at(p)
	if not c.is_empty():
		BagGrid.drop(J.S, J.db, id, c.l, c.x, c.y, _drag_r)  # 放不下就什麼都不改，畫面重畫時彈回原處
	elif BED.has_point(p):
		BagGrid.remove(J.S, id, J.db)
	_ghost = null
	_render()
	J.changed.emit()
