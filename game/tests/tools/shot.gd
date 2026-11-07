## 開發用截圖：godot --path game --script res://tests/tools/shot.gd --write-movie <絕對路徑>.png -- <場景> <主角x> [節點]
## 會開新的一局、把主角放到指定位置，必要時開始一個劇情節點，跑幾十幀後結束。
extends SceneTree

var _frames := 0
var _args: PackedStringArray


func _initialize() -> void:
	_args = OS.get_cmdline_user_args()
	var game := root.get_node_or_null("Game")
	if game == null:
		game = load("res://autoload/game.gd").new()
		game.name = "Game"
		root.add_child(game)
	if root.get_node_or_null("Audio") == null:
		var au: Node = load("res://autoload/audio.gd").new()
		au.name = "Audio"
		root.add_child(au)
	game.new_game()
	change_scene_to_file(_args[0] if _args.size() > 0 else "res://scenes/home/home.tscn")


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames == 3 and _args.size() > 1:
		var p := current_scene.get_node_or_null("Player")
		if p:
			p.position.x = float(_args[1])
	if _frames == 5 and _args.size() > 2:
		root.get_node("Game").story.start(_args[2])
	return _frames > 60
