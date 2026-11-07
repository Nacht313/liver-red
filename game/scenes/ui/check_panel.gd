## 判定欄（極樂迪斯科式）：需要判定時從右邊滑進來，佔畫面 40%。
## 顯示屬性和等級、成功率、內心的聲音；按確認擲骰，數字跳動後停在結果；再按一次滑出去。
class_name CheckPanel
extends CanvasLayer

signal roll_requested
signal done
signal sfx(name: String)

const W := 192.0
const IN_X := 480.0 - W
const OUT_X := 480.0
const ROLL_TIME := 0.6

var _panel: Panel
var _head: Label
var _body: Label
var _result: Label
var _hint: Label
var _tween: Tween
var _state := ""  # ""、"ask"、"rolling"、"result"
var _res: Dictionary = {}
var _spin := 0.0
var _target_x := OUT_X


func _init() -> void:
	layer = 15
	_panel = Panel.new()
	_panel.position = Vector2(OUT_X, 0)
	_panel.size = Vector2(W, 270)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.06, 0.07, 0.96)
	sb.border_width_left = 1
	sb.border_color = Color("3a3a3a")
	sb.shadow_color = Color(0, 0, 0, 0.6)
	sb.shadow_size = 12
	_panel.add_theme_stylebox_override("panel", sb)
	_panel.visible = false
	add_child(_panel)
	_head = _mk(Vector2(14, 16), 11, Color("d8b46a"))
	_body = _mk(Vector2(14, 40), 12, Color("d8d2c4"))
	_result = _mk(Vector2(14, 170), 14, Color.WHITE)
	_hint = _mk(Vector2(14, 246), 10, Color(0.55, 0.55, 0.6))


func _mk(pos: Vector2, size: int, color: Color) -> Label:
	var l := Label.new()
	l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	l.position = pos
	l.size = Vector2(W - 28, 0)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	_panel.add_child(l)
	return l


func bind(runner: StoryRunner) -> void:
	runner.check_started.connect(show_check)
	runner.check_resolved.connect(show_result)
	roll_requested.connect(runner.roll_check)
	done.connect(runner.advance)


func panel_x() -> float:
	return _panel.position.x


func is_rolling() -> bool:
	return _state == "rolling"


func result_text() -> String:
	return _result.text


func show_check(info: Dictionary) -> void:
	_state = "ask"
	_head.text = tr("ui.check.head").format({"attr": tr("attr.%s.name" % info.attr), "level": info.level, "chance": info.chance})
	_body.text = info.text
	_result.text = ""
	_hint.text = tr("ui.check.press_roll")
	_slide(IN_X)


func show_result(res: Dictionary) -> void:
	_res = res
	_state = "rolling"
	sfx.emit("dice")
	_spin = 0.0
	_hint.text = ""


func _process(delta: float) -> void:
	if _state != "rolling":
		return
	_spin += delta
	_result.text = str(randi_range(1, 100))
	if _spin >= ROLL_TIME:
		_land()


func _land() -> void:
	_state = "result"
	sfx.emit("check_win" if _res.win else "check_lose")
	var word := tr("ui.check.crit") if _res.crit else (tr("ui.check.win") if _res.win else tr("ui.check.fail"))
	_result.text = tr("ui.check.result").format({"roll": _res.roll, "word": word})
	_result.add_theme_color_override("font_color", Color("6cc27a") if _res.win else Color("e05a5a"))
	_hint.text = tr("ui.card.press")


## 確認鍵：問擲骰時要求擲骰；結果出來後滑出去
func confirm() -> void:
	match _state:
		"ask":
			_state = "waiting_roll"
			roll_requested.emit()
		"result":
			_state = ""
			_slide(OUT_X)
			done.emit()


## 取消鍵：判定不能取消
func cancel() -> bool:
	return false


func _slide(x: float) -> void:
	_target_x = x
	_panel.visible = true
	if _tween:
		_tween.kill()
	_tween = create_tween()
	_tween.tween_property(_panel, "position:x", x, 0.35).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	if x >= OUT_X:
		_tween.tween_callback(func(): _panel.visible = false)


## 測試用：把動畫跑完
func finish_anim() -> void:
	if _tween:
		_tween.kill()
	_panel.position.x = _target_x
	_panel.visible = _target_x < OUT_X
	if _state == "rolling":
		_land()


func _unhandled_input(event: InputEvent) -> void:
	if _state == "":
		return
	if event.is_action_pressed("interact"):
		confirm()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("cancel"):
		cancel()
		get_viewport().set_input_as_handled()
