## 美術素材：資料引用到的圖都存在。
extends TestCase


func test_home_art_exists() -> void:
	var h: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/home.json"))
	ok(h.has("background") and ResourceLoader.exists(h.background), "家的背景圖：%s" % h.get("background", "?"))
	for n in h.get("npcs", []):
		for f in n.frames:
			ok(ResourceLoader.exists("res://art/chars/%s.png" % f), "角色圖 %s" % f)
	for f in ["me_idle", "me_walk_0", "me_walk_1", "me_walk_2", "me_walk_3"]:
		ok(ResourceLoader.exists("res://art/chars/%s.png" % f), "主角 %s" % f)


func test_faces_exist() -> void:
	var sp: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/speakers.json"))
	for id in sp:
		if sp[id].has("face"):
			ok(ResourceLoader.exists(sp[id].face), "%s 的頭像 %s" % [id, sp[id].face])
	ok(sp.me.has("face") and sp.mom.has("face") and sp.dad.has("face"), "主要角色都有頭像")
