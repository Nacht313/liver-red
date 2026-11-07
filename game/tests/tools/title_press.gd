## 開發用：打開標題畫面，按一次確認鍵（新的旅程），跑幾幀後結束。看輸出有沒有腳本錯誤。
## godot --headless --path game --script res://tests/tools/title_press.gd
extends SceneTree

var _f := 0


func _initialize() -> void:
	for n in ["Game", "Audio"]:
		if root.get_node_or_null(n) == null:
			var node: Node = load("res://autoload/%s.gd" % n.to_lower()).new()
			node.name = n
			root.add_child(node)
	change_scene_to_file("res://scenes/title/title.tscn")


func _process(_d: float) -> bool:
	_f += 1
	if _f == 5:
		var e := InputEventAction.new()
		e.action = "interact"
		e.pressed = true
		Input.parse_input_event(e)
	if _f == 20:
		print("TITLE_PRESS scene=%s" % current_scene.name if current_scene else "TITLE_PRESS scene=null")
	return _f > 20
