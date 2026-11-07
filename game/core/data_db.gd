## 遊戲資料：讀 res://data/opening/*.json。這些檔案由 `npm run export:godot` 從網頁版
## src/story/opening/data.js 產生，不要手改。文字欄位放的是翻譯代號，用 tr() 取文字。
class_name DataDB
extends RefCounted

const DIR := "res://data/opening/"

var know: Dictionary
var research: Array
var items: Dictionary
var layers: Dictionary
var trans: Dictionary
var flight: Dictionary
var stays: Dictionary
var nights: Array
var hosts: Dictionary
var stops: Array
var family: Array
var tips: Array
var endings: Dictionary
## 常數：FX、匯率、背包重量、格子、預設打包、屬性代號、開始日期
var c: Dictionary


static func load_all() -> DataDB:
	var db := DataDB.new()
	for field in ["know", "research", "items", "layers", "trans", "flight", "stays", "nights", "hosts", "stops", "family", "tips", "endings"]:
		db.set(field, _read(field))
	db.c = _read("constants")
	return db


static func _read(name: String) -> Variant:
	var path := DIR + name + ".json"
	var text := FileAccess.get_file_as_string(path)
	if text == "":
		push_error("DataDB: cannot read " + path)
		return {}
	var v: Variant = JSON.parse_string(text)
	if v == null:
		push_error("DataDB: invalid JSON in " + path)
		return {}
	return v
