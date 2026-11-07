## 手機（按 P 拿出來）和電腦（走到書桌按 E）：同一套 App，電腦是大螢幕外框而且不耗手機電。
## 頁面資料來自 PhoneApps；這裡只負責畫、上下選、確認、返回。
class_name Phone
extends CanvasLayer

signal story_requested(node: String)
signal closed

const ROW_H := 22

var J: Journey
var ui: UiLock
var big := false
var _stack: Array = []  # [[app, arg], ...]
var _page: Dictionary = {}
var _sel := 0
var _scroll := 0
var _dim: ColorRect
var _frame: Panel
var _title: Label
var _body: VBoxContainer
var _clip: Control
var _toast: Label
var _map_tex: ImageTexture


func _init() -> void:
	layer = 18
	visible = false
	_dim = ColorRect.new()
	_dim.color = Color(0, 0, 0, 0.6)
	_dim.size = Vector2(480, 270)
	add_child(_dim)
	_frame = Panel.new()
	add_child(_frame)
	_title = _label(13, Color.WHITE)
	_frame.add_child(_title)
	_clip = Control.new()
	_clip.clip_contents = true
	_frame.add_child(_clip)
	_body = VBoxContainer.new()
	_body.add_theme_constant_override("separation", 2)
	_clip.add_child(_body)
	_toast = _label(10, Color("ffd60a"))
	_frame.add_child(_toast)


func setup(p_journey: Journey, p_ui: UiLock) -> void:
	J = p_journey
	ui = p_ui


func _label(size: int, color: Color) -> Label:
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l


func is_open() -> bool:
	return visible


## 打開手機或電腦；有別的介面開著時回傳 false
func open(app := "home", arg: Variant = null, p_big := false) -> bool:
	if not ui.request("phone"):
		return false
	big = p_big
	_layout()
	_stack = [["home", null]]
	visible = true
	if app != "home":
		go(app, arg)
	else:
		_refresh()
	return true


func _layout() -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("0a0a0c")
	sb.set_border_width_all(4)
	sb.border_color = Color("3b3742")
	if big:
		_frame.position = Vector2(40, 14)
		_frame.size = Vector2(400, 242)
		sb.set_corner_radius_all(6)
	else:
		_frame.position = Vector2(170, 6)
		_frame.size = Vector2(140, 258)
		sb.set_corner_radius_all(16)
	_frame.add_theme_stylebox_override("panel", sb)
	_title.position = Vector2(14, 10)
	_title.size = Vector2(_frame.size.x - 28, 18)
	_clip.position = Vector2(10, 30)
	_clip.size = Vector2(_frame.size.x - 20, _frame.size.y - 40)
	_body.position = Vector2.ZERO
	_body.size = _clip.size
	_toast.position = Vector2(12, _frame.size.y - 22)
	_toast.size = Vector2(_frame.size.x - 24, 16)


func go(app: String, arg: Variant) -> void:
	if app != "home" and not big:
		J.add("battery", -1)
	_stack.append([app, arg])
	_sel = 0
	_scroll = 0
	_refresh()


func back() -> void:
	if _stack.size() <= 1:
		close()
		return
	_stack.pop_back()
	_sel = 0
	_scroll = 0
	_refresh()


func close() -> void:
	visible = false
	_stack.clear()
	ui.release("phone")
	closed.emit()


func current_app() -> String:
	return _stack.back()[0] if not _stack.is_empty() else ""


func _refresh() -> void:
	var top: Array = _stack.back()
	_page = PhoneApps.page(J, top[0], top[1])
	_render()


func _render() -> void:
	for c in _body.get_children():
		c.queue_free()
	_title.text = tr("phone.pc") if big and _stack.size() == 1 else _page.title
	var w := _body.size.x
	for b in _page.blocks:
		if b.kind == "map":
			_body.add_child(_map_view(w))
			continue
		var l := _label(9, Color("d1d1d6") if b.kind != "warn" else Color("ffd60a"))
		l.text = b.text
		l.custom_minimum_size.x = w
		if b.kind == "note":
			l.add_theme_color_override("font_color", Color.WHITE)
		_body.add_child(l)
	var rows: Array = _page.rows
	_sel = clampi(_sel, 0, maxi(0, rows.size() - 1))
	var visible_rows := maxi(1, int((_clip.size.y - _blocks_h()) / ROW_H))
	_scroll = clampi(_scroll, maxi(0, _sel - visible_rows + 1), _sel)
	for i in range(_scroll, rows.size()):
		_body.add_child(_row_view(rows[i], i == _sel, w))


func _blocks_h() -> float:
	var h := 0.0
	for b in _page.blocks:
		h += 70.0 if b.kind == "map" else 14.0 * ceilf(float(b.text.length()) * 9.0 / _clip.size.x + 0.01)
	return h


func _row_view(r: Dictionary, sel: bool, w: float) -> Control:
	var box := Panel.new()
	box.custom_minimum_size = Vector2(w, ROW_H - 2)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.04, 0.52, 1.0, 0.35) if sel else Color("1c1c1e")
	sb.set_corner_radius_all(4)
	if sel:
		sb.set_border_width_all(1)
		sb.border_color = Color("0a84ff")
	box.add_theme_stylebox_override("panel", sb)
	var main := _label(10, Color.WHITE if r.why == "" else Color(0.5, 0.5, 0.55))
	main.autowrap_mode = TextServer.AUTOWRAP_OFF
	main.clip_text = true
	main.text = r.text
	main.position = Vector2(4, 0)
	main.size = Vector2(w * 0.68, 11)
	box.add_child(main)
	var sub := _label(8, Color("8e8e93"))
	sub.autowrap_mode = TextServer.AUTOWRAP_OFF
	sub.clip_text = true
	sub.text = r.why if r.why != "" else r.sub
	sub.position = Vector2(4, 10)
	sub.size = Vector2(w - 8, 9)
	box.add_child(sub)
	var right := _label(9, Color("0a84ff") if r.why == "" else Color(0.4, 0.4, 0.45))
	right.text = r.right
	right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	right.position = Vector2(w * 0.6, 0)
	right.size = Vector2(w * 0.4 - 4, 11)
	box.add_child(right)
	return box


## 亞洲地圖：資料的每一格畫成一個像素，顏色是對中國護照的態度；沒查過的國家是灰色
func _map_view(w: float) -> Control:
	if _map_tex == null:
		_map_tex = ImageTexture.create_from_image(_map_image())
	var tr := TextureRect.new()
	tr.texture = _map_tex
	tr.custom_minimum_size = Vector2(w, 66)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	return tr


func _map_image() -> Image:
	var m: Dictionary = J.db.asia_map
	var rows: Array = m.rows
	var img := Image.create(rows[0].length(), rows.size(), false, Image.FORMAT_RGB8)
	img.fill(Color("a6ccd6"))
	var tones := [Color("efe6cf"), Color("e6d9bb"), Color("f3ebd8"), Color("ddcfb2")]
	for y in rows.size():
		var r: String = rows[y]
		for x in r.length():
			if r[x] == ".":
				continue
			var i: int = m.alphabet.find(r[x])
			var c: Dictionary = m.countries[i]
			var col: Color = tones[i % 4]
			if c.st != "":
				col = Color(m.st_col[c.st]) if PhoneApps.known_country(J, c) else Color("cdc6bb")
			img.set_pixel(x, y, col)
	return img


func _do(r: Dictionary) -> void:
	if r.why != "" or r.act.is_empty():
		return
	var res := PhoneApps.act(J, r.act)
	if J.S.over:
		close()
		return
	_toast.text = tr(res.toast) if res.has("toast") else ""
	if res.has("story"):
		close()
		story_requested.emit(res.story)
	elif res.has("back"):
		back()
	elif res.has("go"):
		var g: Array = res.go
		if _stack.size() > 1 and _stack.back()[0] == g[0]:
			_stack.pop_back()
		go(g[0], g[1])
	else:
		_refresh()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	var rows: Array = _page.get("rows", [])
	if event.is_action_pressed("choice_down") or event.is_action_pressed("move_right"):
		_sel = mini(_sel + 1, rows.size() - 1)
		_render()
	elif event.is_action_pressed("choice_up") or event.is_action_pressed("move_left"):
		_sel = maxi(_sel - 1, 0)
		_render()
	elif event.is_action_pressed("interact"):
		if not rows.is_empty():
			_do(rows[_sel])
	elif event.is_action_pressed("cancel"):
		back()
	elif event.is_action_pressed("phone") or event.is_action_pressed("journal"):
		if event.is_action_pressed("phone"):
			close()
	else:
		return
	get_viewport().set_input_as_handled()
