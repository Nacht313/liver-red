## 家：橫向捲軸場景。區域和可互動的東西從 data/home.json 建出來。
## 走到東西旁邊（26 px 內）出現「[E] 名稱」，按 E 或 Enter 開始那個東西的劇情節點。
extends Node2D

const NEAR := 26.0
const AREA_COLORS := {"bedroom": "3a2e44", "living": "3a2a2a", "dining": "4a3428", "door": "2b2233", "stairwell": "2a2a30"}

var data: Dictionary
var objects: Array = []
var near_obj: Dictionary = {}

@onready var player: Node2D = $Player
@onready var cam: Camera2D = $Player/Camera2D
@onready var prompt: Label = $Hud/Prompt
var dialogue: DialogueBox
var cards: Cards


func _ready() -> void:
	data = JSON.parse_string(FileAccess.get_file_as_string("res://data/home.json"))
	var floor_y: float = data.floor_y
	for a in data.areas:
		var r := ColorRect.new()
		r.color = Color(AREA_COLORS.get(a.id, "333333"))
		r.position = Vector2(a.x0, 0)
		r.size = Vector2(a.x1 - a.x0, floor_y)
		r.z_index = -10
		add_child(r)
		var wall := ColorRect.new()
		wall.color = Color("1a1420")
		wall.position = Vector2(a.x0, 0)
		wall.size = Vector2(2, floor_y)
		wall.z_index = -9
		add_child(wall)
	var ground := ColorRect.new()
	ground.color = Color("1a1420")
	ground.position = Vector2(0, floor_y)
	ground.size = Vector2(data.width, 270 - floor_y)
	ground.z_index = -10
	add_child(ground)
	for o in data.objects:
		var box := ColorRect.new()
		box.color = Color("8a6a4a")
		box.size = Vector2(16, 20)
		box.position = Vector2(o.x - 8, floor_y - 20)
		box.z_index = -5
		add_child(box)
		objects.append(o)
	player.position = Vector2(data.start_x, floor_y)
	player.world_width = data.width
	cam.limit_left = 0
	cam.limit_right = int(data.width)
	cam.limit_top = 0
	cam.limit_bottom = 270
	prompt.visible = false
	dialogue = DialogueBox.new()
	add_child(dialogue)
	var speakers: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/speakers.json"))
	dialogue.bind(Game.story, speakers)
	Game.story.line.connect(func(_w, _t): Game.request_ui("dialogue"))
	Game.story.finished.connect(func(): Game.release_ui("dialogue"))
	Game.story.open_ui.connect(_on_open_ui)
	Game.story.check_started.connect(_on_check)
	cards = Cards.new()
	add_child(cards)
	cards.closed.connect(_on_card_closed)
	Game.J.ended.connect(func(kind): _show_end(kind))
	if not Game.J.S.flags.has("intro_seen"):
		Game.story.start.call_deferred("intro")


func _on_open_ui(kind: String, arg: Variant) -> void:
	match kind:
		"day_card":
			cards.show_day(Game.J)
		"end_card":
			_show_end(str(arg))
		"fade":
			cards.fade()
		_:
			pass  # pc、backpack：Task 9、10


func _show_end(kind: String) -> void:
	Game.ui.clear()
	Game.request_ui("card")
	cards.show_end(Game.J, kind)


func _on_card_closed(kind: String) -> void:
	Game.release_ui("card")
	if kind == "end_card":
		get_tree().change_scene_to_file("res://scenes/title/title.tscn")


## 判定欄在 Task 8 才有；在那之前直接擲骰
func _on_check(_info: Dictionary) -> void:
	Game.story.roll_check.call_deferred()


func _process(_delta: float) -> void:
	near_obj = _nearest()
	prompt.visible = not near_obj.is_empty() and Game.can_move() and not cards.is_open()
	if prompt.visible:
		prompt.text = tr("ui.prompt").format({"name": tr(near_obj.name)})


func _nearest() -> Dictionary:
	var best: Dictionary = {}
	var bd := NEAR
	for o in objects:
		var d := absf(player.position.x - float(o.x))
		if d < bd:
			bd = d
			best = o
	return best


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact") and not near_obj.is_empty() and Game.can_move() and not cards.is_open():
		get_viewport().set_input_as_handled()
		interact(near_obj)


## 和某個東西互動：開始它的劇情節點
func interact(o: Dictionary) -> void:
	Game.story.start(o.node)
