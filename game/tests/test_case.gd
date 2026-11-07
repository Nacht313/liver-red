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
	if typeof(a) != typeof(b) and not (_is_num(a) and _is_num(b)):
		ok(false, "%s：型別不同 %s vs %s（%s vs %s）" % [msg, type_string(typeof(a)), type_string(typeof(b)), str(a), str(b)])
		return
	if _is_num(a) and _is_num(b):
		ok(absf(float(a) - float(b)) < 1e-6, "%s：期望 %s，得到 %s" % [msg, str(b), str(a)])
		return
	ok(a == b, "%s：期望 %s，得到 %s" % [msg, str(b), str(a)])


func _is_num(v: Variant) -> bool:
	return typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT
