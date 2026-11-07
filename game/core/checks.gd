## 判定（極樂迪斯科式）：成功率和擲骰。公式照原型 prototypes/liver-red-demo-v3.html 的 chanceOf。
class_name Checks
extends RefCounted


## 成功率（%）：25 + 屬性×10 + (英語−2)×5 + (信念−50)÷5 + 加成，限制在 5 到 95
static func chance(J: Journey, attr: String, bonus := 0) -> int:
	var S := J.S
	var v := 25 + int(S.attr.get(attr, 1)) * 10 + roundi((S.eng - 2) * 5) + roundi((S.faith - 50) / 5.0) + bonus
	return clampi(v, 5, 95)


## 擲 1 到 100：小於等於成功率就成功；小於等於成功率的四分之一是大成功
static func roll(J: Journey, p: int) -> Dictionary:
	var r := 1 + int(floor(J.rand.call() * 100))
	r = clampi(r, 1, 100)
	return {"roll": r, "win": r <= p, "crit": r <= p / 4.0, "chance": p}
