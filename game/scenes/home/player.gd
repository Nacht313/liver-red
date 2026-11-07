## 主角：← → 走路，鏡頭跟著走。走路花遊戲時間：走完整個家（1920 px）約 4 分鐘。
## 美術在 Task 13 換成生成的像素圖；現在是色塊。
extends Node2D

const SPEED := 62.0  # 像素／秒（網頁版 WALK_SPEED）
const HOURS_PER_PX := (4.0 / 60.0) / 1920.0

var world_width := 1920.0
var dir := 1
var _body: ColorRect
var _head: ColorRect


func _ready() -> void:
	_body = ColorRect.new()
	_body.color = Color("ecebe6")
	_body.size = Vector2(12, 18)
	_body.position = Vector2(-6, -18)
	add_child(_body)
	_head = ColorRect.new()
	_head.color = Color("e3b994")
	_head.size = Vector2(10, 10)
	_head.position = Vector2(-5, -28)
	add_child(_head)
	var legs := ColorRect.new()
	legs.color = Color("34405e")
	legs.size = Vector2(10, 8)
	legs.position = Vector2(-5, 0)
	add_child(legs)


func _process(delta: float) -> void:
	if not Game.can_move() or Game.J.S.over:
		return
	var v := Input.get_axis("move_left", "move_right")
	if v == 0:
		return
	dir = int(sign(v))
	var old := position.x
	position.x = clampf(position.x + v * SPEED * delta, 12, world_width - 12)
	var moved := absf(position.x - old)
	if moved > 0:
		Game.J.advance(moved * HOURS_PER_PX)
