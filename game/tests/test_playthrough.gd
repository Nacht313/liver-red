## 自動試玩：直接驅動劇情執行器和開場動作，從開頭玩到下樓出發。
extends TestCase

var R: StoryRunner
var J: Journey
var opened: Array = []
var _dir := ""


func _setup(r := 0.0, funds := "") -> void:
	_dir = "user://test_saves/play_%d/" % Time.get_ticks_usec()
	J = Journey.new(DataDB.load_all(), SaveStore.new(_dir), func() -> float: return r)
	J.new_game()
	R = StoryRunner.new(J, StoryRunner.load_nodes("res://data/story/opening.json"), OpeningActions.table())
	R.open_ui.connect(func(kind, _arg): opened.append(kind))
	if funds != "":
		play("intro")
		play("obj.table", ["truth", funds])


func _notification(what: int) -> void:
	if what == NOTIFICATION_PREDELETE and _dir != "":
		SaveStore.remove_dir(_dir)


## 跑一個節點：台詞自動往下，遇到選項依序選 picks 裡的文字代號（包含就算），判定自動擲骰
func play(node: String, picks: Array = []) -> void:
	ok(R.start(node), "開始 " + node)
	var guard := 0
	while R.is_busy() and guard < 200:
		guard += 1
		match R.waiting:
			"line":
				R.advance()
			"check":
				R.roll_check()
			"check_done":
				R.advance()
			"choice":
				if picks.is_empty():
					ok(false, "%s 需要選項，但沒有指定：%s" % [R.cur_id, str(R.current_choice_keys())])
					return
				var want: String = picks.pop_front()
				var keys := R.current_choice_keys()
				var i := -1
				for k in keys.size():
					if keys[k].contains(want):
						i = k
						break
				ok(i >= 0, "%s 找不到選項 %s：%s" % [R.cur_id, want, str(keys)])
				if i < 0:
					return
				R.choose(i)


func sleep_until(day: int) -> void:
	var guard := 0
	while J.S.day < day and not J.S.over and guard < 30:
		guard += 1
		J.until(22.5)
		play("obj.bed", ["sleep"])


func test_intro_to_morning() -> void:
	_setup(0.0, "50k")
	eq(J.S.card, 50000, "爸媽給的錢")
	ok(J.S.flags.has("funded"), "選好旅費")
	play("obj.bed", ["sleep"])
	eq(J.S.day, 1, "隔天")
	eq(J.S.h, 7.5, "07:30")
	ok("day_card" in opened, "早上出現日期卡")
	ok(J.slot("diary") != null, "睡前寫日記存檔")


func test_full_prep_to_departure() -> void:
	_setup(0.0, "50k")
	play("obj.bed", ["sleep"])
	OpeningActions.research(J, "r_entry")
	ok(J.knows("k_funds"), "查資料學到入境資金")
	ok(OpeningActions.book_trans(J, "fsc", 5, 1.0, false), "訂全服務航空")
	eq(J.S.dep, J.S.day + 5, "五天後出發")
	ok(OpeningActions.book_stay(J, "hostel", 1), "訂青旅 3 晚")
	J.until(9)
	play("obj.front_door", ["bank", "exchange"])
	ok(J.S.thb > 0, "換到泰銖")
	var guard := 0
	while J.S.day < J.S.dep and guard < 10:
		guard += 1
		if not J.S.tdac:
			OpeningActions.errand(J, "tdac")
		sleep_until(J.S.day + 1)
	ok(J.S.tdac, "TDAC 在可以填的時候填了")
	eq(J.S.day, J.S.dep, "到了出發日")
	play("obj.exit")
	ok(J.S.flags.has("departed"), "下樓出發")
	ok("end_card" in opened, "結尾卡")
	ok(J.meta.know.has("k_funds"), "知識存進跨輪紀錄")


func test_not_yet_time_at_exit() -> void:
	_setup(0.0, "50k")
	play("obj.exit")
	ok(not J.S.flags.has("departed"), "沒訂票不能出發")


func test_parcel_pickup() -> void:
	_setup(0.0, "50k")
	play("obj.bed", ["sleep"])
	ok(OpeningActions.buy_item(J, "lock"), "買掛鎖")
	sleep_until(J.S.day + 2)
	ok(not J.S.items.has("lock"), "到了也還在快遞櫃")
	play("obj.locker")
	eq(J.S.items.get("lock"), "home", "去快遞櫃拿回來")


func test_missed_departure() -> void:
	_setup(0.0, "50k")
	play("obj.bed", ["sleep"])
	OpeningActions.book_trans(J, "fsc", 2, 1.25, false)
	var dep: int = J.S.dep
	sleep_until(dep + 1)
	eq(J.S.trans, null, "票作廢")
	ok(J.S.flags.has("missed"), "記得錯過了")


func test_money_runs_out_mid_phone() -> void:
	_setup(0.0, "10k")
	var ui := UiLock.new()
	ui.follow_endings(J)
	ui.request("phone")
	for id in ["camera", "gopro", "uke", "tent", "sleepbag", "camera"]:
		J.S.orders = J.S.orders.filter(func(o): return o.id != id)
		J.S.items.erase(id)
		OpeningActions.buy_item(J, id)
	var guard := 0
	while not J.S.over and guard < 20:
		guard += 1
		J.S.orders.clear()
		J.S.items.erase("camera")
		OpeningActions.buy_item(J, "camera")
	ok(J.S.over, "錢花光")
	eq(J.S.ending, "money", "結局：錢花完")
	ok(ui.can_move(), "結局時介面全部關掉")


func test_friend_dinner_check() -> void:
	_setup(0.0, "50k")
	play("obj.bed", ["sleep"])
	J.until(18)
	var f := J.S.faith
	play("obj.front_door", ["friend"])
	ok(J.S.flags.has("friend"), "吃過飯了")
	ok(J.S.faith > f, "判定成功信念增加")
	ok(J.S.attr["empathy"] == 2, "共情 +1")
