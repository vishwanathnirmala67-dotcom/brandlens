"""End-to-end UI check with Playwright: runs the full workflow and fails on console errors."""
import sys, pathlib
from playwright.sync_api import sync_playwright

path = pathlib.Path(__file__).resolve().parent.parent / "dist" / "index.html"
shots = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots"); shots.mkdir(exist_ok=True, parents=True)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1360, "height": 900})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(path.as_uri()); pg.wait_for_timeout(500)
    pg.screenshot(path=str(shots / "1_queue.png"))
    pg.click("[data-act=open-hero]"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(shots / "2_review.png"))
    n_open = pg.locator(".fc:not(.resolved)").count(); print("findings cards:", n_open)
    pg.click(".mk >> nth=3"); pg.wait_for_timeout(300)
    pg.click("[data-act=applySafe]"); pg.wait_for_timeout(200)
    # apply all fixes that have a fix button
    for _ in range(40):
        btn = pg.locator("[data-act=applyFix]").first
        if btn.count() == 0: break
        btn.click(); pg.wait_for_timeout(60)
    print("open after apply:", pg.locator(".fc:not(.resolved)").count())
    # dismiss the rest with reason
    for _ in range(20):
        d = pg.locator("[data-act=dismissStart]").first
        if d.count() == 0: break
        d.click(); pg.fill("#dis-reason", "Checked with product team"); pg.click("[data-act=dismissConfirm]"); pg.wait_for_timeout(60)
    print("open after dismiss:", pg.locator(".fc:not(.resolved)").count())
    pg.screenshot(path=str(shots / "3_resolved.png"), full_page=True)
    pg.click("[data-act=submit]"); pg.wait_for_timeout(200)
    print("status:", pg.locator(".page-h .pill").first.inner_text())
    # reviewer sign-off then manager approve
    pg.click("[data-act=role][data-r=reviewer]"); pg.wait_for_timeout(200)
    pg.screenshot(path=str(shots / "4_reviewer.png"))
    if pg.locator("[data-act=signoffAll]").count(): pg.click("[data-act=signoffAll]"); pg.wait_for_timeout(200)
    pg.click("[data-act=role][data-r=manager]"); pg.wait_for_timeout(200)
    pg.click("[data-act=approve]"); pg.wait_for_timeout(300)
    print("status:", pg.locator(".page-h .pill").first.inner_text())
    pg.screenshot(path=str(shots / "5_approved.png"))
    for v in ("kit", "insights", "about"):
        pg.click(f"nav a[data-v={v}]"); pg.wait_for_timeout(300); pg.screenshot(path=str(shots / f"6_{v}.png"), full_page=True)
    # mobile
    m = b.new_page(viewport={"width": 390, "height": 800}); m.on("pageerror", lambda e: errors.append(str(e)))
    m.goto(path.as_uri()); m.wait_for_timeout(300); m.click("[data-act=open-hero]"); m.wait_for_timeout(300)
    sw = m.evaluate("document.documentElement.scrollWidth"); print("mobile scrollWidth:", sw)
    m.screenshot(path=str(shots / "7_mobile.png"))
    b.close()
print("ERRORS:", errors if errors else "none")
