## 手機：App 的頁面和動作（不開視窗也能測），以及「一次只開一個介面」。
extends TestCase

var J: Journey
var _dir := ""


func _setup() -> void:
	_dir = "user://test_saves/phone_%d/" % Time.get_ticks_usec()
	J = Journey.new(DataDB.load_all(), SaveStore.new(_dir), func() -> float: return 0.0)
	J.new_game()
	OpeningActions.start_funds(J, 50000)
	J.S.day = 1
	J.S.h = 9


func _notification(what: int) -> void:
	if what == NOTIFICATION_PREDELETE and _dir != "":
		SaveStore.remove_dir(_dir)


func _row(page: Dictionary, needle: String) -> Dictionary:
	for r in page.rows:
		if str(r.text).contains(needle) or JSON.stringify(r.get("act", {})).contains(needle):
			return r
	ok(false, "頁面 %s 找不到 %s" % [page.get("title", "?"), needle])
	return {}


func test_book_from_trip_app() -> void:
	_setup()
	J.S.dest = "bkk"
	var p := PhoneApps.page(J, "trip", null)
	var r := _row(p, "\"fsc\"")
	var res := PhoneApps.act(J, r.act)
	eq(res.go, ["trip_date", "fsc"], "進到選日期")
	var p2 := PhoneApps.page(J, "trip_date", "fsc")
	PhoneApps.act(J, _row(p2, "\"days\":5").act)
	eq(J.S.trans, "fsc", "訂了全服務航空")
	eq(J.S.dep, J.S.day + 5, "五天後出發")


func test_trip_needs_destination() -> void:
	_setup()
	var p := PhoneApps.page(J, "trip", null)
	ok(not JSON.stringify(p.rows).contains("trip_date"), "沒選第一站不能訂交通")


func test_map_only_bangkok_open() -> void:
	_setup()
	var p := PhoneApps.page(J, "map", null)
	for r in p.rows:
		var id: String = r.act.get("city", "")
		if id == "bkk":
			eq(r.why, "", "曼谷可以選")
		elif id != "":
			ok(r.why != "", "%s 還不能去" % id)
	PhoneApps.act(J, _row(p, "\"bkk\"").act)
	eq(J.S.dest, "bkk", "選了曼谷")


func test_research_teaches() -> void:
	_setup()
	var r := _row(PhoneApps.page(J, "web", null), "r_entry")
	var res := PhoneApps.act(J, r.act)
	ok(J.knows("k_tdac"), "學到 TDAC")
	eq(res.go[0], "web_article", "打開文章")
	ok(_row(PhoneApps.page(J, "web", null), "r_entry").why != "", "查過了")


func test_shop_and_cs() -> void:
	_setup()
	PhoneApps.act(J, _row(PhoneApps.page(J, "shop", null), "\"belt\"").act)
	eq(J.S.orders.size(), 1, "下單")
	J.S.dest = "bkk"
	OpeningActions.book_trans(J, "fsc", 5, 1.0, false)
	PhoneApps.act(J, _row(PhoneApps.page(J, "cs", null), "\"jay\"").act)
	eq(J.S.cs, "jay", "Jay 秒回")
	var pim := _row(PhoneApps.page(J, "cs", null), "\"pim\"")
	PhoneApps.act(J, pim.act)
	ok(_row(PhoneApps.page(J, "cs", null), "\"pim\"").why != "", "問過 Pim 了")


func test_battery_drain_phone_vs_pc() -> void:
	_setup()
	var ui := UiLock.new()
	var ph := Phone.new()
	ph.setup(J, ui)
	var b := J.S.battery
	ok(ph.open("home"), "打開手機")
	ph.go("web", null)
	eq(J.S.battery, b - 1, "手機開 App 耗 1%")
	ph.close()
	ok(ph.open("home", null, true), "用電腦")
	ph.go("web", null)
	eq(J.S.battery, b - 1, "用電腦不耗手機電")
	ph.close()
	ph.free()


func test_only_one_ui() -> void:
	_setup()
	var ui := UiLock.new()
	var ph := Phone.new()
	ph.setup(J, ui)
	ui.request("journal")
	ok(not ph.open("home"), "日記本開著不能開手機")
	ui.release("journal")
	ok(ph.open("home"), "關了就可以")
	eq(ui.open, "phone", "手機佔住介面")
	ph.close()
	eq(ui.open, "", "關手機放開")
	ph.free()


func test_every_page_is_translated() -> void:
	TranslationServer.set_locale("zh_TW")
	_setup()
	var key := RegEx.create_from_string("\\b[a-z_]+\\.[a-z_0-9]+(\\.[a-z_0-9]+)*\\b")
	var check := func(p: Dictionary, name: String):
		var texts := [p.title]
		for b in p.blocks:
			if b.has("text"):
				texts.append(b.text)
		for r in p.rows:
			texts.append_array([r.text, r.sub, r.right, r.why])
		for s in texts:
			var m := key.search(str(s))
			ok(m == null, "%s 有沒翻譯的代號：%s" % [name, m.get_string() if m else ""])
	J.S.dest = "bkk"
	J.push_msg()
	OpeningActions.buy_item(J, "belt")
	for app in ["home", "map", "web", "trip", "hotel", "cs", "shop", "chat", "immig", "bank", "photos"]:
		check.call(PhoneApps.page(J, app, null), app)
	check.call(PhoneApps.page(J, "trip_date", "lcc"), "trip_date")
	check.call(PhoneApps.page(J, "hotel_nights", "hostel"), "hotel_nights")
	check.call(PhoneApps.page(J, "chat_msg", 0), "chat_msg")
	check.call(PhoneApps.page(J, "web_article", {"id": "r_entry", "old": true, "nag": true}), "web_article")
	OpeningActions.book_trans(J, "lcc", 5, 1.0, false)
	OpeningActions.book_stay(J, "hostel", 1)
	for app in ["trip", "hotel", "cs", "immig"]:
		check.call(PhoneApps.page(J, app, null), app + "（訂好之後）")
