## 標題畫面（Task 11 再補選單）。按 Enter 開始新的旅程。
extends Control


func _ready() -> void:
	get_window().title = tr("ui.app.name")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		Game.new_game()
		get_tree().change_scene_to_file("res://scenes/home/home.tscn")
