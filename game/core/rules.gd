## 劇情節點的小語言：條件、效果、文字。照網頁版 src/game/journey/rules.js，鍵名改成 snake_case。
## 寫法給策劃看的說明在 docs/story-format.md。
class_name Rules
extends RefCounted

const STAT_KEYS := ["energy", "food", "faith", "battery", "hyg", "family", "card", "cny", "thb", "eng"]
const SETTABLE := ["dest", "trans", "dep", "stay", "cs", "tdac", "tdac_addr", "ins", "esim", "laos_visa", "loc", "place_key", "zone", "resume", "extra_bag"]


static func in_range(v: float, r: Dictionary) -> bool:
	if r.has("gte") and not v >= float(r.gte):
		return false
	if r.has("gt") and not v > float(r.gt):
		return false
	if r.has("lte") and not v <= float(r.lte):
		return false
	if r.has("lt") and not v < float(r.lt):
		return false
	return true


static func number(name: String, J: Journey) -> float:
	match name:
		"cabin_kg": return Bag.cabin_kg(J.S, J.db)
		"total_kg": return Bag.total_kg(J.S, J.db)
		"cash_thb": return J.cash_thb()
		"money": return J.money()
		"days_to_dep": return 99.0 if J.S.dep == null else float(J.S.dep) - J.S.day
		"late_by": return -99.0 if J.S.trans == null else J.S.h - float(J.db.trans[J.S.trans].latest)
	push_error("Rules: unknown value " + name)
	return 0.0


## 條件成立嗎？null 代表沒有條件
static func test(cond: Variant, J: Journey) -> bool:
	if cond == null:
		return true
	if cond is Array:
		return cond.all(func(c): return test(c, J))
	var c: Dictionary = cond
	var S := J.S
	if c.has("all"):
		return c.all.all(func(x): return test(x, J))
	if c.has("any"):
		return c.any.any(func(x): return test(x, J))
	if c.has("not"):
		return not test(c["not"], J)
	if c.has("know"):
		return S.know.has(c.know)
	if c.has("no_know"):
		return not S.know.has(c.no_know)
	if c.has("flag"):
		return S.flags.has(c.flag)
	if c.has("no_flag"):
		return not S.flags.has(c.no_flag)
	if c.has("has"):
		return J.has(c.has)
	if c.has("hour"):
		return in_range(S.h, c.hour)
	if c.has("day"):
		return in_range(S.day, c.day)
	if c.has("attr"):
		return in_range(S.attr[c.attr], c)
	if c.has("is"):
		for k in c["is"]:
			if S.get(k) != c["is"][k]:
				return false
		return true
	if c.has("v"):
		return in_range(number(c.v, J), c)
	for k in STAT_KEYS:
		if c.has(k):
			return in_range(float(S.get(k)), c[k])
	push_error("Rules: unknown condition " + JSON.stringify(c))
	return false


## 套用效果。actions：章節提供的複雜動作（名稱 → Callable(J, effect)）
static func apply(list: Variant, J: Journey, actions: Dictionary = {}) -> void:
	if list == null:
		return
	var S := J.S
	for e in list:
		if S.over:
			return
		if e.has("add") and e.add is Dictionary:
			for k in e.add:
				if k == "eng":
					S.eng = clampf(S.eng + e.add[k], 0, 10)
				else:
					J.add(k, e.add[k])
		elif e.has("attr"):
			S.attr[e.attr] = clampi(int(S.attr[e.attr] + e.get("add", 0)), 0, 10)
		elif e.has("pay"):
			J.pay_cny(e.pay)
		elif e.has("pay_thb"):
			J.pay_thb(e.pay_thb)
		elif e.has("cash"):
			for k in e.cash:
				S.set(k, float(S.get(k)) + e.cash[k])
		elif e.has("know"):
			J.learn(e.know)
		elif e.has("flag"):
			if e.get("set", 1) == 0:
				S.flags.erase(e.flag)
			else:
				S.flags[e.flag] = e.get("set", 1)
		elif e.has("set"):
			for k in e.set:
				if k in SETTABLE:
					S.set(k, e.set[k])
				else:
					push_error("Rules: field not settable " + k)
		elif e.has("time"):
			J.advance(e.time, e)
		elif e.has("until"):
			J.until(e.until)
		elif e.has("sleep"):
			J.sleep(e.sleep)
		elif e.has("unlock"):
			J.unlock(e.unlock)
		elif e.has("photo"):
			J.take_photo(e.photo)
		elif e.has("journal"):
			S.diary.append({"day": S.day, "key": e.journal, "args": e.get("args", {})})
		elif e.has("diary"):
			J.write_diary(e.diary)
		elif e.has("fam_msg"):
			J.push_msg(e.fam_msg[0], e.fam_msg[1])
		elif e.has("toast"):
			J.toast.emit(e.toast, e.get("args", {}))
		elif e.has("end"):
			J.end(e.end)
		elif e.has("do"):
			if actions.has(e["do"]):
				actions[e["do"]].call(J, e)
			else:
				push_error("Rules: unknown action " + e["do"])
		else:
			push_error("Rules: unknown effect " + JSON.stringify(e))
	J.changed.emit()


## 翻譯並填入佔位符。內建值：date、date_short、clock、total_kg、cabin_kg、cash_thb、thb
## 女性主角時，如果有 key@f 的版本就用那個。
static func fill(key: String, J: Journey, args: Dictionary = {}) -> String:
	var k := key
	if J.S and J.S.gender == "f" and TranslationServer.translate(key + "@f") != key + "@f":
		k = key + "@f"
	var vals := {}
	if J.S:
		vals = {"date": TimeUtil.date_str(J.S.day), "date_short": TimeUtil.date_str(J.S.day, true), "clock": TimeUtil.clock(J.S.h),
			"total_kg": "%.1f" % Bag.total_kg(J.S, J.db), "cabin_kg": "%.1f" % Bag.cabin_kg(J.S, J.db),
			"cash_thb": str(roundi(J.cash_thb())), "thb": str(roundi(J.S.thb)),
			"missed_loss": str(J.S.flags.get("missed_loss", 0))}
	vals.merge(args, true)
	return TranslationServer.translate(k).format(vals)
