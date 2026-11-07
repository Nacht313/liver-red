## 日記本（按 J 掏出來，全螢幕）：左頁是那天寫下的事，右頁是那天拍的照片。← → 翻頁，J 或 Esc 闔上。
## 照片不存截圖：照記下的地點和時段重新畫（存檔小，換語言也不受影響）。
class_name Journal
extends CanvasLayer

signal closed
signal sfx(name: String)

const PHOTO_COLORS := {"window": ["1a1e3a", "ffd98a"], "table": ["4a3428", "c86a3a"]}
const TOD_TINT := {"night": Color(0.55, 0.6, 0.9), "dawn": Color(1.0, 0.85, 0.85), "day": Color(1, 1, 1), "dusk": Color(1.0, 0.8, 0.65)}

var J: Journey
var ui: UiLock
var _root: Control
var _pages: Array = []
var _i := 0


func _init() -> void:
	layer = 19
	visible = false
	_root = Control.new()
	_root.size = Vector2(480, 270)
	add_child(_root)


func setup(p_journey: Journey, p_ui: UiLock) -> void:
	J = p_journey
	ui = p_ui


func open() -> bool:
	if not ui.request("journal"):
		return false
	_pages = JournalEntries.pages(J.S)
	_i = maxi(0, _pages.size() - 1)
	visible = true
	sfx.emit("page_flip")
	_render()
	return true


func close() -> void:
	visible = false
	ui.release("journal")
	closed.emit()


func flip(d: int) -> void:
	if _pages.is_empty():
		return
	var before := _i
	_i = clampi(_i + d, 0, _pages.size() - 1)
	if _i != before:
		sfx.emit("page_flip")
	_render()


func page_index() -> int:
	return _i


func _add(n: Control) -> Control:
	_root.add_child(n)
	return n


func _rect(r: Rect2, c: Color) -> ColorRect:
	var x := ColorRect.new()
	x.position = r.position
	x.size = r.size
	x.color = c
	return _add(x)


func _label(text: String, r: Rect2, size: int, color: Color) -> Label:
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.text = text
	l.position = r.position
	l.size = r.size
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return _add(l)


func _render() -> void:
	for c in _root.get_children():
		c.queue_free()
	_rect(Rect2(0, 0, 480, 270), Color("3a2a20"))
	var left := Rect2(24, 14, 214, 230)
	var right := Rect2(242, 14, 214, 230)
	_rect(left, Color("f6f0e2"))
	_rect(right, Color("f1eadb"))
	_rect(Rect2(237, 14, 6, 230), Color(0, 0, 0, 0.15))
	for y in range(40, 240, 16):
		_rect(Rect2(32, y, 198, 1), Color("e5dcc6"))
	var ink := Color("3a2f2a")
	if _pages.is_empty():
		_label(tr("ui.journal.empty"), Rect2(36, 40, 190, 60), 11, ink)
	else:
		var p: Dictionary = _pages[_i]
		_label(tr("ui.journal.day").format({"date": TimeUtil.date_str(int(p.day))}), Rect2(36, 20, 190, 14), 9, Color("8a7a68"))
		var text := PackedStringArray()
		for e in p.entries:
			text.append(JournalEntries.text(e))
		_label("\n".join(text), Rect2(36, 38, 192, 200), 11, ink)
		if p.photos.is_empty():
			_label(tr("ui.journal.no_photo"), Rect2(256, 110, 190, 20), 10, Color("8a7a68"))
		var py := 26.0
		var tilt := -3.0
		for ph in p.photos.slice(0, 2):
			_photo(ph, Vector2(262, py), tilt)
			py += 104
			tilt = -tilt
	_label("%d / %d" % [_i + 1, maxi(1, _pages.size())], Rect2(330, 248, 60, 12), 8, Color(0.85, 0.8, 0.7))
	_label(tr("ui.journal.hint"), Rect2(24, 248, 214, 12), 8, Color(0.85, 0.8, 0.7))


## 拍立得：白框＋照地點和時段打光的小畫面＋地點名
func _photo(ph: Dictionary, pos: Vector2, tilt: float) -> void:
	var frame := ColorRect.new()
	frame.color = Color.WHITE
	frame.size = Vector2(170, 96)
	frame.position = pos
	frame.rotation_degrees = tilt
	_add(frame)
	var cols: Array = PHOTO_COLORS.get(ph.spot, ["555555", "999999"])
	var tint: Color = TOD_TINT.get(ph.tod, Color.WHITE)
	var pic := ColorRect.new()
	pic.color = Color(cols[0]) * tint
	pic.size = Vector2(160, 72)
	pic.position = Vector2(5, 5)
	frame.add_child(pic)
	for k in 6:
		var dot := ColorRect.new()
		dot.color = Color(cols[1]) * tint
		dot.size = Vector2(4, 4)
		dot.position = Vector2(14 + k * 24, 30 + (k * 17) % 30)
		pic.add_child(dot)
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.text = tr("photo.%s.name" % ph.spot)
	l.position = Vector2(6, 78)
	l.add_theme_font_size_override("font_size", 8)
	l.add_theme_color_override("font_color", Color("2a2430"))
	frame.add_child(l)


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed("move_left") or event.is_action_pressed("choice_up"):
		flip(-1)
	elif event.is_action_pressed("move_right") or event.is_action_pressed("choice_down"):
		flip(1)
	elif event.is_action_pressed("journal") or event.is_action_pressed("cancel"):
		close()
	else:
		return
	get_viewport().set_input_as_handled()
