## 手機 App：依照狀態產生頁面資料，介面（scenes/ui/phone/phone.gd）只負責畫出來。
## 頁面：{ title, blocks: [{kind, text}], rows: [{text, sub, right, why, act}] }
## act 交給 act() 執行，回傳 { go: [app, arg] } 或 { back: true } 或 { story: 節點 } 或 {}。
## 規則照網頁版 src/story/opening/screens-*.js；比較長的 App（聊天、出入境、銀行、相簿、沙發衝浪、購物）在 PhoneApps2。
class_name PhoneApps
extends RefCounted

const APPS := ["map", "web", "trip", "hotel", "cs", "shop", "chat", "immig", "bank", "photos"]


static func t(key: String, args := {}) -> String:
	return TranslationServer.translate(key).format(args)


static func row(text: String, act: Dictionary, sub := "", right := "", why := "") -> Dictionary:
	return {"text": text, "sub": sub, "right": right, "why": why, "act": act}


static func page(J: Journey, app: String, arg: Variant) -> Dictionary:
	match app:
		"home": return _home(J)
		"map": return _map(J)
		"web": return _web(J)
		"web_article": return _article(J, arg)
		"trip": return _trip(J)
		"trip_date": return _trip_date(J, arg)
		"hotel": return _hotel(J)
		"hotel_nights": return _nights(J, arg)
	return PhoneApps2.page(J, app, arg)


static func act(J: Journey, a: Dictionary) -> Dictionary:
	var S := J.S
	if a.has("go"):
		return {"go": [a.go, a.get("arg")]}
	if a.has("city"):
		S.dest = a.city
		J.changed.emit()
		return {"back": true, "toast": "phone.map.picked"}
	if a.has("research"):
		var r := OpeningActions.research(J, a.research)
		return {"go": ["web_article", {"id": a.research, "old": r.get("old", false), "nag": r.get("nag", false)}]}
	if a.has("trans"):
		if OpeningActions.book_trans(J, a.trans, int(a.days), float(a.mul), bool(a.bag)):
			return {"go": ["trip", null], "toast": "phone.trip.booked"}
		return {}
	if a.has("extra_bag"):
		J.pay_cny(int(J.db.c.EXTRA_BAG_ONLINE))
		S.extra_bag = not S.over
		return {}
	if a.has("stay"):
		if OpeningActions.book_stay(J, a.stay, int(a.nights_i)):
			return {"go": ["hotel", null], "toast": "phone.hotel.booked"}
		return {}
	if a.has("cancel_stay"):
		OpeningActions.cancel_stay(J)
		return {}
	return PhoneApps2.act(J, a)


# ---------- 主畫面 ----------
static func _home(J: Journey) -> Dictionary:
	var rows := []
	for app in APPS:
		var badge := ""
		if app == "chat":
			var n := J.S.msgs.filter(func(m): return not m.done).size()
			badge = t("phone.badge", {"n": n}) if n > 0 else ""
		rows.append(row(t("phone.app.%s" % app), {"go": app}, "", badge))
	return {"title": t("phone.home"), "blocks": [], "rows": rows}


# ---------- 地圖：選第一站 ----------
static func known_country(J: Journey, c: Dictionary) -> bool:
	return c.res == "" or J.S.researched.has(c.res)


static func _map(J: Journey) -> Dictionary:
	var m: Dictionary = J.db.asia_map
	var rows := []
	for city in m.cities:
		if city.id == "home":
			continue
		var c: Dictionary = {}
		for x in m.countries:
			if x.code == city.c:
				c = x
		var sub := t("map.st.%s" % c.st) if known_country(J, c) and c.st != "" else t("map.unknown")
		var why := "" if city.open else t("map.closed")
		var right := t("phone.map.picked_mark") if J.S.dest == city.id else ""
		rows.append(row("%s・%s" % [t(c.name), t(city.name)], {"city": city.id}, sub, right, why))
	return {"title": t("phone.app.map"), "blocks": [{"kind": "map"}, {"kind": "text", "text": t("phone.map.hint")}], "rows": rows}


# ---------- 瀏覽器：查資料 ----------
static func _web(J: Journey) -> Dictionary:
	var rows := []
	for r in J.db.research:
		var done := J.S.researched.has(r.id)
		rows.append(row(t(r.name), {"research": r.id}, t(r.src), "", t("phone.web.read") if done else ""))
	return {"title": t("phone.app.web"), "blocks": [{"kind": "text", "text": t("phone.web.hint")}], "rows": rows}


static func _article(J: Journey, a: Dictionary) -> Dictionary:
	var r: Dictionary = {}
	for x in J.db.research:
		if x.id == a.id:
			r = x
	var blocks := [{"kind": "text", "text": t(r.src)}]
	for k in r.k:
		blocks.append({"kind": "note", "text": t(J.db.know[k])})
	if a.get("old", false):
		blocks.append({"kind": "text", "text": t("phone.web.old")})
	if a.get("nag", false):
		blocks.append({"kind": "warn", "text": t("phone.web.nag")})
	return {"title": t(r.name), "blocks": blocks, "rows": [row(t("phone.back_list"), {"go": "web"})]}


# ---------- 旅行：交通和保險 ----------
static func _trip(J: Journey) -> Dictionary:
	var S := J.S
	var blocks := []
	var rows := []
	if S.trans != null:
		var tr_: Dictionary = J.db.trans[S.trans]
		blocks.append({"kind": "note", "text": t("phone.trip.ticket", {"name": t(tr_.name), "date": TimeUtil.date_str(int(S.dep), true),
			"bag": t("phone.trip.bag_yes") if (not tr_.get("lcc", 0) or S.extra_bag) else t("phone.trip.bag_no")})})
		if tr_.get("lcc", 0) and not S.extra_bag:
			rows.append(row(t("phone.trip.add_bag"), {"extra_bag": 1}, t("phone.trip.add_bag_sub"), "¥%d" % int(J.db.c.EXTRA_BAG_ONLINE)))
	elif S.dest == null:
		blocks.append({"kind": "text", "text": t("phone.trip.no_dest")})
		rows.append(row(t("phone.trip.open_map"), {"go": "map"}))
	else:
		var lk := J.knows("k_lcc")
		for k in J.db.trans:
			var tr_: Dictionary = J.db.trans[k]
			var sub := t(tr_.desc) + (("  " + (t("phone.trip.lcc_known") if lk else t("phone.trip.lcc_unknown"))) if tr_.get("lcc", 0) else "")
			rows.append(row(t(tr_.name), {"go": "trip_date", "arg": k}, sub, "¥%d" % int(tr_.p)))
	rows.append(row(t("phone.trip.ins"), {"ins": 1}, t("phone.trip.ins_sub"), "¥150", t("phone.done") if S.ins else ""))
	return {"title": t("phone.app.trip"), "blocks": blocks, "rows": rows}


static func _trip_date(J: Journey, k: String) -> Dictionary:
	var tr_: Dictionary = J.db.trans[k]
	var S := J.S
	var lm := float(J.db.c.LAST_MINUTE)
	var rows := [
		row(t("phone.trip.in2", {"date": TimeUtil.date_str(S.day + 2, true)}), {"trans": k, "days": 2, "mul": lm, "bag": false}, t("phone.trip.in2_sub"), "¥%d" % roundi(float(tr_.p) * lm)),
		row(t("phone.trip.in5", {"date": TimeUtil.date_str(S.day + 5, true)}), {"trans": k, "days": 5, "mul": 1.0, "bag": false}, "", "¥%d" % int(tr_.p))]
	if tr_.get("lcc", 0) and J.knows("k_lcc"):
		rows.append(row(t("phone.trip.in5_bag"), {"trans": k, "days": 5, "mul": 1.0, "bag": true}, "", "¥%d" % (int(tr_.p) + int(J.db.c.EXTRA_BAG_ONLINE))))
	rows.append(row(t("phone.back"), {"go": "trip"}))
	return {"title": t(tr_.name), "blocks": [{"kind": "text", "text": t(tr_.desc)}], "rows": rows}


# ---------- 訂房 ----------
static func _hotel(J: Journey) -> Dictionary:
	var S := J.S
	if S.trans == null:
		return {"title": t("phone.app.hotel"), "blocks": [{"kind": "text", "text": t("phone.hotel.need_trans")}], "rows": []}
	if S.cs != null:
		return {"title": t("phone.app.hotel"), "blocks": [{"kind": "note", "text": t("phone.hotel.cs_set")}], "rows": []}
	if S.stay != null:
		var st: Dictionary = S.stay
		return {"title": t("phone.app.hotel"), "blocks": [{"kind": "note", "text": t("phone.hotel.booked_info", {"name": t(J.db.stays[st.kind].name), "nights": st.nights, "thb": st.thb})}],
			"rows": [row(t("phone.hotel.cancel"), {"cancel_stay": 1}, t("phone.hotel.refund") if st.refund else t("phone.hotel.no_refund"), "", "" if st.refund else t("phone.hotel.no_refund"))]}
	var rows := []
	for k in J.db.stays:
		var s: Dictionary = J.db.stays[k]
		rows.append(row(t(s.name), {"go": "hotel_nights", "arg": k}, t(s.desc), t("phone.hotel.per_night", {"thb": int(s.p)})))
	return {"title": t("phone.app.hotel"), "blocks": [{"kind": "text", "text": t("phone.hotel.where", {"date": TimeUtil.date_str(OpeningActions.arrival_day(J), true)})}], "rows": rows}


static func _nights(J: Journey, kind: String) -> Dictionary:
	var rows := []
	for i in J.db.nights.size():
		var n: Array = J.db.nights[i]
		var price := OpeningActions.stay_price(J, kind, i)
		var sub := t("phone.hotel.refund") if int(n[2]) == 1 else t("phone.hotel.no_refund")
		if float(n[1]) < 1:
			sub += "・" + t("phone.hotel.save", {"pct": roundi((1 - float(n[1])) * 100)})
		rows.append(row(t("phone.hotel.nights", {"n": int(n[0])}), {"stay": kind, "nights_i": i}, sub, "%d ฿" % price))
	rows.append(row(t("phone.back"), {"go": "hotel"}))
	return {"title": t(J.db.stays[kind].name), "blocks": [{"kind": "text", "text": t("phone.hotel.nights_hint")}], "rows": rows}
