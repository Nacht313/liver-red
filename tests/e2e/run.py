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
    await pg.goto(f'http://127.0.0.1:{PORT}/index.html')
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
    await pg.goto(f'http://127.0.0.1:{PORT}/index.html')
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


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        await desktop(br)
        await phone(br)
        await br.close()
    srv.shutdown()
    print(f'\n{"全部通過" if not failures else f"{len(failures)} 項失敗"}')
    sys.exit(1 if failures else 0)


asyncio.run(main())
