## 測試執行器（不開視窗）。用法見 game/README.md：
##   godot --headless --path game --import
##   godot --headless --path game --script res://tests/run_tests.gd [-- 檔名關鍵字]
## 每個 res://tests/test_*.gd 裡以 test_ 開頭的方法都會用新的實例執行一次。全部通過結束碼才是 0。
extends SceneTree


func _initialize() -> void:
	var only := ""
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		only = args[0]
	var files := DirAccess.get_files_at("res://tests")
	var total := 0
	var failed := 0
	for f in files:
		if not (f.begins_with("test_") and f.ends_with(".gd")) or f == "test_case.gd":
			continue
		if only != "" and not f.contains(only):
			continue
		var script: GDScript = load("res://tests/" + f)
		if script == null:
			print("FAIL %s：載入失敗" % f)
			failed += 1
			continue
		for m in script.get_script_method_list():
			var name: String = m["name"]
			if not name.begins_with("test_"):
				continue
			total += 1
			var t = script.new()
			t.call(name)
			if t.fail_count == 0:
				print("  ok   %s :: %s" % [f, name])
			else:
				failed += 1
				print("  FAIL %s :: %s" % [f, name])
				for msg in t.failures:
					print("         %s" % msg)
	print("\n%d 項，%d 項失敗" % [total, failed])
	quit(1 if failed > 0 or total == 0 else 0)
