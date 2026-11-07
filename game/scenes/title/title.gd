## 標題畫面（Undertale 式：黑底、標題、少少幾個選項）：新的旅程、讀取日記、清除存檔。
## 下方顯示跨輪記得幾條旅行知識。
extends Control

var _opts: Array = []  # [{text, id}]
var _sel := 0
var _menu: VBoxContainer
@onready var _sub: Label = $Press


func _ready() -> void:
	get_window().title = tr("ui.app.name")
	_menu = VBoxContainer.new()
	_menu.position = Vector2(180, 168)
	_menu.size = Vector2(120, 60)
	add_child(_menu)
	_build()


func _build() -> void:
	_opts = [{"text": tr("ui.title.new"), "id": "new"}]
	var d: Variant = Game.J.slot("diary")
	if d is Dictionary:
		_opts.append({"text": tr("ui.title.load").format({"date": TimeUtil.date_str(int(d.label.day), true), "where": tr(d.label.where)}), "id": "load"})
	if d is Dictionary or not Game.J.meta.know.is_empty():
		_opts.append({"text": tr("ui.title.clear"), "id": "clear"})
	var n: int = Game.J.meta.know.size()
	_sub.text = tr("ui.title.know").format({"n": n}) if n > 0 else ""
	_sel = clampi(_sel, 0, _opts.size() - 1)
	_render()


func _render() -> void:
	for c in _menu.get_children():
		c.queue_free()
	for i in _opts.size():
		var l := Label.new()
		l.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
		l.text = ("> " if i == _sel else "  ") + _opts[i].text
		l.add_theme_font_size_override("font_size", 12)
		l.add_theme_color_override("font_color", Color("ffd84a") if i == _sel else Color.WHITE)
		_menu.add_child(l)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("choice_down") or event.is_action_pressed("move_right"):
		_sel = mini(_sel + 1, _opts.size() - 1)
		_render()
	elif event.is_action_pressed("choice_up") or event.is_action_pressed("move_left"):
		_sel = maxi(_sel - 1, 0)
		_render()
	elif event.is_action_pressed("interact"):
		# 先標成已處理：換場景會馬上把標題畫面移出場景樹，之後就拿不到 viewport
		get_viewport().set_input_as_handled()
		_pick(_opts[_sel].id)
		return
	else:
		return
	get_viewport().set_input_as_handled()


func _pick(id: String) -> void:
	match id:
		"new":
			Game.new_game()
			get_tree().change_scene_to_file("res://scenes/home/home.tscn")
		"load":
			if Game.J.load("diary"):
				Game.ui.clear()
				get_tree().change_scene_to_file("res://scenes/home/home.tscn")
		"clear":
			Game.J.clear_all()
			_sel = 0
			_build()
