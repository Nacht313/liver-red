## 聲音：音效（合成的，game/audio/sfx/）和背景音樂（game/audio/music/，CC0，作者寫在 CREDITS.md）。
## 找不到檔案時安靜略過，不會報錯（音樂還沒到位也能玩）。
class_name GameAudio
extends Node

const SFX_NAMES := ["blip_low", "blip_mid", "blip_high", "step_1", "step_2", "step_3", "step_4", "door_open", "door_close",
	"select", "confirm", "cancel", "dice", "check_win", "check_lose", "page_flip", "phone_tap", "shutter", "stamp",
	"zipper", "day_card"]
const VOICES := {"low": "blip_low", "mid": "blip_mid", "high": "blip_high"}
const POOL := 6

var _sfx: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _music: AudioStreamPlayer
var _music_name := ""


func _init() -> void:
	for n in SFX_NAMES:
		var path := "res://audio/sfx/%s.wav" % n
		if ResourceLoader.exists(path):
			_sfx[n] = load(path)
	for i in POOL:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_music = AudioStreamPlayer.new()
	_music.volume_db = -10.0
	add_child(_music)


func play_sfx(name: String, pitch := 1.0, volume_db := 0.0) -> void:
	if not _sfx.has(name):
		return
	var p := _players[_next]
	_next = (_next + 1) % POOL
	p.stream = _sfx[name]
	p.pitch_scale = pitch
	p.volume_db = volume_db
	p.play()


## 說話聲：每個角色音高不同，每次再隨機偏一點
func blip(voice: String) -> void:
	play_sfx(VOICES.get(voice, "blip_mid"), randf_range(0.95, 1.05), -6.0)


func play_music(name: String, fade := 1.0) -> void:
	if name == _music_name:
		return
	var path := ""
	for ext in ["ogg", "mp3", "wav"]:
		var p := "res://audio/music/%s.%s" % [name, ext]
		if ResourceLoader.exists(p):
			path = p
	if path == "":
		return
	_music_name = name
	_music.stream = load(path)
	_music.volume_db = -40.0
	_music.play()
	create_tween().tween_property(_music, "volume_db", -10.0, fade)


func stop_music(fade := 1.0) -> void:
	_music_name = ""
	var t := create_tween()
	t.tween_property(_music, "volume_db", -40.0, fade)
	t.tween_callback(_music.stop)
