## 時段打光：白天亮、晚上暗、傍晚開燈、深夜關燈，而且一路連續變化（不會突然跳）。
extends TestCase


func test_night_darker_than_day() -> void:
	ok(Lighting.params(22).ambient < Lighting.params(12).ambient, "晚上比中午暗")
	ok(Lighting.params(2).ambient < Lighting.params(22).ambient, "深夜關燈更暗")


func test_lamps_on_evening() -> void:
	ok(Lighting.params(20).lamp > 0.9, "晚上八點燈亮著")
	eq(Lighting.params(12).lamp, 0.0, "中午不開燈")
	ok(Lighting.params(2).lamp < 0.05, "半夜兩點燈關了")


func test_warm_at_dusk() -> void:
	ok(Lighting.params(18).warm > Lighting.params(12).warm, "傍晚偏暖")


func test_continuous() -> void:
	var prev := Lighting.params(0.0)
	var h := 0.25
	while h <= 24.0:
		var p := Lighting.params(fmod(h, 24.0))
		for k in ["ambient", "lamp", "warm", "window_glow"]:
			ok(absf(p[k] - prev[k]) < 0.15, "%s 在 %.2f 點跳太多：%.3f → %.3f" % [k, h, prev[k], p[k]])
		prev = p
		h += 0.25


func test_tint_is_a_color() -> void:
	var c: Color = Lighting.params(19).tint
	ok(c.r >= c.b, "黃昏的色調偏暖")
