## 背包重量（照網頁版 tests/unit/journey.test.js 的背包兩項）。
extends TestCase


func _setup() -> Array:
	var db := DataDB.load_all()
	var S := JourneyState.fresh(db, [])
	return [S, db]


func test_cabin_weight_excludes_body_and_worn() -> void:
	var s := _setup()
	var S: JourneyState = s[0]
	var db: DataDB = s[1]
	var base := Bag.cabin_kg(S, db)
	S.items["laptop"] = "mid"
	eq(Bag.cabin_kg(S, db), base + 1.9 + 1.4, "筆電＋大背包本身")
	S.items["laptop"] = "worn"
	ok(Bag.cabin_kg(S, db) < base + 1.5, "穿在身上不算手提")
	ok(Bag.total_kg(S, db) >= 1.9, "總重還是算")


func test_overfull_center_waist_try_put() -> void:
	var s := _setup()
	var S: JourneyState = s[0]
	var db: DataDB = s[1]
	S.items["towel"] = "pocket"
	eq(Bag.overfull(S, db), "pocket", "褲袋塞不下浴巾")
	S.items["towel"] = "mid"
	eq(Bag.overfull(S, db), "", "中層放得下")
	S.items["laptop"] = "top"
	ok(Bag.weight_factor(S, db) > 1, "重的放上層，重心不穩")
	S.items["wallet"] = "waist"
	Bag.fix_waist(S)
	eq(S.items["wallet"], "pocket", "沒帶腰包就退回褲袋")
	eq(Bag.try_put(S, db, "snacks", ["pocket", "day"]), "day", "找第一個塞得下的")
