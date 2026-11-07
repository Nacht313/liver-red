## 全螢幕卡片：每天早上的日期卡（女神異聞錄 5 式）、結局卡、出門辦事的淡出淡入。
## 卡片開著時佔住介面鎖（"card"），按確認鍵關閉。
class_name Cards
extends CanvasLayer

signal closed(kind: String)
signal choice(id: String)

var _kind := ""
var _root: Control
var _choices: Array = []


func _init() -> void:
	layer = 20
	visible = false
	_root = Control.new()
	_root.size = Vector2(480, 270)
	add_child(_root)


func _label(text: String, pos: Vector2, size: int, color := Color.WHITE, width := 0.0) -> Label:
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.text = text
	l.position = pos
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if width > 0:
		l.size.x = width
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_root.add_child(l)
	return l


func _clear() -> void:
	for c in _root.get_children():
		c.queue_free()


## 早上的日期卡：日期、星期、距離出發還有幾天
func show_day(J: Journey) -> void:
	_clear()
	_kind = "day_card"
	var bg := ColorRect.new()
	bg.color = Color("0d0b10")
	bg.size = Vector2(480, 270)
	_root.add_child(bg)
	var band := ColorRect.new()
	band.color = Color("8e3434")
	band.size = Vector2(620, 110)
	band.position = Vector2(-70, 90)
	band.rotation_degrees = -7
	_root.add_child(band)
	var p := TimeUtil.date_parts(J.S.day)
	var md := _label("%d/%d" % [p.m, p.d], Vector2(70, 82), 56)
	md.rotation_degrees = -7
	var wd := _label(tr("ui.day.weekday").format({"w": tr("ui.weekday.%d" % p.w)}), Vector2(76, 150), 16, Color("0d0b10"))
	wd.rotation_degrees = -7
	var bgw := ColorRect.new()
	bgw.color = Color.WHITE
	bgw.size = Vector2(70, 22)
	bgw.position = Vector2(72, 152)
	bgw.rotation_degrees = -7
	_root.add_child(bgw)
	_root.move_child(bgw, wd.get_index())
	var left := ""
	if J.S.dep != null:
		var n := int(J.S.dep) - J.S.day
		left = tr("ui.day.today") if n == 0 else tr("ui.day.left").format({"n": n})
	else:
		left = tr("ui.day.no_trip")
	var ln := _label(left, Vector2(80, 182), 14)
	ln.rotation_degrees = -7
	_label(tr("ui.card.press"), Vector2(0, 244), 10, Color(0.6, 0.6, 0.65), 480).horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	visible = true


## 結局卡：失敗結局，或下樓出發的「旅程開始」
func show_end(J: Journey, kind: String) -> void:
	_clear()
	_kind = "end_card"
	var bg := ColorRect.new()
	bg.color = Color.BLACK
	bg.size = Vector2(480, 270)
	_root.add_child(bg)
	if kind == "departed":
		_label(tr("ui.end.departed_title"), Vector2(0, 60), 28, Color("d8b46a"), 480).horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		var body := tr("ui.end.departed_body").format({"spent": roundi(J.S.start - J.money()), "left": roundi(J.money()), "know": J.S.know.size()})
		_label(body, Vector2(60, 110), 12, Color.WHITE, 360).horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	else:
		var e: Dictionary = J.db.endings[kind]
		_label(tr(e.title), Vector2(0, 50), 24, Color("e05a5a"), 480).horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_label(tr(e.text), Vector2(60, 95), 12, Color.WHITE, 360)
		_label(tr("ui.end.keep_knowledge"), Vector2(60, 200), 10, Color(0.6, 0.6, 0.65), 360)
	_label(tr("ui.end.to_title"), Vector2(0, 244), 10, Color(0.6, 0.6, 0.65), 480).horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	visible = true


## 出門辦事：畫面暗一下再亮回來
func fade() -> void:
	var r := ColorRect.new()
	r.color = Color(0, 0, 0, 0)
	r.size = Vector2(480, 270)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(r)
	visible = true
	_root.visible = false
	var t := create_tween()
	t.tween_property(r, "color:a", 1.0, 0.35)
	t.tween_property(r, "color:a", 0.0, 0.45)
	t.tween_callback(func():
		r.queue_free()
		_root.visible = true
		if _kind == "":
			visible = false)


func is_open() -> bool:
	return _kind != ""


func close() -> void:
	var k := _kind
	_kind = ""
	visible = false
	_clear()
	closed.emit(k)


func _unhandled_input(event: InputEvent) -> void:
	if _kind != "" and (event.is_action_pressed("interact") or event.is_action_pressed("cancel")):
		get_viewport().set_input_as_handled()
		close()
