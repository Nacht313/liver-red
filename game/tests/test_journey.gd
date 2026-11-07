## 旅程規則（照網頁版 tests/unit/journey.test.js 逐項移植）。
extends TestCase

var _dirs: Array[String] = []


func _store() -> SaveStore:
	var d := "user://test_saves/%d_%d/" % [Time.get_ticks_usec(), randi()]
	_dirs.append(d)
	return SaveStore.new(d)


func _fresh(store: SaveStore = null) -> Journey:
	var J := Journey.new(DataDB.load_all(), store if store else _store(), func() -> float: return 0.5)
	J.new_game()
	return J


func _notification(what: int) -> void:
	if what == NOTIFICATION_PREDELETE:
		for d in _dirs:
			SaveStore.remove_dir(d)


func test_clock_and_date() -> void:
	eq(TimeUtil.clock(22.5), "22:30", "22.5 點")
	eq(TimeUtil.clock(7.999), "08:00", "進位")
	eq(TimeUtil.date_str(0, true), "6/28", "第 0 天")
	eq(TimeUtil.date_str(3, true), "7/1", "跨月")
	eq(TimeUtil.hours_to_next_seg(9), 4, "9 點到 13 點")
	eq(TimeUtil.hours_to_next_seg(23.5), 0, "最後一段之後")
	eq(TimeUtil.tod(18), "dusk", "傍晚")
	TranslationServer.set_locale("zh_TW")
	ok(TimeUtil.date_str(0).contains("星期"), "長格式有星期：" + TimeUtil.date_str(0))


func test_lock_floor_50_and_stock_exception() -> void:
	var J := _fresh()
	J.lock("dirty", "faith", 20, "lock.dirty.how")
	eq(J.cap("faith"), 50, "最低 50")
	J.lock("stockLoss", "faith", 1, "lock.stock.how")
	eq(J.cap("faith"), 1, "股票例外到 1")
	eq(J.S.faith, 1, "數值被壓到上限")
	J.unlock("stockLoss")
	eq(J.cap("faith"), 50, "解鎖後回到 50")


func test_family_pressure_locks_faith() -> void:
	var J := _fresh()
	J.S.family = 100
	J.check_locks()
	eq(J.cap("faith"), 75, "家人壓力鎖")
	J.unlock("family")
	eq(J.cap("faith"), 100, "視訊解鎖")


func test_pay_card_first_then_cash_and_money_ends() -> void:
	var J := _fresh()
	J.S.card = 100
	J.S.cny = 50
	J.pay_cny(120)
	eq(J.S.card, 0, "卡刷光")
	eq(J.S.cny, 30, "現金補差額")
	eq(J.S.over, false, "還沒結束")
	J.pay_cny(30)
	eq(J.S.over, true, "錢歸零結束")
	eq(J.S.ending, "money", "結局種類")


func test_pay_thb_falls_back_to_card() -> void:
	var J := _fresh()
	J.S.card = 1000
	J.S.thb = 100
	J.pay_thb(555)
	eq(J.S.thb, 0, "泰銖用完")
	eq(J.S.card, 900, "455 銖 ÷ 4.55 = 100 元")


func test_home_keeps_fed_abroad_gets_hungry_and_dirty() -> void:
	var J := _fresh()
	J.S.food = 50
	J.advance(3)
	ok(J.S.food >= 80 - 1e-6, "在家飽食拉到 80")
	J.S.loc = "abroad"
	var f := J.S.food
	var h := J.S.hyg
	J.advance(3)
	ok(J.S.food < f, "出門會餓")
	ok(J.S.hyg < h, "出門會髒")


func test_energy_zero_ends() -> void:
	var J := _fresh()
	J.S.energy = 1
	J.advance(2, {"tiring": 4})
	eq(J.S.ending, "tired", "精力歸零")


func test_sleep_next_day_and_thought_cabinet() -> void:
	var J := _fresh()
	J.S.h = 23
	J.S.energy = 30
	J.sleep("home")
	eq(J.S.day, 1, "跨日")
	eq(J.S.h, 7.5, "07:30 起床")
	eq(J.S.energy, 95, "在家睡滿")
	eq(J.S.thoughts[0]["got"], 1, "思想消化一天")
	J.sleep("home")
	J.sleep("home")
	eq(J.S.attr["nerve"], 2, "消化完膽識 +1")


func test_parcels_arrive_at_locker_after_two_days() -> void:
	var J := _fresh()
	J.S.orders.append({"id": "belt", "arrive": 2})
	J.S.h = 23
	J.sleep("home")
	ok(not J.S.orders[0].get("arrived", false), "第一天還沒到")
	J.sleep("home")
	ok(J.S.orders[0].get("arrived", false), "第二天到快遞櫃")
	ok(not J.S.items.has("belt"), "還沒去拿，不在家裡")


func test_knowledge_survives_runs() -> void:
	var store := _store()
	var J := _fresh(store)
	ok(J.learn("k_lcc"), "第一次學到")
	var J2 := _fresh(store)
	ok(J2.S.know.has("k_lcc"), "下一輪記得")
	ok(not J.learn("k_lcc"), "學過就不算新的")


func test_load_restores_state_but_keeps_new_knowledge() -> void:
	var J := _fresh()
	J.S.card = 5000
	J.save("diary", "home.place.bedroom")
	J.S.card = 1
	J.learn("k_taxi")
	J.end("money")
	ok(J.load("diary"), "讀得到日記")
	eq(J.S.card, 5000, "回到存檔的錢")
	eq(J.S.over, false, "結局清掉")
	ok(J.S.know.has("k_taxi"), "之後學到的還記得")
	eq(J.slot("diary")["label"]["where"], "home.place.bedroom", "存檔標籤用代號")


func test_state_round_trip() -> void:
	var J := _fresh()
	J.S.flags["x"] = 1
	J.S.items["laptop"] = "mid"
	var copy := JourneyState.from_dict(J.S.to_dict())
	eq(copy.to_dict(), J.S.to_dict(), "轉字典再轉回來不變")
