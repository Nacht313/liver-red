## Undertale 式對話框：逐字顯示、翻頁、選項、連按不出錯。
extends TestCase

var _next := 0
var _picked: Array = []


func _box() -> DialogueBox:
	var b := DialogueBox.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(b)
	b.next_requested.connect(func(): _next += 1)
	b.choice_made.connect(func(i): _picked.append(i))
	return b


func test_typewriter_then_next() -> void:
	var b := _box()
	b.show_line("me", "第十一封拒信。")
	ok(b.is_typing(), "一開始在逐字顯示")
	b.skip_or_next()
	ok(not b.is_typing(), "按一下：整句出來")
	eq(_next, 0, "還沒要求下一句")
	b.skip_or_next()
	eq(_next, 1, "再按一下：下一句")
	b.queue_free()


func test_mash_does_not_skip_choices() -> void:
	var b := _box()
	b.show_choices([{"text": "A", "sub": "", "why": ""}, {"text": "B", "sub": "", "why": ""}])
	for i in 10:
		b.skip_or_next()
	eq(_picked.size(), 0, "連按確認以外的鍵不會選到選項")
	eq(_next, 0, "選項出現時不會跳到下一句")
	b.move(1)
	b.confirm()
	eq(_picked, [1], "移到第二個再確認")
	b.queue_free()


func test_disabled_choice_cannot_be_confirmed() -> void:
	var b := _box()
	b.show_choices([{"text": "A", "sub": "", "why": "no"}, {"text": "B", "sub": "", "why": ""}])
	b.confirm()
	eq(_picked, [1], "游標自動跳過不能選的，確認選到 B")
	b.queue_free()


func test_long_text_pages() -> void:
	var b := _box()
	var long := "The immigration officer turned your passport to the very last page and looked up at you for a long time. ".repeat(3)
	b.show_line("me", long)
	ok(b.page_count() >= 2, "長句要分頁：%d 頁" % b.page_count())
	for i in b.page_count():
		ok(b.lines_on_page(i) <= DialogueBox.LINES, "第 %d 頁不超過 %d 行" % [i, DialogueBox.LINES])
	for i in b.page_count():
		b.skip_or_next()  # 出完這一頁
		if i < b.page_count() - 1:
			b.skip_or_next()  # 翻到下一頁
	eq(_next, 0, "最後一頁之前不會要求下一句")
	b.skip_or_next()
	eq(_next, 1, "全部看完才下一句")
	b.queue_free()


func test_many_choices_fit_in_box() -> void:
	var b := _box()
	var list := []
	for i in 5:
		list.append({"text": "Choice %d" % i, "sub": "", "why": ""})
	b.show_choices(list)
	ok(b.frame_rect().size.y >= 5 * DialogueBox.ROW_H + 10, "五個選項時框會長高：%s" % b.frame_rect())
	ok(b.frame_rect().end.y <= 268, "框不超出畫面")
	b.queue_free()


func test_narration_has_no_portrait_gap() -> void:
	var b := _box()
	b.speakers = {"narr": {"no_portrait": 1}, "me": {}}
	b.show_line("narr", "Text")
	ok(b.text_x() < 30, "旁白從左邊開始：%s" % b.text_x())
	b.show_line("me", "Text")
	ok(b.text_x() > 60, "有頭像時讓出位置")
	b.queue_free()


func test_no_next_while_checking() -> void:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/dlg/"), func() -> float: return 0.0)
	J.new_game()
	var R := StoryRunner.new(J, {"c": {"lines": [{"who": "me", "text": "ui.app.name"}],
		"check": {"attr": "nerve", "text": "ui.app.name", "win": "w", "lose": "w"}}, "w": {"on_enter": [{"flag": "went"}]}})
	var b := _box()
	b.bind(R)
	R.start("c")
	b.skip_or_next()
	b.skip_or_next()
	eq(R.waiting, "check", "台詞看完，等判定")
	R.roll_check()
	b.skip_or_next()
	b.skip_or_next()
	ok(not J.S.flags.has("went"), "判定結果還在顯示，對話框不能往下推")
	SaveStore.remove_dir("user://test_saves/dlg/")
	b.queue_free()


func test_box_hides_during_check() -> void:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/dlg2/"), func() -> float: return 0.0)
	J.new_game()
	var R := StoryRunner.new(J, {"c": {"lines": [{"who": "me", "text": "ui.app.name"}],
		"choices": [{"text": "ui.app.name", "check": {"attr": "nerve", "text": "ui.app.name", "win": "w", "lose": "w"}}]},
		"w": {"lines": [{"who": "me", "text": "ui.app.name"}]}})
	var b := _box()
	b.bind(R)
	R.start("c")
	b.skip_or_next()
	b.skip_or_next()
	b.confirm()
	ok(not b.visible, "判定時對話框收起來")
	R.roll_check()
	R.advance()
	ok(b.visible, "判定後的台詞出現")
	SaveStore.remove_dir("user://test_saves/dlg2/")
	b.queue_free()
