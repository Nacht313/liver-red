## Undertale 式對話框：畫面下方黑底白框、左邊頭像、逐字顯示、太長自動分頁、選項在框裡。
## bind(runner) 之後會自動接上劇情執行器；測試可以不 bind，直接呼叫 show_line／show_choices。
class_name DialogueBox
extends CanvasLayer

signal next_requested
signal choice_made(i: int)
## 每打出幾個字發一次，給音效用（Task 14 的 Audio 接上）
signal blip(voice: String)

const LINES := 3
const CHARS_PER_SEC := 30.0
const BOX := Rect2(10, 188, 460, 76)
const TEXT_X := 66.0
const FONT_SIZE := 12
const ROW_H := 16
const BOTTOM := 264.0

var runner: StoryRunner
var speakers: Dictionary = {}

var _frame: Panel
var _portrait: ColorRect
var _label: Label
var _arrow: Label
var _choice_box: VBoxContainer
var _pages: PackedStringArray = []
var _page := 0
var _shown := 0.0
var _who := ""
var _choices: Array = []
var _sel := 0


func _init() -> void:
	layer = 10
	visible = false
	_frame = Panel.new()
	_frame.position = BOX.position
	_frame.size = BOX.size
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color.BLACK
	sb.set_border_width_all(3)
	sb.border_color = Color.WHITE
	_frame.add_theme_stylebox_override("panel", sb)
	add_child(_frame)
	_portrait = ColorRect.new()
	_portrait.position = Vector2(10, 14)
	_portrait.size = Vector2(46, 46)
	_portrait.color = Color("2a2230")
	_frame.add_child(_portrait)
	_label = Label.new()
	_label.position = Vector2(TEXT_X, 8)
	_label.size = Vector2(BOX.size.x - TEXT_X - 14, BOX.size.y - 16)
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.add_theme_font_size_override("font_size", FONT_SIZE)
	_label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_frame.add_child(_label)
	_arrow = Label.new()
	_arrow.text = "v"
	_arrow.position = Vector2(BOX.size.x - 16, BOX.size.y - 18)
	_arrow.add_theme_font_size_override("font_size", 10)
	_frame.add_child(_arrow)
	_choice_box = VBoxContainer.new()
	_choice_box.position = Vector2(TEXT_X, 6)
	_choice_box.add_theme_constant_override("separation", 0)
	_frame.add_child(_choice_box)


func bind(p_runner: StoryRunner, p_speakers: Dictionary = {}) -> void:
	runner = p_runner
	speakers = p_speakers
	runner.line.connect(show_line)
	runner.choices.connect(show_choices)
	runner.finished.connect(close)
	runner.check_started.connect(func(_info): visible = false)
	next_requested.connect(runner.advance)
	choice_made.connect(runner.choose)


# ---------- 台詞 ----------
func show_line(who: String, text: String) -> void:
	_who = who
	_choices = []
	_clear_choices()
	visible = true
	_label.visible = true
	var sp: Dictionary = speakers.get(who, {})
	_portrait.color = Color(sp.get("color", "2a2230"))
	_portrait.visible = not sp.get("no_portrait", 0)
	_set_text_x(TEXT_X if _portrait.visible else 14.0)
	_resize(BOX.size.y)
	_pages = _paginate(text)
	_page = 0
	_start_page()


func _start_page() -> void:
	_label.text = _pages[_page]
	_shown = 0.0
	_label.visible_characters = 0
	_arrow.visible = false


func _set_text_x(x: float) -> void:
	_label.position.x = x
	_label.size.x = BOX.size.x - x - 14
	_choice_box.position.x = x


func _resize(h: float) -> void:
	_frame.size = Vector2(BOX.size.x, h)
	_frame.position = Vector2(BOX.position.x, BOTTOM - h)
	_arrow.position = Vector2(BOX.size.x - 16, h - 18)


func frame_rect() -> Rect2:
	return Rect2(_frame.position, _frame.size)


func text_x() -> float:
	return _label.position.x


func is_typing() -> bool:
	return _choices.is_empty() and _label.visible_characters != -1 and _label.visible_characters < _label.text.length()


func page_count() -> int:
	return _pages.size()


func lines_on_page(i: int) -> int:
	return _measure(_pages[i]).size()


## 按確認鍵：還在打字就整頁出來；這頁看完就翻頁；最後一頁看完就要求下一句。選項出現時不做事。
func skip_or_next() -> void:
	if not _choices.is_empty() or not visible:
		return
	if runner and runner.waiting.begins_with("check"):
		return  # 判定欄在處理
	if is_typing():
		_label.visible_characters = -1
		_arrow.visible = true
	elif _page < _pages.size() - 1:
		_page += 1
		_start_page()
	else:
		next_requested.emit()


func _process(delta: float) -> void:
	if not is_typing():
		return
	var before := int(_shown)
	_shown += delta * CHARS_PER_SEC
	var now := mini(int(_shown), _label.text.length())
	_label.visible_characters = now
	for i in range(before, now):
		if i % 2 == 0 and _label.text[i] != " ":
			blip.emit(speakers.get(_who, {}).get("voice", "mid"))
	if now >= _label.text.length():
		_label.visible_characters = -1
		_arrow.visible = true


## 依框的寬度把文字切成好幾頁，每頁最多 LINES 行
func _paginate(text: String) -> PackedStringArray:
	var ranges := _measure(text)
	var out := PackedStringArray()
	var i := 0
	while i < ranges.size():
		var a: int = ranges[i].x
		var b: int = ranges[mini(i + LINES, ranges.size()) - 1].y
		out.append(text.substr(a, b - a).strip_edges())
		i += LINES
	if out.is_empty():
		out.append("")
	return out


func _measure(text: String) -> Array:
	var para := TextParagraph.new()
	var font: Font = _label.get_theme_font("font")
	para.add_string(text, font, FONT_SIZE)
	para.width = _label.size.x
	para.break_flags = TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND | TextServer.BREAK_GRAPHEME_BOUND
	var out := []
	for l in para.get_line_count():
		out.append(para.get_line_range(l))
	return out


# ---------- 選項 ----------
func show_choices(list: Array) -> void:
	visible = true
	_choices = list
	_label.visible = false
	_arrow.visible = false
	_sel = 0
	_resize(maxf(BOX.size.y, list.size() * ROW_H + 14))
	if not list.is_empty() and list[0].why != "":
		move(1)
	_render_choices()


func _clear_choices() -> void:
	for c in _choice_box.get_children():
		c.queue_free()


func _render_choices() -> void:
	_clear_choices()
	for i in _choices.size():
		var c: Dictionary = _choices[i]
		var l := Label.new()
		l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
		l.add_theme_font_size_override("font_size", FONT_SIZE)
		l.custom_minimum_size.y = ROW_H
		var mark := "> " if i == _sel else "  "
		l.text = mark + c.text + (("  (" + c.why + ")") if c.why != "" else ("  " + c.sub if c.sub != "" else ""))
		l.modulate = Color(1, 0.85, 0.3) if i == _sel else (Color(0.5, 0.5, 0.55) if c.why != "" else Color.WHITE)
		_choice_box.add_child(l)


## 游標上下移動，跳過不能選的
func move(d: int) -> void:
	if _choices.is_empty():
		return
	for _i in _choices.size():
		_sel = posmod(_sel + d, _choices.size())
		if _choices[_sel].why == "":
			break
	_render_choices()


func confirm() -> void:
	if _choices.is_empty() or _choices[_sel].why != "":
		return
	var i := _sel
	_choices = []
	_clear_choices()
	choice_made.emit(i)


func close() -> void:
	visible = false
	_choices = []
	_clear_choices()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if not _choices.is_empty():
		if event.is_action_pressed("choice_up"):
			move(-1)
		elif event.is_action_pressed("choice_down"):
			move(1)
		elif event.is_action_pressed("interact"):
			confirm()
		elif event is InputEventKey and event.pressed and event.keycode >= KEY_1 and event.keycode <= KEY_9:
			var i: int = event.keycode - KEY_1
			if i < _choices.size() and _choices[i].why == "":
				_sel = i
				confirm()
		else:
			return
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("interact"):
		skip_or_next()
		get_viewport().set_input_as_handled()
