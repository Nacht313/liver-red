## 背包介面：拖到格子上、轉向、拖回床上、放錯彈回。
extends TestCase


func _bp() -> Array:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/bp/"), func() -> float: return 0.0)
	J.new_game()
	var ui := UiLock.new()
	var b := Backpack.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(b)
	b.setup(J, ui)
	ok(b.open(), "打開背包")
	return [b, J, ui]


func _cell(l: String, x: int, y: int) -> Vector2:
	return Backpack.LAYOUT[l] + Vector2(x * Backpack.CELL + 3, y * Backpack.CELL + 3)


func test_drag_into_grid_and_back_to_bed() -> void:
	var a := _bp()
	var b: Backpack = a[0]
	var J: Journey = a[1]
	b.begin_drag("laptop")
	b.drop_at(_cell("mid", 0, 1))
	eq(J.S.items["laptop"], "mid", "筆電放進中層")
	eq(J.S.grid["laptop"].y, 1, "在第二列")
	b.begin_drag("laptop")
	b.drop_at(Backpack.BED.get_center())
	eq(J.S.items["laptop"], "home", "拖回床上")
	b.close()
	b.queue_free()
	SaveStore.remove_dir("user://test_saves/bp/")


func test_rotate_while_dragging() -> void:
	var a := _bp()
	var b: Backpack = a[0]
	var J: Journey = a[1]
	b.begin_drag("laptop")
	b.rotate_drag()
	b.drop_at(_cell("mid", 4, 0))
	eq(J.S.grid["laptop"].r, 1, "轉直放進最右邊一欄")
	b.close()
	b.queue_free()


func test_bad_drop_snaps_back() -> void:
	var a := _bp()
	var b: Backpack = a[0]
	var J: Journey = a[1]
	var before := J.S.items.duplicate(true)
	b.begin_drag("laptop")
	b.drop_at(_cell("pocket", 0, 0))
	eq(J.S.items, before, "褲袋放不下筆電，什麼都沒變")
	b.begin_drag("laptop")
	b.drop_at(Vector2(470, 5))
	eq(J.S.items, before, "放在空白處也彈回")
	b.close()
	eq((a[2] as UiLock).open, "", "關掉放開介面鎖")
	b.queue_free()
