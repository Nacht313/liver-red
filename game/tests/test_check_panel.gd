## 判定欄：從右邊滑進來、擲骰、顯示結果、滑出去。
extends TestCase

const INFO := {"attr": "empathy", "level": 2, "chance": 55, "text": "Inner voice."}
var _rolls := 0
var _done := 0


func _panel() -> CheckPanel:
	var p := CheckPanel.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(p)
	p.roll_requested.connect(func(): _rolls += 1)
	p.done.connect(func(): _done += 1)
	return p


func test_slides_in_and_out() -> void:
	var p := _panel()
	eq(p.panel_x(), 480.0, "一開始在畫面外")
	p.show_check(INFO)
	p.finish_anim()
	eq(p.panel_x(), 288.0, "滑進來佔右邊 40%")
	p.show_result({"roll": 30, "win": true, "crit": false, "chance": 55})
	p.finish_anim()
	p.confirm()
	p.finish_anim()
	eq(p.panel_x(), 480.0, "看完結果滑出去")
	eq(_done, 1, "通知劇情繼續")
	p.queue_free()


func test_confirm_asks_for_roll_once() -> void:
	var p := _panel()
	p.show_check(INFO)
	p.finish_anim()
	p.confirm()
	p.confirm()
	eq(_rolls, 1, "連按只擲一次")
	p.queue_free()


func test_cancel_ignored_while_rolling() -> void:
	var p := _panel()
	p.show_check(INFO)
	p.finish_anim()
	p.confirm()
	p.show_result({"roll": 80, "win": false, "crit": false, "chance": 55})
	ok(p.is_rolling(), "骰子在轉")
	ok(not p.cancel(), "擲骰中按取消沒有作用")
	p.confirm()
	eq(_done, 0, "骰子還在轉，確認也不會關")
	p.queue_free()


func test_result_matches_roll() -> void:
	TranslationServer.set_locale("zh_TW")
	var p := _panel()
	p.show_check(INFO)
	p.finish_anim()
	p.show_result({"roll": 80, "win": false, "crit": false, "chance": 55})
	p.finish_anim()
	ok(p.result_text().contains(TranslationServer.translate("ui.check.fail")), "顯示失敗：" + p.result_text())
	ok(p.result_text().contains("80"), "顯示擲出的數字")
	p.queue_free()
