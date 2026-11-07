## 全域：持有旅程規則（Journey）、資料（DataDB）、劇情執行器（StoryRunner）和介面鎖（UiLock）。
## 場景和介面都透過 Game 讀寫狀態，不自己存一份。
extends Node

const STORY_PATH := "res://data/story/opening.json"

var db: DataDB
var store: SaveStore
var J: Journey
var story: StoryRunner
var ui := UiLock.new()
## 章節動作（{ "do": 名稱 } 會呼叫這裡的 Callable），由 OpeningActions 提供
var actions: Dictionary = {}


func _init() -> void:
	db = DataDB.load_all()
	store = SaveStore.new()
	J = Journey.new(db, store)
	actions = OpeningActions.table()
	story = StoryRunner.new(J, StoryRunner.load_nodes(STORY_PATH), actions)
	ui.follow_endings(J)


func new_game() -> void:
	J.new_game()
	ui.clear()


func can_move() -> bool:
	return ui.can_move() and not story.is_busy()


func request_ui(kind: String) -> bool:
	return ui.request(kind)


func release_ui(kind: String) -> void:
	ui.release(kind)
