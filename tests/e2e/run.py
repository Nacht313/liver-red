"""端對端測試：用真的瀏覽器打開場景，照玩家的方式走一遍。

用法：python3 tests/e2e/run.py            （需要 pip install playwright && playwright install chromium）
截圖會存到 tests/e2e/out/。失敗時結束碼不是 0。
"""
import asyncio, functools, http.server, pathlib, sys, threading

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'tests/e2e/out'
PORT = 8765


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


failures = []
def check(ok, msg):
    print(('  ok   ' if ok else '  FAIL ') + msg)
    if not ok: failures.append(msg)


async def state(pg, expr):
    return await pg.evaluate(f'() => {expr}')


async def hold(pg, key, ms):
    await pg.keyboard.down(key); await pg.wait_for_timeout(ms); await pg.keyboard.up(key)


async def desktop(br):
    print('桌面 1200x900')
    pg = await br.new_page(viewport={'width': 1200, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)
    await pg.goto(f'http://127.0.0.1:{PORT}/galata.html')
    await pg.wait_for_function('() => window.__game')
    await pg.wait_for_timeout(600)
    await pg.locator('.stage').screenshot(path=OUT / 'd0-start.png')

    # 走到 simit 小販，應該出現 E 提示
    await state(pg, 'window.__game.S.tx = 330')
    await pg.wait_for_function('() => window.__game.S.tx === null', timeout=10000)
    await pg.wait_for_timeout(150)
    check(not await pg.locator('#act').is_hidden(), '靠近 simit 小販出現 E 提示')
    check('Simit' in await pg.inner_text('#act'), '提示寫著 spot 名稱')
    await pg.keyboard.press('e')
    await pg.wait_for_timeout(150)
    check('Simit 小販' in await pg.inner_text('#sheet h2'), '按 E 打開互動卡')
    await pg.locator('.stage').screenshot(path=OUT / 'd1-card.png')

    # 猜單字：點 Merhaba，用手機翻譯
    await pg.locator('#sheet .w[data-k="merhaba"]').click()
    await pg.locator('.pop button[data-o="__phone"]').click()
    check(await state(pg, "!!window.__game.S.words['merhaba']"), '用手機翻譯學會 merhaba')
    check(await pg.locator('#sheet .w.known').count() >= 1, '學會的字在對話裡變成已知')

    # 用 Enter 選第一個可選的選項（比手勢買）
    await pg.keyboard.press('2'); await pg.wait_for_timeout(100)
    check(await state(pg, 'window.__game.S.money') == 1175, '比手勢買 simit 扣 ₺25')
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
    check(await pg.locator('#sheet').is_hidden(), '選離開後卡片關閉')

    # 等到日落，叫拜事件
    for _ in range(8):
        if not await pg.locator('#sheet').is_hidden(): break
        await pg.click('#wait'); await pg.wait_for_timeout(60)
    check('日落叫拜' in await pg.inner_text('#sheet h2'), '等到 20:38 觸發日落叫拜')
    await pg.keyboard.press('3'); await pg.wait_for_timeout(100)

    # 往右走過擦鞋匠
    await state(pg, 'window.__game.S.x = 820')
    await hold(pg, 'ArrowRight', 1500)
    check('擦鞋匠' in await pg.inner_text('#sheet h2'), '往右經過觸發擦鞋匠事件')
    await pg.keyboard.press('2'); await pg.wait_for_timeout(100)
    await pg.keyboard.press('1'); await pg.wait_for_timeout(100)

    # 入夜的畫面
    await state(pg, 'window.__game.advance(40)')
    await pg.wait_for_timeout(300)
    await pg.locator('.stage').screenshot(path=OUT / 'd2-night.png')
    await pg.click('#dbg'); await pg.wait_for_timeout(200)
    await pg.locator('.stage').screenshot(path=OUT / 'd3-debug.png')
    check(await pg.locator('#spotTable tbody tr').count() == 10, 'spot 設定表列出 10 個 spot')
    check(not errors, '沒有 JS 錯誤' + (f'：{errors[:3]}' if errors else ''))
    await pg.close()


async def phone(br):
    print('手機 400x860')
    pg = await br.new_page(viewport={'width': 400, 'height': 860}, device_scale_factor=2)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    await pg.goto(f'http://127.0.0.1:{PORT}/galata.html')
    await pg.wait_for_function('() => window.__game')
    await state(pg, 'window.__game.S.tx = 120')
    await pg.wait_for_function('() => window.__game.S.tx === null', timeout=10000)
    await pg.wait_for_timeout(150)
    await pg.locator('#act').click(force=True)
    await pg.wait_for_timeout(150)
    check(not await pg.locator('#sheet').is_hidden(), '手機點提示框可以互動')
    await pg.screenshot(path=OUT / 'm0-card.png')
    check(await state(pg, 'document.documentElement.scrollWidth') <= 400, '手機沒有橫向捲動')
    check(not errors, '手機沒有 JS 錯誤')
    await pg.close()


async def opening(br, width, height, tag):
    """開幕：從標題玩到走出機場、進市區。選項用數字鍵和點擊混著操作。"""
    print(f'開幕 {width}x{height}')
    pg = await br.new_page(viewport={'width': width, 'height': height})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    await pg.goto(f'http://127.0.0.1:{PORT}/index.html')
    await pg.wait_for_function('() => window.__journey')
    await pg.evaluate('() => localStorage.clear()')

    async def pick(text):
        btn = pg.locator('#ch .c:not([disabled])', has_text=text).first
        await btn.click()
        await pg.wait_for_timeout(30)

    async def node():
        return await state(pg, 'window.__journey.F.cur.id')

    check('豬肝紅冒險' in await pg.inner_text('#text'), '標題畫面')
    await pg.screenshot(path=OUT / f'{tag}0-title.png')
    await pg.keyboard.press('1')  # 新的旅程
    await pg.wait_for_timeout(50)
    check(await node() == 'intro', '數字鍵 1 開始新的旅程')
    for t in ['走出房間', '50,000', '睡覺']:
        await pick(t)
    check(await node() == 'prep', '進到出發前大廳')
    check(not await pg.locator('#menu').is_hidden(), '側欄選單出現')
    await pg.screenshot(path=OUT / f'{tag}1-prep.png', full_page=True)

    for t in ['選第一站', '泰國・曼谷', '訂交通', '全服務', '五天後', '訂住宿', '考山路青旅', '3 晚', '去銀行', '換 ¥1,000']:
        await pick(t)
    await pick('整理背包')
    await pg.locator('select[data-id="laptop"]').select_option('mid')
    check('大背包中層' in await pg.inner_text('#text'), '背包選單可以改位置')
    await pg.screenshot(path=OUT / f'{tag}2-pack.png', full_page=True)
    await pick('完成')

    for _ in range(40):
        S = await state(pg, '({day: window.__journey.J.S.day, dep: window.__journey.J.S.dep, tdac: window.__journey.J.S.tdac})')
        if S['day'] >= S['dep']:
            break
        if not S['tdac'] and S['dep'] - S['day'] <= 3:
            await pick('辦出國'); await pick('TDAC'); await pick('填好'); await pick('返回')
        has_sleep = await pg.locator('#ch .c:not([disabled])', has_text='睡覺').count()
        await pick('睡覺' if has_sleep else '休息')
    for t in ['出發', '出門', '過邊檢', '旅遊', '登機', '下飛機']:
        await pick(t)
    await pg.locator('#ch .c:not([disabled])').first.click()
    check(await node() == 'stamp', '泰國入境蓋章')
    check(await state(pg, "!!localStorage.getItem('zgh_stamp')"), '入境章存檔')
    await pg.screenshot(path=OUT / f'{tag}3-stamp.png', full_page=True)

    await pg.click('#mPass')
    check('泰國' in await pg.inner_text('#ovb'), '護照面板看得到章')
    await pg.keyboard.press('Escape')
    for t in ['走出', '官方計程車', '抵達']:
        await pick(t)
    check(await node() == 'city', '走出機場，進到市區')
    await pg.screenshot(path=OUT / f'{tag}4-city.png', full_page=True)
    check(await state(pg, 'document.documentElement.scrollWidth') <= width, '沒有橫向捲動')
    check(not errors, '沒有 JS 錯誤：' + '; '.join(errors))
    await pg.close()


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        await desktop(br)
        await phone(br)
        await opening(br, 1200, 900, 'o')
        await opening(br, 390, 844, 'om')
        await br.close()
    srv.shutdown()
    print(f'\n{"全部通過" if not failures else f"{len(failures)} 項失敗"}')
    sys.exit(1 if failures else 0)


asyncio.run(main())
