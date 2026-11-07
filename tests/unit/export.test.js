// 網頁版資料 → Godot（game/data/opening/*.json ＋ strings.csv 的自動區段）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildExport, OUT_DIR, CSV_PATH, BEGIN, END } from '../../tools/export_opening_data.mjs';

const CJK = /[㐀-鿿　-〿＀-￯]/;

function walk(v, fn) {
  if (Array.isArray(v)) v.forEach((x) => walk(x, fn));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, fn));
  else fn(v);
}

test('export: 每個中文欄位都變成代號，且代號出現在翻譯表', () => {
  const { files, strings } = buildExport();
  const keys = new Map(strings);
  walk(files, (v) => {
    if (typeof v !== 'string') return;
    assert.ok(!CJK.test(v), `JSON 裡還有中文：${v}`);
  });
  assert.equal(files.items.passport.name, 'item.passport.name');
  assert.equal(keys.get('item.passport.name'), '護照');
  assert.equal(files.know.k_tdac, 'know.k_tdac');
  assert.equal(files.family[0].from, 'family.0.from');
  assert.equal(keys.get('family.0.from'), '媽媽');
  assert.ok(strings.every(([k, zh]) => k && zh), '每個代號都有中文');
  assert.equal(new Set(strings.map(([k]) => k)).size, strings.length, '代號不重複');
});

test('export: 數字和 data.js 一致', () => {
  const { files } = buildExport();
  assert.equal(files.trans.fsc.p, 1700);
  assert.equal(files.items.laptop.kg, 1.9);
  assert.equal(files.constants.CABIN_LIMIT_KG, 7);
  assert.equal(files.constants.FX.THB, 4.55);
  assert.deepEqual(files.constants.LAYER_GRID.mid, [5, 4]);
  assert.deepEqual(files.items.laptop.size, [3, 1]);
  assert.deepEqual(files.nights[2], [7, 0.9, 0]);
});

test('export: 重跑兩次結果相同，而且磁碟上的檔案是最新的', () => {
  const a = buildExport(), b = buildExport();
  assert.deepEqual(a, b);
  for (const [name, obj] of Object.entries(a.files)) {
    const disk = JSON.parse(readFileSync(new URL(`${OUT_DIR}/${name}.json`, import.meta.url.replace(/tests\/unit\/.*/, ''))));
    assert.deepEqual(disk, obj, `game/data/opening/${name}.json 過期了，請跑 npm run export:godot`);
  }
  const csv = readFileSync(new URL(CSV_PATH, import.meta.url.replace(/tests\/unit\/.*/, '')), 'utf8');
  assert.ok(csv.includes(BEGIN) && csv.includes(END), 'strings.csv 要有自動區段');
  for (const [k] of a.strings) assert.ok(csv.includes('\n' + k + ','), `strings.csv 少了 ${k}`);
});

test('export: 亞洲地圖（原型的經緯度資料算成網格）', () => {
  const { files, strings } = buildExport();
  const m = files.asia_map;
  assert.ok(m.rows.length > 50 && m.rows[0].length > 100, '網格夠大');
  const cells = m.rows.join('').replace(/\./g, '').length;
  assert.ok(cells > 2000, `陸地格子數 ${cells}`);
  const th = m.countries.findIndex((c) => c.code === 'TH');
  assert.equal(m.countries[th].st, 'free');
  const bkk = m.cities.find((c) => c.id === 'bkk');
  assert.equal(bkk.open, 1);
  assert.equal(bkk.name, 'city.bkk.name');
  assert.ok(new Map(strings).get('country.TH.name') === '泰國');
  assert.ok(new Map(strings).get('city.bkk.desc').includes('考山路'));
});
