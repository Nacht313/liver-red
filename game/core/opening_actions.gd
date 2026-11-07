## 開場（在家準備出發）的規則：網購、訂票訂房、查資料、銀行、手續、朋友吃飯、讀書、快遞櫃、出發。
## 照網頁版 src/story/opening/actions.js 和 screens-*.js 的選項行為。劇情節點用 { "do": 名稱 } 呼叫 table() 裡的動作；
## 手機 App 直接呼叫這些靜態函式。
class_name OpeningActions
extends RefCounted


static func table() -> Dictionary:
	return {
		"start_funds": func(J, e): start_funds(J, int(e.n)),
		"rest": func(J, _e): rest(J),
		"bank_exchange": func(J, _e): bank_exchange(J),
		"bank_withdraw": func(J, _e): bank_withdraw(J),
		"friend_dinner": func(J, e): friend_dinner(J, bool(e.won)),
		"study": func(J, e): study(J, bool(e.won)),
		"pick_up_parcels": func(J, _e): pick_up_parcels(J),
		"check_missed": func(J, _e): check_missed(J),
		"depart": func(J, _e): depart(J),
		"default_pack": func(J, _e): default_pack(J),
	}


# ---------- 開頭 ----------
static func start_funds(J: Journey, n: int) -> void:
	var S := J.S
	S.card = n
	S.tier = n
	S.day = 0
	S.h = 22.5
	S.start = S.card + S.cny
	S.flags["funded"] = 1
	S.diary.append({"day": 0, "key": "diary.funds", "args": {"amount": n}})


static func rest(J: Journey) -> void:
	J.next_seg()
	J.add("energy", 8)


# ---------- 交通、住宿、手續 ----------
static func arrival_day(J: Journey) -> int:
	var S := J.S
	return 99 if S.dep == null else int(S.dep) + int(J.db.trans[S.trans].arriveDays)


## TDAC 最早抵達前 3 天才能填
static func tdac_open(J: Journey) -> bool:
	var S := J.S
	return S.trans != null and S.dep != null and arrival_day(J) - S.day <= 3 and arrival_day(J) >= S.day


static func book_trans(J: Journey, k: String, days: int, mul: float, bag: bool) -> bool:
	var t: Dictionary = J.db.trans[k]
	J.pay_cny(roundi(float(t.p) * mul) + (int(J.db.c.EXTRA_BAG_ONLINE) if bag else 0))
	if J.S.over:
		return false
	var S := J.S
	S.trans = k
	S.dep = S.day + days
	S.dep_mul = mul
	S.tdac = false
	S.extra_bag = bag
	S.flags.erase("missed")
	J.changed.emit()
	return true


static func stay_price(J: Journey, kind: String, nights_i: int) -> int:
	var n: Array = J.db.nights[nights_i]
	return roundi(float(J.db.stays[kind].p) * float(n[0]) * float(n[1]))


static func book_stay(J: Journey, kind: String, nights_i: int) -> bool:
	if J.S.stay != null:
		return false
	var n: Array = J.db.nights[nights_i]
	var price := stay_price(J, kind, nights_i)
	J.pay_cny(roundi(price / float(J.db.c.FX.THB)))
	if J.S.over:
		return false
	J.S.stay = {"kind": kind, "nights": int(n[0]), "thb": price, "refund": int(n[2]) == 1}
	J.S.cs = null
	J.changed.emit()
	return true


static func cancel_stay(J: Journey) -> bool:
	var st: Variant = J.S.stay
	if st == null or not st.refund:
		return false
	J.S.card += roundi(float(st.thb) / float(J.db.c.FX.THB))
	J.S.stay = null
	J.changed.emit()
	return true


static func errand(J: Journey, kind: String) -> bool:
	var S := J.S
	match kind:
		"ins":
			if S.ins:
				return false
			J.pay_cny(150)
			S.ins = not S.over
		"esim":
			if S.esim:
				return false
			J.pay_cny(45)
			S.esim = not S.over
		"laos":
			if S.laos_visa != null:
				return false
			J.next_seg()
			J.pay_cny(260)
			S.laos_visa = S.day + 3
		"tdac":
			if S.tdac or not tdac_open(J):
				return false
			S.tdac = true
			if S.stay != null:
				S.tdac_addr = "stay." + S.stay.kind + ".name"
			elif S.cs == "jay":
				S.tdac_addr = "tdac.addr.jay"
			else:
				S.tdac_addr = "fake"
			J.add("battery", -3)
			if S.tdac_addr != "fake":
				J.learn("k_tdac")
		_:
			return false
	J.changed.emit()
	return not S.over


# ---------- 網購、快遞櫃 ----------
static func buy_item(J: Journey, id: String) -> bool:
	var S := J.S
	var it: Dictionary = J.db.items[id]
	if not it.has("price") or S.items.has(id) or S.orders.any(func(o): return o.id == id):
		return false
	J.pay_cny(it.price)
	if S.over:
		return false
	S.orders.append({"id": id, "arrive": S.day + 2})
	if float(it.price) >= 1000:
		S.family = clampf(S.family + 8, 0, 100)
		J.push_msg("family.mom", "msg.big_spend")
	J.add("battery", -1)
	J.changed.emit()
	return true


## 到快遞櫃拿已經到的包裹，回傳拿到的物品 id
static func pick_up_parcels(J: Journey) -> Array:
	var got := []
	for o in J.S.orders:
		if o.get("arrived", false) and not o.get("got", false):
			o["got"] = true
			J.S.items[o.id] = "worn" if J.db.items[o.id].get("worn", 0) else "home"
			got.append(o.id)
	if got.is_empty():
		J.S.flags.erase("parcels_got")
	else:
		J.S.flags["parcels_got"] = got.size()
	J.changed.emit()
	return got


# ---------- 查資料 ----------
static func research(J: Journey, id: String) -> Dictionary:
	var S := J.S
	if S.researched.has(id):
		return {}
	var r: Dictionary = {}
	for x in J.db.research:
		if x.id == id:
			r = x
	S.researched.append(id)
	var fresh := []
	for k in r.k:
		if J.learn(k):
			fresh.append(k)
	S.r_today += 1
	S.family = clampf(S.family + 2, 0, 100)
	var nag := S.r_today == 3
	if nag:
		J.push_msg("family.mom", "msg.eyes")
	J.changed.emit()
	return {"fresh": fresh, "old": fresh.size() < r.k.size(), "nag": nag}


# ---------- 出門辦事 ----------
static func bank_exchange(J: Journey) -> void:
	J.next_seg()
	J.S.card -= 1000
	J.S.thb += roundi(1000 * float(J.db.c.BANK_THB_PER_CNY))
	J.changed.emit()


static func bank_withdraw(J: Journey) -> void:
	J.S.card -= 1000
	J.S.cny += 1000
	J.changed.emit()


static func friend_dinner(J: Journey, won: bool) -> void:
	J.pay_cny(120)
	if J.S.over:
		return
	J.S.flags["friend"] = 1
	J.until(22.5)
	if won:
		J.add("faith", 10)
		J.S.attr["empathy"] = mini(10, J.S.attr["empathy"] + 1)
	else:
		J.add("faith", -6)
	J.add("food", 40)
	J.S.diary.append({"day": J.S.day, "key": "diary.friend_good" if won else "diary.friend_bad", "args": {}})


static func study(J: Journey, won: bool) -> void:
	J.next_seg()
	J.S.eng = minf(10, J.S.eng + 0.25)
	if won:
		J.S.attr["knowledge"] = mini(10, J.S.attr["knowledge"] + 1)
	J.add("faith", 2)


# ---------- 出發 ----------
## 睡醒時檢查：出發日已經過了還沒出門，票作廢
static func check_missed(J: Journey) -> void:
	var S := J.S
	S.flags.erase("missed_now")
	if S.dep != null and S.day > int(S.dep) and not S.flags.has("missed"):
		S.flags["missed"] = 1
		S.flags["missed_now"] = 1
		S.flags["missed_loss"] = roundi(float(J.db.trans[S.trans].p) * S.dep_mul)
		S.trans = null
		S.dep = null
		S.tdac = false


## 下樓出發：沒拿的包裹留在家，零食沒帶媽媽會硬塞
static func depart(J: Journey) -> void:
	var S := J.S
	if S.items.get("snacks") == "home":
		S.flags["stuffed"] = 1
		if Bag.try_put(S, J.db, "snacks", ["day", "top", "mid", "bot"]) == "":
			S.items["snacks"] = "worn"
	S.flags["departed"] = 1
	S.diary.append({"day": S.day, "key": "diary.departed", "args": {}})
	J.changed.emit()


static func default_pack(J: Journey) -> void:
	var dp: Dictionary = J.db.c.DEFAULT_PACK
	for id in J.S.items.keys():
		if J.S.items[id] != "lost" and dp.has(id):
			J.S.items[id] = dp[id]
	J.changed.emit()
