## 存檔讀檔：睡前寫日記 → 讀檔回到床邊，旅行知識保留。
extends TestCase


func test_diary_save_resume() -> void:
	var store := SaveStore.new("user://test_saves/sl/")
	var J := Journey.new(DataDB.load_all(), store, func() -> float: return 0.0)
	J.new_game()
	OpeningActions.start_funds(J, 50000)
	var R := StoryRunner.new(J, StoryRunner.load_nodes("res://data/story/opening.json"), OpeningActions.table())
	R.start("bed.night")
	R.advance()
	R.advance()
	R.choose(0)
	eq(J.S.resume, "bed", "存檔標記回到床邊")
	var day := J.S.day
	J.S.card = 1
	J.learn("k_taxi")
	J.S.resume = "somewhere"
	var ui := UiLock.new()
	ui.request("phone")
	ok(J.load("diary"), "讀檔")
	ui.clear()
	eq(J.S.card, 50000, "錢回到存檔時")
	eq(J.S.resume, "bed", "回到床邊")
	ok(J.S.know.has("k_taxi"), "知識保留")
	eq(ui.open, "", "介面全部關掉")
	ok(J.S.day <= day, "時間回到存檔時")
	SaveStore.remove_dir("user://test_saves/sl/")


func test_clear_all() -> void:
	var store := SaveStore.new("user://test_saves/sl2/")
	var J := Journey.new(DataDB.load_all(), store)
	J.new_game()
	J.learn("k_lcc")
	J.save("diary", "home.place.bedroom")
	J.clear_all()
	eq(J.slot("diary"), null, "日記清掉")
	eq(J.meta.know.size(), 0, "知識清掉")
	var J2 := Journey.new(DataDB.load_all(), store)
	eq(J2.meta.know.size(), 0, "重開也是空的")
	SaveStore.remove_dir("user://test_saves/sl2/")
