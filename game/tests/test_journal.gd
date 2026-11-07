## 日記本：事件發生時自動寫一條、拍照、依日期翻頁。
extends TestCase


func _J(r := 0.0) -> Journey:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/journal/"), func() -> float: return r)
	J.new_game()
	return J


func _play(R: StoryRunner, node: String, picks: Array) -> void:
	R.start(node)
	var guard := 0
	while R.is_busy() and guard < 100:
		guard += 1
		match R.waiting:
			"line", "check_done": R.advance()
			"check": R.roll_check()
			"choice":
				var keys := R.current_choice_keys()
				var want: String = picks.pop_front()
				for i in keys.size():
					if keys[i].contains(want):
						R.choose(i)
						break


func test_entries_on_events() -> void:
	var J := _J()
	var R := StoryRunner.new(J, StoryRunner.load_nodes("res://data/story/opening.json"), OpeningActions.table())
	_play(R, "dinner", ["truth", "50k"])
	var keys: Array = J.S.diary.map(func(e): return e.key)
	ok(keys.has("diary.decided"), "決定出國寫一條：%s" % str(keys))
	ok(keys.has("diary.funds"), "旅費寫一條")
	J.S.day = 1
	J.until(18)
	OpeningActions.friend_dinner(J, true)
	ok(J.S.diary.any(func(e): return e.key == "diary.friend_good"), "朋友吃飯寫一條")
	SaveStore.remove_dir("user://test_saves/journal/")


func test_take_photo() -> void:
	var J := _J()
	var b := J.S.battery
	Rules.apply([{"photo": "window"}], J)
	eq(J.S.photos.size(), 1, "拍了一張")
	eq(J.S.photos[0].spot, "window", "窗外")
	eq(J.S.photos[0].tod, TimeUtil.tod(J.S.h), "記下時段，日記本照這個打光")
	eq(J.S.battery, b - 2, "拍照耗電 2%")
	SaveStore.remove_dir("user://test_saves/journal/")


func test_pages_by_day() -> void:
	var J := _J()
	J.S.diary = [{"day": 0, "key": "diary.funds", "args": {"amount": 1}}, {"day": 2, "key": "diary.departed", "args": {}}]
	J.S.photos = [{"day": 2, "spot": "window", "tod": "night"}]
	var pages := JournalEntries.pages(J.S)
	eq(pages.size(), 2, "有內容的日子才有一頁")
	eq(pages[1].day, 2, "照日期排")
	eq(pages[1].photos.size(), 1, "照片放在當天那頁")
	SaveStore.remove_dir("user://test_saves/journal/")


func test_journal_ui_one_at_a_time() -> void:
	var J := _J()
	J.S.diary = [{"day": 0, "key": "diary.funds", "args": {"amount": 1}}]
	var ui := UiLock.new()
	var jr := Journal.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(jr)
	jr.setup(J, ui)
	ui.request("phone")
	ok(not jr.open(), "手機開著不能開日記本")
	ui.release("phone")
	ok(jr.open(), "可以開")
	eq(ui.open, "journal", "日記本佔住介面")
	jr.close()
	eq(ui.open, "", "闔上放開")
	jr.queue_free()
	SaveStore.remove_dir("user://test_saves/journal/")


func test_entry_text_translates_key_args() -> void:
	TranslationServer.set_locale("zh_TW")
	var s := JournalEntries.text({"day": 0, "key": "diary.wrote", "args": {"where": "home.place.bedroom"}})
	ok(s.contains(TranslationServer.translate("home.place.bedroom")), "地點代號要翻譯：" + s)
	ok(not s.contains("home.place"), "不能露出代號：" + s)
