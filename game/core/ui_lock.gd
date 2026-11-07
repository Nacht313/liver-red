## 一次只開一個介面：對話、判定、手機、背包、日記本、卡片。
## 開介面前 request()，關掉時 release()；有介面開著時主角不能走。
class_name UiLock
extends RefCounted

signal changed(open: String)

var open := ""


func can_move() -> bool:
	return open == ""


func request(kind: String) -> bool:
	if open != "" and open != kind:
		return false
	open = kind
	changed.emit(open)
	return true


func release(kind: String) -> void:
	if open == kind:
		open = ""
		changed.emit(open)


## 讀檔、結局時全部關掉
func clear() -> void:
	open = ""
	changed.emit(open)


## 結局時把介面全部關掉（錢花光、精力歸零⋯⋯）
func follow_endings(J: Journey) -> void:
	J.ended.connect(func(_kind): clear())
