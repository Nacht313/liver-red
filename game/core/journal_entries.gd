## 日記本的內容：S.diary 的條目（{day, key, args}）和 S.photos 的照片，依日期分頁。
class_name JournalEntries
extends RefCounted


static func add(J: Journey, key: String, args := {}) -> void:
	J.S.diary.append({"day": J.S.day, "key": key, "args": args})


## 有內容的日子各一頁：[{day, entries: [...], photos: [...]}]，照日期排
static func pages(S: JourneyState) -> Array:
	var by := {}
	for e in S.diary:
		var d := int(e.day)
		if not by.has(d):
			by[d] = {"day": d, "entries": [], "photos": []}
		by[d].entries.append(e)
	for p in S.photos:
		var d := int(p.day)
		if not by.has(d):
			by[d] = {"day": d, "entries": [], "photos": []}
		by[d].photos.append(p)
	var days := by.keys()
	days.sort()
	return days.map(func(d): return by[d])


## 一條日記的文字：參數如果是翻譯代號（例如地點），也一起翻譯
static func text(e: Dictionary) -> String:
	var args := {}
	for k in e.get("args", {}):
		var v: Variant = e.args[k]
		if v is String and TranslationServer.translate(v) != v:
			v = TranslationServer.translate(v)
		args[k] = v
	return TranslationServer.translate(e.key).format(args)
