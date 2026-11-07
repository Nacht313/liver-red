## 測試用的 assert 小工具。每個測試檔 extends TestCase，方法名稱以 test_ 開頭。
class_name TestCase
extends RefCounted

var fail_count := 0
var failures: Array[String] = []


func ok(cond: bool, msg: String = "") -> void:
	if not cond:
		fail_count += 1
		failures.append(msg)


func eq(a: Variant, b: Variant, msg: String = "") -> void:
	if same(a, b):
		return
	if typeof(a) != typeof(b) and not (_is_num(a) and _is_num(b)):
		ok(false, "%s：型別不同 %s vs %s（%s vs %s）" % [msg, type_string(typeof(a)), type_string(typeof(b)), str(a), str(b)])
		return
	if _is_num(a) and _is_num(b):
		ok(absf(float(a) - float(b)) < 1e-6, "%s：期望 %s，得到 %s" % [msg, str(b), str(a)])
		return
	ok(a == b, "%s：期望 %s，得到 %s" % [msg, str(b), str(a)])


## 寬鬆相等：整數和小數、String 和 StringName、陣列和字典逐項比較
static func same(a: Variant, b: Variant) -> bool:
	if _is_num(a) and _is_num(b):
		return absf(float(a) - float(b)) < 1e-6
	if _is_str(a) and _is_str(b):
		return String(a) == String(b)
	if typeof(a) == TYPE_ARRAY and typeof(b) == TYPE_ARRAY:
		if a.size() != b.size():
			return false
		for i in a.size():
			if not same(a[i], b[i]):
				return false
		return true
	if typeof(a) == TYPE_DICTIONARY and typeof(b) == TYPE_DICTIONARY:
		if a.size() != b.size():
			return false
		for k in a:
			if not b.has(k) or not same(a[k], b[k]):
				return false
		return true
	return typeof(a) == typeof(b) and a == b


static func _is_str(v: Variant) -> bool:
	return typeof(v) == TYPE_STRING or typeof(v) == TYPE_STRING_NAME


static func _is_num(v: Variant) -> bool:
	return typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT
