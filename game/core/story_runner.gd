## 劇情執行器：一次跑一個節點，依序發出台詞、選項、判定，畫面只負責顯示和回報玩家的操作。
## 節點格式見 docs/story-format.md。
class_name StoryRunner
extends RefCounted

## who：說話的人（data/speakers.json 的 id）；text：已翻譯、已填好佔位符的句子
signal line(who: String, text: String)
## 每項 {text, sub, why}；why 不是空字串代表不能選（顯示原因）
signal choices(list: Array)
## {attr, level, chance, text}
signal check_started(info: Dictionary)
## {roll, win, crit, chance}
signal check_resolved(result: Dictionary)
signal open_ui(kind: String, arg: Variant)
signal finished

var J: Journey
var nodes: Dictionary
var actions: Dictionary

var cur_id := ""
var waiting := ""  # ""、"line"、"choice"、"check"
var _lines: Array = []
var _li := 0
var _choices: Array = []
var _check: Dictionary = {}


func _init(p_journey: Journey, p_nodes: Dictionary, p_actions: Dictionary = {}) -> void:
	J = p_journey
	nodes = p_nodes
	actions = p_actions


static func load_nodes(path: String) -> Dictionary:
	var v: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not (v is Dictionary) or not v.has("nodes"):
		push_error("StoryRunner: invalid story file " + path)
		return {}
	return v.nodes


## 節點裡所有文字代號（給資料檢查用）
static func text_keys(n: Dictionary) -> Array:
	var out := []
	for l in n.get("lines", []):
		out.append(l.text)
	for c in n.get("choices", []):
		out.append(c.text)
		for k in ["sub", "req_text"]:
			if c.has(k):
				out.append(c[k])
	if n.has("check"):
		out.append(n.check.text)
	return out


func is_busy() -> bool:
	return cur_id != ""


## 開始一個節點；正在跑別的節點時回傳 false
func start(id: String) -> bool:
	if is_busy():
		return false
	_enter(id)
	return true


func _enter(id: String) -> void:
	if not nodes.has(id):
		push_error("StoryRunner: no node " + id)
		_finish()
		return
	cur_id = id
	var n: Dictionary = nodes[id]
	_apply(n.get("on_enter", []))
	if J.S.over:
		_finish()
		return
	_lines = n.get("lines", []).filter(func(l): return Rules.test(l.get("when"), J))
	_li = 0
	_next_line()


func _apply(effects: Array) -> void:
	for e in effects:
		if e.has("open"):
			open_ui.emit(e.open, e.get("arg"))
		else:
			Rules.apply([e], J, actions)


func _next_line() -> void:
	if _li < _lines.size():
		var l: Dictionary = _lines[_li]
		_li += 1
		waiting = "line"
		line.emit(l.get("who", ""), Rules.fill(l.text, J, l.get("args", {})))
		return
	_after_lines()


func _after_lines() -> void:
	var n: Dictionary = nodes[cur_id]
	if n.has("check"):
		_begin_check(n.check)
		return
	_choices = n.get("choices", []).filter(func(c): return Rules.test(c.get("when"), J))
	if not _choices.is_empty():
		waiting = "choice"
		choices.emit(_choices.map(func(c): return {
			"text": Rules.fill(c.text, J, c.get("args", {})),
			"sub": Rules.fill(c.sub, J) if c.has("sub") else "",
			"why": "" if Rules.test(c.get("req"), J) else Rules.fill(c.get("req_text", "ui.req.default"), J),
			"check": _check_info(c.check) if c.has("check") else {}}))
		return
	if n.has("goto"):
		_enter(n.goto)
	else:
		_finish()


## 玩家看完一句台詞，按鍵進下一句
func advance() -> void:
	if waiting == "line":
		_next_line()


func choose(i: int) -> void:
	if waiting != "choice" or i < 0 or i >= _choices.size():
		return
	var c: Dictionary = _choices[i]
	if not Rules.test(c.get("req"), J):
		return
	waiting = ""
	_apply(c.get("effects", []))
	if J.S.over:
		_finish()
		return
	if c.has("check"):
		_begin_check(c.check)
	elif c.has("goto"):
		_enter(c.goto)
	else:
		_finish()


func _check_info(spec: Dictionary) -> Dictionary:
	return {"attr": spec.attr, "level": int(J.S.attr.get(spec.attr, 1)), "chance": Checks.chance(J, spec.attr, int(spec.get("bonus", 0))),
		"text": Rules.fill(spec.text, J) if spec.has("text") else ""}


func _begin_check(spec: Dictionary) -> void:
	_check = spec
	waiting = "check"
	check_started.emit(_check_info(spec))


## 判定欄的骰子停下來時呼叫
func roll_check() -> void:
	if waiting != "check":
		return
	waiting = ""
	var res := Checks.roll(J, Checks.chance(J, _check.attr, int(_check.get("bonus", 0))))
	check_resolved.emit(res)
	_enter(_check.win if res.win else _check.lose)


func _finish() -> void:
	cur_id = ""
	waiting = ""
	finished.emit()
