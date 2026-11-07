## 時段打光（室內）：依照幾點算出光線參數。背景和前景用同一組參數（CLAUDE.md：同一場景只用一張底圖）。
## 數值都是 0 到 1，而且隨時間連續變化，不會突然跳。
##   ambient：整體亮度；lamp：室內燈；warm：日出日落的暖光；window_glow：窗外的夜景燈火；tint：整體色調
class_name Lighting
extends RefCounted


## 從 a 到 b 平滑地從 0 變到 1
static func up(a: float, b: float, x: float) -> float:
	return smoothstep(a, b, x)


static func params(h: float) -> Dictionary:
	var day := up(4.5, 7.5, h) * (1.0 - up(16.5, 19.5, h))
	var x := h if h >= 12.0 else h + 24.0  # 把凌晨接在晚上後面，燈才會跨過半夜慢慢關
	var lamp := up(17.0, 20.0, x) * (1.0 - up(23.0, 26.0, x))
	var warm := maxf(up(15.0, 18.0, h) * (1.0 - up(18.0, 21.0, h)), up(4.0, 7.0, h) * (1.0 - up(7.0, 10.0, h)))
	var ambient := clampf(0.42 + 0.58 * day + 0.22 * lamp * (1.0 - day), 0.0, 1.0)
	var night_tint := Color(0.62, 0.66, 0.95)
	var lamp_tint := Color(1.0, 0.86, 0.66)
	var warm_tint := Color(1.0, 0.78, 0.6)
	var tint := Color.WHITE.lerp(night_tint, 1.0 - day)
	tint = tint.lerp(lamp_tint, 0.6 * lamp * (1.0 - day))
	tint = tint.lerp(warm_tint, 0.5 * warm)
	return {"ambient": ambient, "lamp": lamp, "warm": warm, "window_glow": 1.0 - day, "day": day,
		"tint": Color(tint.r * ambient, tint.g * ambient, tint.b * ambient)}
