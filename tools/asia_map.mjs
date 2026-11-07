// 亞洲地圖：從原型 prototypes/liver-red-demo-v3.html 讀出經緯度資料（MAPV、LAND、WATER、CTRY、CITIES、ST_COL、CITY_TXT），
// 照原型 mapCells() 的算法把陸地切成 0.75 度的格子，每格歸給最近的國家種子點。
// 輸出給 Godot：rows（每列一個字串，每個字元是國家編號，'.' 是海）＋ countries ＋ cities。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const PROTO = new URL('../prototypes/liver-red-demo-v3.html', import.meta.url);
const ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&*+-=?@^_~';

function loadPrototypeMap() {
  const html = readFileSync(PROTO, 'utf8');
  const grab = (name) => {
    const a = html.indexOf(`const ${name}=`);
    if (a < 0) throw new Error('原型裡找不到 ' + name);
    let i = html.indexOf('=', a) + 1, depth = 0;
    for (; i < html.length; i++) {
      const ch = html[i];
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') { depth--; if (depth === 0) break; }
    }
    return html.slice(a, i + 1) + ';';
  };
  const code = ['MAPV', 'LAND', 'WATER', 'CTRY', 'CITIES', 'ST_COL', 'CITY_TXT'].map(grab).join('\n')
    + '\n({MAPV, LAND, WATER, CTRY, CITIES, ST_COL, CITY_TXT})';
  return JSON.parse(JSON.stringify(vm.runInNewContext(code))); // 轉成一般物件（vm 的物件原型不同）
}

const pip = (x, y, p) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

/** 回傳 { map, strings }；strings 是 [[代號, 中文], ...] */
export function buildAsiaMap() {
  const { MAPV, LAND, WATER, CTRY, CITIES, ST_COL, CITY_TXT } = loadPrototypeMap();
  const codes = Object.keys(CTRY);
  if (codes.length > ALPHA.length) throw new Error('國家太多，編碼不夠用');
  const seeds = [];
  for (const k of codes) for (const s of CTRY[k].s) seeds.push([s[0], s[1], k]);
  const st = MAPV.step, rows = [];
  for (let lat = MAPV.lat1 - st / 2; lat > MAPV.lat0; lat -= st) {
    let row = '';
    for (let lon = MAPV.lon0 + st / 2; lon < MAPV.lon1; lon += st) {
      if (!LAND.some((p) => pip(lon, lat, p)) || WATER.some((p) => pip(lon, lat, p))) { row += '.'; continue; }
      let best = 1e9, k = '';
      const cl = Math.cos((lat * Math.PI) / 180);
      for (const s of seeds) {
        const d = ((s[0] - lon) * cl) ** 2 + (s[1] - lat) ** 2;
        if (d < best) { best = d; k = s[2]; }
      }
      row += ALPHA[codes.indexOf(k)];
    }
    rows.push(row);
  }
  const strings = [];
  const countries = codes.map((code) => {
    const c = CTRY[code];
    strings.push([`country.${code}.name`, c.n]);
    return { code, name: `country.${code}.name`, st: c.st || '', res: c.res || '' };
  });
  const cities = CITIES.map((c) => {
    strings.push([`city.${c.id}.name`, c.n]);
    if (CITY_TXT[c.id]) strings.push([`city.${c.id}.desc`, CITY_TXT[c.id]]);
    return { id: c.id, name: `city.${c.id}.name`, desc: CITY_TXT[c.id] ? `city.${c.id}.desc` : '', lon: c.lon, lat: c.lat, c: c.c, open: c.open ? 1 : 0 };
  });
  const map = { lon0: MAPV.lon0, lon1: MAPV.lon1, lat0: MAPV.lat0, lat1: MAPV.lat1, step: st, alphabet: ALPHA, rows, countries, cities, st_col: ST_COL };
  return { map, strings };
}
