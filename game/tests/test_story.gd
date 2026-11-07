## StoryRunner：台詞、選項、判定、開介面的流程。
extends TestCase

var _lines: Array = []
var _choices: Array = []
var _checks: Array = []
var _results: Array = []
var _opens: Array = []
var _done := 0


func _runner(nodes: Dictionary, r := 0.5) -> StoryRunner:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/story/"), func() -> float: return r)
	J.new_game()
	J.S.card = 1000
	var R := StoryRunner.new(J, nodes)
	R.line.connect(func(who, text): _lines.append([who, text]))
	R.choices.connect(func(list): _choices.append(list))
	R.check_started.connect(func(info): _checks.append(info))
	R.check_resolved.connect(func(res): _results.append(res))
	R.open_ui.connect(func(kind, arg): _opens.append(kind))
	R.finished.connect(func(): _done += 1)
	return R


const TWO := {"a": {"lines": [{"who": "mom", "text": "ui.app.name"}, {"who": "me", "text": "ui.app.name"}],
	"choices": [{"text": "ui.app.name", "effects": [{"pay": 100}], "goto": "b"}, {"text": "ui.app.name"}]},
	"b": {"lines": [{"who": "me", "text": "ui.app.name"}]}}


func test_lines_then_choices() -> void:
	var R := _runner(TWO)
	ok(R.start("a"), "開始")
	eq(_lines.size(), 1, "先出第一句")
	eq(_choices.size(), 0, "還沒有選項")
	R.advance()
	eq(_lines.size(), 2, "第二句")
	R.advance()
	eq(_choices.size(), 1, "說完才出選項")
	eq(_choices[0].size(), 2, "兩個選項")
	ok(R.is_busy(), "對話中")
	ok(not R.start("b"), "對話中不能開別的節點")


func test_choice_effects_once() -> void:
	var R := _runner(TWO)
	R.start("a")
	R.advance()
	R.advance()
	R.choose(0)
	R.choose(0)
	eq(R.J.S.card, 900, "只付一次")
	R.advance()
	eq(_done, 1, "b 說完結束")
	ok(not R.is_busy(), "結束後不忙")


func test_check_flow() -> void:
	var nodes := {"c": {"lines": [{"who": "me", "text": "ui.app.name"}],
		"check": {"attr": "empathy", "bonus": 0, "text": "ui.app.name", "win": "w", "lose": "l"}},
		"w": {"on_enter": [{"flag": "won"}]}, "l": {"on_enter": [{"flag": "lost"}]}}
	var R := _runner(nodes, 0.0)
	R.start("c")
	R.advance()
	eq(_checks.size(), 1, "判定開始")
	eq(_checks[0].chance, Checks.chance(R.J, "empathy"), "成功率")
	R.roll_check()
	ok(_results[0].win, "擲 1 一定成功")
	eq(R.waiting, "check_done", "結果出來，等玩家看完")
	ok(not R.J.S.flags.has("won"), "還沒進下一個節點")
	R.advance()
	ok(R.J.S.flags.has("won"), "按一下走 win")
	var R2 := _runner(nodes, 0.99)
	R2.start("c")
	R2.advance()
	R2.roll_check()
	R2.advance()
	ok(R2.J.S.flags.has("lost"), "擲 100 走 lose")


func test_open_ui_and_unknown_effect() -> void:
	var nodes := {"o": {"on_enter": [{"nope": 1}, {"open": "phone", "arg": "trip"}, {"flag": "after"}]}}
	var R := _runner(nodes)
	R.start("o")
	eq(_opens, ["phone"], "發出開手機")
	ok(R.J.S.flags.has("after"), "未知效果略過，不當機")


func test_graph() -> void:
	TranslationServer.set_locale("zh_TW")
	var nodes := StoryRunner.load_nodes("res://data/story/opening.json")
	ok(nodes.size() > 0, "劇情檔有內容")
	for id in nodes:
		var n: Dictionary = nodes[id]
		for c in n.get("choices", []):
			if c.has("goto"):
				ok(nodes.has(c.goto), "%s → %s" % [id, c.goto])
		if n.has("goto"):
			ok(nodes.has(n.goto), "%s → %s" % [id, n.goto])
		for b in n.get("branch", []):
			ok(nodes.has(b.goto), "%s 分支 → %s" % [id, b.goto])
		if n.has("check"):
			ok(nodes.has(n.check.win) and nodes.has(n.check.lose), "%s 的判定去處" % id)
		for t in StoryRunner.text_keys(n):
			ok(TranslationServer.translate(t) != t, "%s 的文字代號沒有翻譯：%s" % [id, t])


func test_branch_picks_first_match() -> void:
	var nodes := {"b": {"lines": [{"who": "me", "text": "ui.app.name"}],
		"branch": [{"when": {"flag": "night"}, "goto": "n"}, {"goto": "d"}]},
		"n": {"on_enter": [{"flag": "went_n"}]}, "d": {"on_enter": [{"flag": "went_d"}]}}
	var R := _runner(nodes)
	R.start("b")
	R.advance()
	ok(R.J.S.flags.has("went_d"), "沒有 night 旗標走最後一條")
	var R2 := _runner(nodes)
	R2.J.S.flags["night"] = 1
	R2.start("b")
	R2.advance()
	ok(R2.J.S.flags.has("went_n"), "有旗標走第一條")


func test_current_choice_keys() -> void:
	var R := _runner(TWO)
	R.start("a")
	R.advance()
	R.advance()
	eq(R.current_choice_keys(), ["ui.app.name", "ui.app.name"], "選項的文字代號")
