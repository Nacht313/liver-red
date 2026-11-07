## 家的場景冒煙測試：真的把 home.tscn 載進來，確認走到東西旁邊會被偵測到。
extends TestCase


func _game() -> Node:
	var root := (Engine.get_main_loop() as SceneTree).root
	var g := root.get_node_or_null("Game")
	if g == null:
		g = load("res://autoload/game.gd").new()
		g.name = "Game"
		root.add_child(g)
	g.new_game()
	g.J.S.flags["intro_seen"] = 1
	return g


func test_detects_table_near_player() -> void:
	_game()
	var home: Node = load("res://scenes/home/home.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(home)
	home.player.position.x = 1200
	home._process(0.0)
	eq(home.near_obj.get("id", ""), "table", "站在飯桌前偵測到飯桌")
	ok(home.has_method("interact"), "可以互動")
	home.player.position.x = 700
	home._process(0.0)
	eq(home.near_obj.get("id", ""), "", "空地上沒有東西")
	home.queue_free()
