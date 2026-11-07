## 家的資料（data/home.json）：物品都在某個區域裡、互動節點存在、名字有翻譯。
extends TestCase


func _home() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string("res://data/home.json"))


func test_objects_inside_areas() -> void:
	var h := _home()
	ok(h.areas.size() >= 5, "房間、客廳、飯廳、大門、樓梯間")
	for o in h.objects:
		var inside := false
		for a in h.areas:
			if o.x >= a.x0 and o.x < a.x1:
				inside = true
		ok(inside, "%s 不在任何區域裡（x=%s）" % [o.id, o.x])
		ok(o.x >= 0 and o.x <= h.width, "%s 在世界範圍內" % o.id)


func test_object_nodes_exist() -> void:
	var nodes := StoryRunner.load_nodes("res://data/story/opening.json")
	for o in _home().objects:
		ok(nodes.has(o.node), "%s 的互動節點 %s 不存在" % [o.id, o.node])


func test_name_keys() -> void:
	TranslationServer.set_locale("zh_TW")
	var h := _home()
	for o in h.objects:
		ok(TranslationServer.translate(o.name) != o.name, "%s 的名字沒有翻譯" % o.id)
	for a in h.areas:
		ok(TranslationServer.translate(a.name) != a.name, "%s 的名字沒有翻譯" % a.id)


func test_ui_lock_one_at_a_time() -> void:
	var u := UiLock.new()
	ok(u.can_move(), "沒開介面可以走")
	ok(u.request("dialogue"), "開對話")
	ok(not u.request("phone"), "對話開著不能開手機")
	ok(not u.can_move(), "對話中不能走")
	u.release("phone")
	eq(u.open, "dialogue", "放掉別人的鎖沒有作用")
	u.release("dialogue")
	ok(u.request("phone"), "對話關了可以開手機")
	u.clear()
	ok(u.can_move(), "clear 全部關掉")
