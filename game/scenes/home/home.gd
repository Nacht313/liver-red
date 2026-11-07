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
var phone: Phone
var backpack: Backpack
var journal: Journal
var _modulate: CanvasModulate
var _lamps: Array[PointLight2D] = []
var _sky: ColorRect


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
	_setup_lighting(floor_y)
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
	var check_panel := CheckPanel.new()
	add_child(check_panel)
	check_panel.bind(Game.story)
	phone = Phone.new()
	add_child(phone)
	phone.setup(Game.J, Game.ui)
	phone.story_requested.connect(func(node): Game.story.start.call_deferred(node))
	backpack = Backpack.new()
	add_child(backpack)
	backpack.setup(Game.J, Game.ui)
	journal = Journal.new()
	add_child(journal)
	journal.setup(Game.J, Game.ui)
	cards = Cards.new()
	add_child(cards)
	cards.closed.connect(_on_card_closed)
	Game.J.ended.connect(func(kind): _show_end(kind))
	if Game.J.S.resume == "bed":
		player.position.x = _object_x("bed")
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
		"pc":
			phone.open.call_deferred("home", null, true)
		"backpack":
			backpack.open.call_deferred()
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


func _process(_delta: float) -> void:
	_update_lighting()
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
	if event.is_action_pressed("journal") and Game.can_move() and not cards.is_open():
		get_viewport().set_input_as_handled()
		journal.open()
		return
	if event.is_action_pressed("phone") and Game.can_move() and not cards.is_open() and Game.J.S.flags.has("funded"):
		get_viewport().set_input_as_handled()
		phone.open()
		return
	if event.is_action_pressed("interact") and not near_obj.is_empty() and Game.can_move() and not cards.is_open():
		get_viewport().set_input_as_handled()
		interact(near_obj)


## 和某個東西互動：開始它的劇情節點
func interact(o: Dictionary) -> void:
	Game.story.start(o.node)


func _object_x(id: String) -> float:
	for o in objects:
		if o.id == id:
			return float(o.x)
	return float(data.start_x)


# ---------- 打光：整體色調跟著時間走，每個房間一盞天花板燈，窗外的天色 ----------
func _setup_lighting(floor_y: float) -> void:
	_sky = ColorRect.new()
	_sky.position = Vector2(_object_x("window") - 24, 40)
	_sky.size = Vector2(48, 50)
	_sky.z_index = -8
	add_child(_sky)
	_modulate = CanvasModulate.new()
	add_child(_modulate)
	var tex := GradientTexture2D.new()
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = 256
	tex.height = 256
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	tex.gradient = g
	for a in data.areas:
		if a.id == "stairwell" or a.id == "door":
			continue
		var l := PointLight2D.new()
		l.texture = tex
		l.texture_scale = 1.2
		l.color = Color(1.0, 0.82, 0.58)
		l.position = Vector2((a.x0 + a.x1) / 2.0, 30)
		l.blend_mode = Light2D.BLEND_MODE_ADD
		add_child(l)
		_lamps.append(l)


func _update_lighting() -> void:
	if Game.J.S == null:
		return
	var p := Lighting.params(Game.J.S.h)
	_modulate.color = p.tint
	for l in _lamps:
		l.energy = 0.9 * p.lamp
		l.visible = p.lamp > 0.01
	var day_sky := Color("7fb8e0")
	var dusk_sky := Color("f2a674")
	var night_sky := Color("1a1e3a")
	_sky.color = night_sky.lerp(day_sky, p.day).lerp(dusk_sky, 0.6 * p.warm)
