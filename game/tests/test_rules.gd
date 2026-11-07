## 劇情小語言：條件、效果、文字（照網頁版「條件和效果的小語言」移植）。
extends TestCase


func _J() -> Journey:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/rules/"), func() -> float: return 0.5)
	J.new_game()
	return J


func test_effects() -> void:
	var J := _J()
	J.S.card = 1000
	Rules.apply([{"add": {"faith": 5, "eng": 1}}, {"flag": "x"}, {"know": "k_lcc"}, {"set": {"cs": "jay"}}, {"pay": 100}], J)
	eq(J.S.faith, 60, "信念 +5")
	eq(J.S.eng, 3, "英語 +1")
	eq(J.S.card, 900, "付 100")
	eq(J.S.cs, "jay", "set")
	ok(J.knows("k_lcc"), "學到知識")
	SaveStore.remove_dir("user://test_saves/rules/")


func test_conditions() -> void:
	var J := _J()
	Rules.apply([{"flag": "x"}, {"know": "k_lcc"}, {"set": {"cs": "jay"}}], J)
	ok(Rules.test([{"flag": "x"}, {"know": "k_lcc"}, {"is": {"cs": "jay"}}, {"faith": {"gte": 55}}, {"attr": "nerve", "lt": 2}], J), "陣列＝全部成立")
	ok(Rules.test({"not": {"is": {"trans": "land"}}}, J), "not 和 null 比較")
	ok(Rules.test({"any": [{"flag": "nope"}, {"no_flag": "nope"}]}, J), "any")
	ok(not Rules.test({"hour": {"lt": 20}}, J), "22 點不小於 20")
	ok(Rules.test({"v": "cabin_kg", "lt": 7}, J), "計算值")
	ok(Rules.test(null, J), "沒有條件就成立")
	SaveStore.remove_dir("user://test_saves/rules/")


func test_bad_set_is_refused() -> void:
	var J := _J()
	J.S.card = 10
	Rules.apply([{"set": {"card": 99999}}, {"flag": "after"}], J)
	eq(J.S.card, 10, "不能用 set 改錢")
	ok(J.S.flags.has("after"), "壞掉的效果略過，後面的照做")
	SaveStore.remove_dir("user://test_saves/rules/")


func test_fill_placeholders() -> void:
	TranslationServer.set_locale("zh_TW")
	var J := _J()
	var s := Rules.fill("ui.test.format", J, {"amount": 3})
	ok(s.contains("3") and not s.contains("{"), "佔位符：" + s)
	SaveStore.remove_dir("user://test_saves/rules/")


func test_check_chance_formula() -> void:
	var J := _J()
	# 25 + 1*10 + round((2-2)*5) + round((55-50)/5) = 36
	eq(Checks.chance(J, "empathy"), 36, "網頁版 chanceOf 的公式")
	J.S.attr["empathy"] = 10
	J.S.eng = 10
	J.S.faith = 100
	eq(Checks.chance(J, "empathy", 50), 95, "上限 95")
	SaveStore.remove_dir("user://test_saves/rules/")
