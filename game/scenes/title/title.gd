## 標題畫面。文字一律用翻譯代號，Label 會自動翻譯。
extends Control


func _ready() -> void:
	get_window().title = tr("ui.app.name")
