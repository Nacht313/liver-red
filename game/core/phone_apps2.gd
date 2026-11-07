## 手機 App（續）：沙發衝浪、購物、聊天、出入境、銀行、相簿。格式見 PhoneApps。
class_name PhoneApps2
extends RefCounted


static func t(key: String, args := {}) -> String:
	return PhoneApps.t(key, args)


static func row(text: String, act: Dictionary, sub := "", right := "", why := "") -> Dictionary:
	return PhoneApps.row(text, act, sub, right, why)


static func page(J: Journey, app: String, arg: Variant) -> Dictionary:
	match app:
		"cs": return _cs(J)
		"shop": return _shop(J)
		"chat": return _chat(J)
		"chat_msg": return _chat_msg(J, int(arg))
		"immig": return _immig(J)
		"bank": return _bank(J)
		"photos": return _photos(J)
	push_error("PhoneApps: unknown app " + app)
	return {"title": "", "blocks": [], "rows": []}


static func act(J: Journey, a: Dictionary) -> Dictionary:
	var S := J.S
	if a.has("ins"):
		if not S.ins:
			OpeningActions.errand(J, "ins")
		return {}
	if a.has("host"):
		if a.host == "jay":
			S.cs = "jay"
			S.stay = null
			J.changed.emit()
			return {"toast": "phone.cs.jay_yes"}
		S.cs_tried[a.host] = 1
		J.changed.emit()
		return {"toast": "phone.cs.busy"}
	if a.has("story"):
		return {"story": a.story}
	if a.has("buy"):
		OpeningActions.buy_item(J, a.buy)
		return {}
	if a.has("msg"):
		_answer(J, int(a.msg), a.how)
		return {"go": ["chat", null]}
	if a.has("errand"):
		OpeningActions.errand(J, a.errand)
		return {}
	push_error("PhoneApps: unknown act " + JSON.stringify(a))
	return {}


# ---------- 沙發衝浪（設計摘要：沒有考核；新帳號 0 則評價） ----------
static func _cs(J: Journey) -> Dictionary:
	var S := J.S
	var careful: bool = S.attr["empathy"] >= 3 or J.knows("k_cs")
	var blocks := [{"kind": "text", "text": t("phone.cs.account", {"refs": S.refs})}]
	if S.cs == "jay":
		blocks.append({"kind": "note", "text": t("phone.cs.with_jay")})
	if careful:
		blocks.append({"kind": "warn", "text": t("phone.cs.jay_warn")})
	var rows := []
	if S.trans == null:
		return {"title": t("phone.app.cs"), "blocks": [{"kind": "text", "text": t("phone.hotel.need_trans")}], "rows": []}
	for k in ["nok", "tom", "pim", "jay"]:
		var h: Dictionary = J.db.hosts[k]
		var why := ""
		if S.refs < int(h.need):
			why = t("phone.cs.need_refs", {"n": int(h.need)})
		elif S.cs_tried.has(k):
			why = t("phone.cs.asked")
		elif S.stay != null:
			why = t("phone.cs.has_stay")
		rows.append(row("%s  ★%s" % [h.name, h.star], {"host": k}, t(h.desc) if h.desc.begins_with("host.") else h.desc, t("phone.cs.refs", {"n": int(h.refs)}), why))
	if not careful:
		rows.append(row(t("phone.cs.read"), {"story": "cs.read"}, t("phone.cs.read_sub")))
	return {"title": t("phone.app.cs"), "blocks": blocks, "rows": rows}


# ---------- 購物 ----------
static func _shop(J: Journey) -> Dictionary:
	var S := J.S
	var rows := []
	for id in J.db.items:
		var it: Dictionary = J.db.items[id]
		if not it.has("price"):
			continue
		var owned: bool = S.items.has(id) or S.orders.any(func(o): return o.id == id)
		rows.append(row(t(it.name), {"buy": id}, t(it.desc) if it.has("desc") else "", "¥%d" % int(it.price), t("phone.shop.bought") if owned else ""))
	var orders := []
	for o in S.orders:
		var state := t("phone.shop.got") if o.get("got", false) else (t("phone.shop.at_locker") if o.get("arrived", false) else t("phone.shop.eta", {"date": TimeUtil.date_str(int(o.arrive), true)}))
		orders.append(t("phone.shop.order_item", {"name": t(J.db.items[o.id].name), "state": state}))
	var blocks := [{"kind": "text", "text": t("phone.shop.hint")}]
	if not orders.is_empty():
		blocks.append({"kind": "note", "text": t("phone.shop.orders", {"list": t("ui.list_sep").join(orders)})})
	return {"title": t("phone.app.shop"), "blocks": blocks, "rows": rows}


# ---------- 聊天：家族群 ----------
static func _chat(J: Journey) -> Dictionary:
	var rows := []
	for i in J.S.msgs.size():
		var m: Dictionary = J.S.msgs[i]
		rows.append(row(t(m.from), {"go": "chat_msg", "arg": i}, t(m.text), "" if m.done else t("phone.unread")))
	var blocks := [] if not rows.is_empty() else [{"kind": "text", "text": t("phone.chat.empty")}]
	return {"title": t("phone.app.chat"), "blocks": blocks, "rows": rows}


static func _chat_msg(J: Journey, i: int) -> Dictionary:
	var S := J.S
	var m: Dictionary = S.msgs[i]
	var blocks := [{"kind": "note", "text": "%s・%s\n%s" % [t(m.from), TimeUtil.date_str(int(m.day), true), t(m.text)]}]
	if m.done:
		return {"title": t(m.from), "blocks": blocks, "rows": [row(t("phone.back"), {"go": "chat"})]}
	var net: bool = S.loc == "home" or S.esim or S.flags.has("sim")
	var why := "" if net and S.battery >= 8 else (t("phone.no_net") if not net else t("phone.low_battery"))
	return {"title": t(m.from), "blocks": blocks, "rows": [
		row(t("phone.chat.video"), {"msg": i, "how": "video"}, t("phone.chat.video_sub"), "", why),
		row(t("phone.chat.photo"), {"msg": i, "how": "photo"}, t("phone.chat.photo_sub")),
		row(t("phone.chat.ignore"), {"msg": i, "how": "ignore"}, t("phone.chat.ignore_sub"))]}


static func _answer(J: Journey, i: int, how: String) -> void:
	var S := J.S
	var m: Dictionary = S.msgs[i]
	if m.done:
		return
	m.done = true
	match how:
		"video":
			J.advance(0.5)
			J.add("battery", -6)
			J.add("faith", 8)
			S.family = clampf(S.family - 15, 0, 100)
			J.unlock("family")
		"photo":
			J.add("faith", 3)
			S.family = clampf(S.family - 7, 0, 100)
		_:
			J.add("faith", -3)
			S.family = clampf(S.family + 5, 0, 100)
	J.changed.emit()


# ---------- 出入境：TDAC、eSIM、寮國電子簽 ----------
static func _immig(J: Journey) -> Dictionary:
	var S := J.S
	var tdac_why := ""
	if S.tdac:
		tdac_why = t("phone.done")
	elif S.trans == null:
		tdac_why = t("phone.immig.need_trans")
	elif not OpeningActions.tdac_open(J):
		tdac_why = t("phone.immig.tdac_later", {"date": TimeUtil.date_str(maxi(S.day, OpeningActions.arrival_day(J) - 3), true)})
	var rows := [
		row(t("phone.immig.tdac"), {"errand": "tdac"}, t("phone.immig.tdac_fake") if S.stay == null and S.cs == null else t("phone.immig.tdac_sub"), "", tdac_why),
		row(t("phone.immig.esim"), {"errand": "esim"}, t("phone.immig.esim_sub"), "¥45", t("phone.done") if S.esim else "")]
	if S.trans == "land" or S.researched.has("r_land"):
		var lv := ""
		if S.laos_visa != null:
			lv = t("phone.immig.laos_ok") if S.day >= int(S.laos_visa) else t("phone.immig.laos_wait", {"date": TimeUtil.date_str(int(S.laos_visa), true)})
		rows.append(row(t("phone.immig.laos"), {"errand": "laos"}, t("phone.immig.laos_sub"), "¥260", lv))
	return {"title": t("phone.app.immig"), "blocks": [], "rows": rows}


# ---------- 銀行：看餘額（換匯要出門去銀行） ----------
static func _bank(J: Journey) -> Dictionary:
	var S := J.S
	var txt := t("phone.bank.balance", {"card": roundi(S.card), "cny": roundi(S.cny), "thb": roundi(S.thb), "total": roundi(J.money())})
	return {"title": t("phone.app.bank"), "blocks": [{"kind": "note", "text": txt}, {"kind": "text", "text": t("phone.bank.hint")}], "rows": []}


# ---------- 相簿 ----------
static func _photos(J: Journey) -> Dictionary:
	var rows := []
	for p in J.S.photos:
		rows.append(row(t("photo.%s.name" % p.spot), {}, TimeUtil.date_str(int(p.day), true)))
	var blocks := [] if not rows.is_empty() else [{"kind": "text", "text": t("phone.photos.empty")}]
	return {"title": t("phone.app.photos"), "blocks": blocks, "rows": rows}
