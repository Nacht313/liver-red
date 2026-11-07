## 主角：← → 走路，鏡頭跟著走。走路花遊戲時間：走完整個家（2200 px）約 4 分鐘。
## 圖是生成的像素圖（game/art/chars/），往左走時左右翻轉。
extends Node2D

const SPEED := 62.0  # 像素／秒（網頁版 WALK_SPEED）
const HOURS_PER_PX := (4.0 / 60.0) / 2200.0

var world_width := 1920.0
var dir := 1


var _anim: AnimatedSprite2D


func _ready() -> void:
	_anim = AnimatedSprite2D.new()
	var f := SpriteFrames.new()
	f.add_animation("idle")
	f.add_frame("idle", load("res://art/chars/me_idle.png"))
	f.add_animation("walk")
	f.set_animation_speed("walk", 8.0)
	for i in 4:
		f.add_frame("walk", load("res://art/chars/me_walk_%d.png" % i))
	f.remove_animation("default")
	_anim.sprite_frames = f
	var tex: Texture2D = f.get_frame_texture("idle", 0)
	_anim.offset = Vector2(0, -tex.get_height() / 2.0)
	add_child(_anim)
	_anim.play("idle")


func _process(delta: float) -> void:
	if not Game.can_move() or Game.J.S.over:
		if _anim:
			_anim.play("idle")
		return
	var v := Input.get_axis("move_left", "move_right")
	if v == 0:
		_anim.play("idle")
		return
	dir = int(sign(v))
	_anim.flip_h = dir < 0
	_anim.play("walk")
	var old := position.x
	position.x = clampf(position.x + v * SPEED * delta, 12, world_width - 12)
	var moved := absf(position.x - old)
	if moved > 0:
		Game.J.advance(moved * HOURS_PER_PX)
