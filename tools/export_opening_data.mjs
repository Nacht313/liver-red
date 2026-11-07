// 網頁版開幕資料 → Godot：game/data/opening/<表>.json ＋ game/i18n/strings.csv 的自動區段。
// 中文欄位一律換成文字代號（<表>.<id>.<欄位>），中文本身寫進翻譯表；數字原封不動。
// 用法：npm run export:godot　　（改了 src/story/opening/data.js 之後要重跑）
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as D from '../src/story/opening/data.js';

export const OUT_DIR = 'game/data/opening';
export const CSV_PATH = 'game/i18n/strings.csv';
export const BEGIN = '# BEGIN generated: npm run export:godot';
export const END = '# END generated';

const CJK = /[㐀-鿿　-〿＀-￯]/;
const RENAME = { n: 'name', d: 'desc' };
export const ATTR_IDS = ['knowledge', 'nerve', 'craft', 'empathy', 'charm']; // 學識、膽識、手藝、共情、魅力

/** 表名（JSON 檔名）→ [資料, 代號前綴] */
const TABLES = {
  know: [D.KNOW, 'know'], research: [D.RESEARCH, 'research'], items: [D.ITEMS, 'item'], layers: [D.LAYERS, 'layer'],
  trans: [D.TRANS, 'trans'], flight: [D.FLIGHT, 'flight'], stays: [D.STAYK, 'stay'], nights: [D.NIGHTS, 'nights'],
  hosts: [D.HOSTS, 'host'], stops: [D.STOPS, 'stop'], family: [D.FAMILY_MSGS.map(([from, text]) => ({ from, text })), 'family'],
  tips: [D.TIPS, 'tip'], endings: [D.ENDINGS, 'ending'],
};

/** 純函式：回傳 { files: {表名: 物件}, strings: [[代號, 中文], ...] } */
export function buildExport() {
  const strings = [];
  const conv = (v, key) => {
    if (typeof v === 'string') {
      if (!CJK.test(v)) return v;
      strings.push([key, v]);
      return key;
    }
    if (Array.isArray(v)) return v.map((x, i) => conv(x, `${key}.${x && typeof x === 'object' && x.id ? x.id : i}`));
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, x] of Object.entries(v)) out[RENAME[k] || k] = conv(x, `${key}.${RENAME[k] || k}`);
      return out;
    }
    return v;
  };
  const files = {};
  for (const [name, [data, prefix]] of Object.entries(TABLES)) files[name] = conv(data, prefix);
  for (const [id, size] of Object.entries(D.ITEM_SIZE)) if (files.items[id]) files.items[id].size = size;
  for (const id of D.ITEM_WORN) files.items[id].worn = 1;
  files.constants = {
    FX: D.FX, BANK_THB_PER_CNY: D.BANK_THB_PER_CNY, AIRPORT_THB_PER_CNY: D.AIRPORT_THB_PER_CNY,
    PACK_KG: D.PACK_KG, DAY_KG: D.DAY_KG, CABIN_LIMIT_KG: D.CABIN_LIMIT_KG,
    EXTRA_BAG_ONLINE: D.EXTRA_BAG_ONLINE, EXTRA_BAG_COUNTER: D.EXTRA_BAG_COUNTER, LAST_MINUTE: D.LAST_MINUTE,
    START_DATE_UTC: D.START_DATE_UTC, LAYER_GRID: D.LAYER_GRID, DEFAULT_PACK: D.DEFAULT_PACK,
    ATTRS: ATTR_IDS,
  };
  // 屬性：Godot 版用英文代號當鍵，名字進翻譯表（順序和網頁版 ATTRS 一樣）
  D.ATTRS.forEach((zh, i) => strings.push([`attr.${ATTR_IDS[i]}.name`, zh]));
  return { files, strings };
}

const csvCell = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** 把自動區段換進 strings.csv，手寫的列保留 */
export function mergeCsv(csv, strings) {
  const block = [BEGIN, ...strings.map(([k, zh]) => `${k},${csvCell(zh)}`), END].join('\n');
  const a = csv.indexOf(BEGIN), b = csv.indexOf(END);
  if (a >= 0 && b > a) return csv.slice(0, a) + block + csv.slice(b + END.length);
  return csv.replace(/\n*$/, '\n') + block + '\n';
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { files, strings } = buildExport();
  mkdirSync(root + OUT_DIR, { recursive: true });
  for (const [name, obj] of Object.entries(files)) writeFileSync(`${root}${OUT_DIR}/${name}.json`, JSON.stringify(obj, null, 1) + '\n');
  const csv = readFileSync(root + CSV_PATH, 'utf8');
  writeFileSync(root + CSV_PATH, mergeCsv(csv, strings));
  console.log(`寫出 ${Object.keys(files).length} 個 JSON、${strings.length} 個文字代號`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
