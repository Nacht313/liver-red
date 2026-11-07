## 存檔：把字典存成 JSON 檔。預設放在 user://（Godot 的使用者資料夾）。
## 檔名：zgh_meta.json（跨輪保留的旅行知識）、zgh_diary.json（日記存檔）。
class_name SaveStore
extends RefCounted

var dir: String


func _init(base_dir := "user://") -> void:
	dir = base_dir
	DirAccess.make_dir_recursive_absolute(dir)


func get_slot(name: String) -> Variant:
	var path := dir.path_join("zgh_%s.json" % name)
	if not FileAccess.file_exists(path):
		return null
	return JSON.parse_string(FileAccess.get_file_as_string(path))


func set_slot(name: String, value: Variant) -> void:
	var path := dir.path_join("zgh_%s.json" % name)
	if value == null:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)
		return
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		push_error("SaveStore: cannot write " + path)
		return
	f.store_string(JSON.stringify(value))


## 測試用：刪掉整個資料夾
static func remove_dir(path: String) -> void:
	for f in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(f))
	DirAccess.remove_absolute(path)
