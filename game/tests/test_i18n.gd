## 翻譯表檢查：所有玩家看得到的文字都在 i18n/strings.csv，程式和場景裡不寫死中文。
extends TestCase

const CSV_PATH := "res://i18n/strings.csv"
const CJK := "[\\x{3400}-\\x{9fff}\\x{3000}-\\x{303f}\\x{ff00}-\\x{ffef}]"


static func read_csv_rows(path: String) -> Array:
	var f := FileAccess.open(path, FileAccess.READ)
	var rows := []
	if f == null:
		return rows
	while not f.eof_reached():
		var line := f.get_csv_line()
		if line.size() == 1 and line[0] == "":
			continue
		rows.append(line)
	return rows


func test_every_key_has_zh_tw() -> void:
	var rows := read_csv_rows(CSV_PATH)
	ok(rows.size() > 1, "strings.csv 要存在而且有內容")
	if rows.is_empty():
		return
	var header: PackedStringArray = rows[0]
	eq(header[0], "keys", "第一欄是 keys")
	var col := header.find("zh_TW")
	ok(col > 0, "要有 zh_TW 欄")
	var seen := {}
	for i in range(1, rows.size()):
		var r: PackedStringArray = rows[i]
		var key := r[0]
		ok(not seen.has(key), "代號重複：" + key)
		seen[key] = true
		ok(col < r.size() and r[col].strip_edges() != "", "代號沒有中文：" + key)


func test_no_cjk_outside_csv() -> void:
	var re := RegEx.create_from_string(CJK)
	for path in _files("res://", ["gd", "tscn", "json"]):
		if path.begins_with("res://tests/") or path.begins_with("res://i18n/"):
			continue
		var text := FileAccess.get_file_as_string(path)
		if path.ends_with(".gd"):
			text = _strip_comments(text)
		var m := re.search(text)
		ok(m == null, "%s 裡有寫死的中文：「%s」" % [path, m.get_string() if m else ""])


func test_placeholder_format() -> void:
	TranslationServer.set_locale("zh_TW")
	var s := TranslationServer.translate("ui.test.format").format({"amount": 3})
	ok(s.contains("3"), "佔位符要被換掉：" + s)
	ok(not s.contains("{amount}"), "佔位符不能留著：" + s)


## 註解給開發者看，可以寫中文；只檢查程式碼本身。
static func _strip_comments(text: String) -> String:
	var out := PackedStringArray()
	for line in text.split("\n"):
		var in_str := ""
		var cut := line.length()
		for i in line.length():
			var ch := line[i]
			if in_str != "":
				if ch == in_str and (i == 0 or line[i - 1] != "\\"):
					in_str = ""
			elif ch == "\"" or ch == "'":
				in_str = ch
			elif ch == "#":
				cut = i
				break
		out.append(line.substr(0, cut))
	return "\n".join(out)


func test_comments_may_be_chinese_but_code_may_not() -> void:
	eq(_strip_comments("var a = 1 # 中文註解\n## 文件\nvar b = \"#色\""), "var a = 1 \n\nvar b = \"#色\"", "註解拿掉，字串裡的 # 保留")


func _files(dir: String, exts: Array) -> Array:
	var out := []
	for f in DirAccess.get_files_at(dir):
		if f.get_extension() in exts:
			out.append(dir.path_join(f))
	for d in DirAccess.get_directories_at(dir):
		if d.begins_with("."):
			continue
		out.append_array(_files(dir.path_join(d), exts))
	return out
