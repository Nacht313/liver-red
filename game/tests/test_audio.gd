## 音效：清單上的每個音效都存在、長度合理；找不到音樂時安靜略過。
extends TestCase

const SFX := ["blip_low", "blip_mid", "blip_high", "step_1", "step_2", "step_3", "step_4", "door_open", "door_close",
	"select", "confirm", "cancel", "dice", "check_win", "check_lose", "page_flip", "phone_tap", "shutter", "stamp",
	"zipper", "day_card"]


func test_all_sfx_exist() -> void:
	for n in SFX:
		var path := "res://audio/sfx/%s.wav" % n
		ok(ResourceLoader.exists(path), "音效 %s" % n)
		if ResourceLoader.exists(path):
			var s: AudioStream = load(path)
			var len := s.get_length()
			ok(len >= 0.02 and len <= 2.0, "%s 長度 %.3f 秒" % [n, len])


func test_audio_list_matches() -> void:
	eq(GameAudio.SFX_NAMES, SFX, "Audio 認得的音效和檔案清單一致")


func test_missing_music_is_silent() -> void:
	var a := GameAudio.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(a)
	a.play_music("nope")
	ok(true, "找不到音樂不會出錯")
	a.play_sfx("confirm")
	a.blip("mid")
	a.queue_free()
