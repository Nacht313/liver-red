## DataDB：讀 game/data/opening/*.json（由 npm run export:godot 產生）。
extends TestCase


func test_load_all() -> void:
	var db := DataDB.load_all()
	eq(db.trans["fsc"]["p"], 1700, "全服務航空票價")
	eq(db.items["laptop"]["kg"], 1.9, "筆電重量")
	eq(db.c["CABIN_LIMIT_KG"], 7, "手提行李上限")
	eq(db.nights.size(), 5, "住幾晚的選項")
	eq(db.c["ATTRS"][3], "empathy", "屬性代號")
	eq(db.items["laptop"]["size"], [3, 1], "筆電格子尺寸")


func test_names_translate() -> void:
	TranslationServer.set_locale("zh_TW")
	var db := DataDB.load_all()
	var key: String = db.items["passport"]["name"]
	eq(key, "item.passport.name", "資料裡放代號")
	eq(TranslationServer.translate(key), "護照", "代號翻得出中文")
	eq(TranslationServer.translate("attr.empathy.name"), "共情", "屬性名稱")
