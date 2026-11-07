## 日期和時鐘。旅程時間用「第幾天 day」＋「幾點 h（小時，可以有小數）」表示。
## 照網頁版 src/game/journey/time.js。
class_name TimeUtil
extends RefCounted

## 「休息到下一段時間」會停在這些整點
const SEGMENTS := [8.0, 13.0, 19.0, 23.0]
## 第 0 天 = 6 月 28 日（年份對玩家顯示成 20XX）
const START := {"year": 2030, "month": 6, "day": 28}


static func date_parts(day: int) -> Dictionary:
	var base := Time.get_unix_time_from_datetime_dict({"year": START.year, "month": START.month, "day": START.day, "hour": 12})
	var d := Time.get_datetime_dict_from_unix_time(base + day * 86400)
	return {"m": d.month, "d": d.day, "w": d.weekday}


## 'M/D'，或長格式「20XX/M/D 星期X」（文字在翻譯表 ui.date.long、ui.weekday.N）
static func date_str(day: int, short := false) -> String:
	var p := date_parts(day)
	if short:
		return "%d/%d" % [p.m, p.d]
	return TranslationServer.translate("ui.date.long").format({"m": p.m, "d": p.d, "w": TranslationServer.translate("ui.weekday.%d" % p.w)})


static func clock(h: float) -> String:
	var hh := int(floor(h)) % 24
	var mm := int(round(fmod(h, 1.0) * 60))
	if mm == 60:
		mm = 0
		hh = (hh + 1) % 24
	return "%02d:%02d" % [hh, mm]


## 一天的分段：回傳翻譯代號
static func seg_key(h: float) -> String:
	if h < 5:
		return "ui.seg.late"
	if h < 12:
		return "ui.seg.morning"
	if h < 18:
		return "ui.seg.afternoon"
	if h < 23:
		return "ui.seg.evening"
	return "ui.seg.late"


## 光線時段：night / dawn / day / dusk
static func tod(h: float) -> String:
	if h < 6:
		return "night"
	if h < 8:
		return "dawn"
	if h < 17:
		return "day"
	if h < 19.5:
		return "dusk"
	return "night"


static func is_night(h: float) -> bool:
	return h >= 23 or h < 5


static func hours_to_next_seg(h: float) -> float:
	for b in SEGMENTS:
		if b > h + 0.01:
			return b - h
	return 0.0
