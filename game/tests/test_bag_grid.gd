## 格子背包：尺寸、旋轉、不能重疊、腰包要先穿上、放錯位置會彈回去。
extends TestCase

var S: JourneyState
var db: DataDB


func _setup() -> void:
	db = DataDB.load_all()
	S = JourneyState.fresh(db, [])


func test_fits_bounds() -> void:
	_setup()
	ok(not BagGrid.fits(S, db, "laptop", "pocket", 0, 0, 0), "筆電（3×1）塞不進褲袋（2×1）")
	ok(BagGrid.fits(S, db, "laptop", "mid", 0, 0, 0), "中層左上角放得下")
	ok(not BagGrid.fits(S, db, "laptop", "mid", 3, 0, 0), "超出右邊")
	ok(BagGrid.fits(S, db, "laptop", "mid", 4, 0, 1), "轉直之後放得下")
	ok(not BagGrid.fits(S, db, "laptop", "mid", -1, 0, 0), "負的座標不行")


func test_no_overlap() -> void:
	_setup()
	ok(BagGrid.drop(S, db, "laptop", "mid", 0, 0, 0), "放筆電")
	ok(not BagGrid.fits(S, db, "tees", "mid", 1, 0, 0), "跟筆電重疊")
	ok(BagGrid.fits(S, db, "tees", "mid", 3, 0, 0), "旁邊空的可以")
	ok(BagGrid.fits(S, db, "laptop", "mid", 0, 0, 0), "自己原本的位置不算重疊")
	eq(S.items["laptop"], "mid", "分層跟著更新")


func test_waist_locked_without_belt() -> void:
	_setup()
	ok(not BagGrid.fits(S, db, "passport", "waist", 0, 0, 0), "沒有腰包不能用")
	S.items["belt"] = "worn"
	ok(BagGrid.fits(S, db, "passport", "waist", 0, 0, 0), "穿上腰包就能放")


func test_invalid_drop_returns() -> void:
	_setup()
	BagGrid.drop(S, db, "laptop", "mid", 0, 0, 0)
	var items_before := S.items.duplicate(true)
	var grid_before := S.grid.duplicate(true)
	ok(not BagGrid.drop(S, db, "tees", "mid", 1, 0, 0), "重疊放不下")
	ok(not BagGrid.drop(S, db, "towel", "pocket", 0, 0, 0), "褲袋放不下浴巾")
	ok(not BagGrid.drop(S, db, "passport", "waist", 0, 0, 0), "沒腰包放不進腰包層")
	eq(S.items, items_before, "分層沒變")
	eq(S.grid, grid_before, "格子沒變")


func test_remove_goes_to_bed() -> void:
	_setup()
	BagGrid.drop(S, db, "laptop", "mid", 0, 0, 0)
	BagGrid.remove(S, "laptop", db)
	eq(S.items["laptop"], "home", "拿出來放回床上")
	ok(not S.grid.has("laptop"), "格子清掉")
	BagGrid.remove(S, "passport", db)
	ok(S.items["passport"] != "home", "護照一定要帶，拿不出來")


func test_auto_place_default_pack() -> void:
	_setup()
	var J := Journey.new(db, SaveStore.new("user://test_saves/grid/"))
	J.S = S
	OpeningActions.default_pack(J)
	BagGrid.sync(S, db)
	for id in S.items:
		var l: String = S.items[id]
		if db.layers.has(l):
			ok(S.grid.has(id), "%s 在 %s 有格子位置" % [id, l])
	SaveStore.remove_dir("user://test_saves/grid/")


func test_pickup_worn_belt() -> void:
	var J := Journey.new(DataDB.load_all(), SaveStore.new("user://test_saves/grid2/"), func() -> float: return 0.0)
	J.new_game()
	OpeningActions.start_funds(J, 50000)
	OpeningActions.buy_item(J, "belt")
	J.S.orders[0]["arrived"] = true
	OpeningActions.pick_up_parcels(J)
	eq(J.S.items["belt"], "worn", "防盜腰包拿到就穿上")
	SaveStore.remove_dir("user://test_saves/grid2/")
