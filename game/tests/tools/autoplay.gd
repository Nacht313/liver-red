## 開發用自動操作：照指令按鍵、移動主角，搭配 --write-movie 錄下畫面。
## godot --path game --script res://tests/tools/autoplay.gd --write-movie <絕對路徑>.png --fixed-fps 10 -- "<指令>"
## 指令用空白分開：i 確認鍵、c 取消鍵、p 手機鍵、u／d 選項上／下、x1200 主角移到 x=1200、w5 等 5 幀、
## i*6 重複 6 次、h18 時間快轉到 18 點、mark 在輸出印出目前幀數（方便找截圖）、quit 結束。
extends SceneTree

var _cmds: Array = []
var _frame := 0
var _wait := 8


func _initialize() -> void:
	var game := root.get_node_or_null("Game")
	if game == null:
		game = load("res://autoload/game.gd").new()
		game.name = "Game"
		root.add_child(game)
	game.new_game()
	for tok in " ".join(OS.get_cmdline_user_args()).split(" ", false):
		var n := 1
		if tok.contains("*"):
			n = int(tok.get_slice("*", 1))
			tok = tok.get_slice("*", 0)
		for _i in n:
			_cmds.append(tok)
	change_scene_to_file("res://scenes/home/home.tscn")


func _press(action: String) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = true
	Input.parse_input_event(e)
	var up := InputEventAction.new()
	up.action = action
	up.pressed = false
	Input.parse_input_event(up)


func _process(_delta: float) -> bool:
	_frame += 1
	if _wait > 0:
		_wait -= 1
		return false
	if _cmds.is_empty():
		return true
	var c: String = _cmds.pop_front()
	_wait = 2
	match c[0]:
		"i": _press("interact")
		"c": _press("cancel")
		"p": _press("phone")
		"u": _press("choice_up")
		"d": _press("choice_down")
		"x": current_scene.get_node("Player").position.x = float(c.substr(1))
		"w": _wait = int(c.substr(1))
		"h": root.get_node("Game").J.until(float(c.substr(1)))
		"m": print("  scene px=%s near=%s can_move=%s cards_open=%s" % [current_scene.player.position.x, current_scene.near_obj.get("id", ""), root.get_node("Game").can_move(), current_scene.cards.is_open()]) if current_scene.get("near_obj") != null else null; print("MARK frame %d node=%s waiting=%s ui=%s" % [_frame, root.get_node("Game").story.cur_id, root.get_node("Game").story.waiting, root.get_node("Game").ui.open])
		"q": return true
	return false
