"""Real Chromium + candidate build, synthetic local API fixtures, no production calls."""
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

OUT = Path("evidence")
OUT.mkdir(exist_ok=True)
BASE = "http://127.0.0.1:4173"
API = "http://127.0.0.1:8899"
PREVIEW = {
    "id": 900001, "slug": "news-a", "title": "News reader acceptance story",
    "summary": "Controlled reader fixture, not a published sports report.",
    "sport": "football", "league": "england-premier-league", "league_label": "Premier League",
    "image_url": None, "published_at": "2026-09-25T10:00:00Z", "created_at": "2026-09-25T10:00:00Z",
}
BODY = "This controlled paragraph verifies that the complete article replaces its preview after a successful retry. It exists only in an isolated browser test."
BODY_B = "This second controlled paragraph belongs only to the next article. The preceding story must not remain on screen."
FULL = {**PREVIEW, "content": BODY, "blocks": [{"type": "paragraph", "text": BODY}], "next": {"slug": "news-b", "title": "Second reader acceptance story"}}
SECOND = {**PREVIEW, "id": 900002, "slug": "news-b", "title": "Second reader acceptance story", "content": BODY_B, "blocks": [{"type": "paragraph", "text": BODY_B}], "next": None}

for _ in range(60):
    try:
        with urlopen(BASE, timeout=1) as response:
            if response.status == 200:
                break
    except OSError:
        time.sleep(0.3)
else:
    raise RuntimeError("Local preview did not start")

report = {"mode": "candidate Chromium with synthetic local API fixtures; NOT production acceptance", "cases": []}
with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for width in [1440, 390, 320]:
        context = browser.new_context(viewport={"width": width, "height": 900}, locale="en-GB")
        state = {"ready": False, "requests": [], "unexpected_external": [], "js_errors": []}
        page = context.new_page()
        page.on("pageerror", lambda error: state["js_errors"].append(str(error)))

        def route_request(route):
            request = route.request
            if request.url.startswith(BASE):
                return route.continue_()
            if not request.url.startswith(API + "/"):
                state["unexpected_external"].append(request.url)
                return route.abort()
            path = urlparse(request.url).path
            state["requests"].append({"method": request.method, "path": path})
            status, data = 200, []
            if request.method == "OPTIONS":
                data = {}
            elif path in ["/auth/session", "/auth/csrf"]:
                data = {"user": None, "csrf": "isolated-test-csrf"}
            elif path == "/auth/providers":
                data = {"password": True, "google": False, "facebook": False}
            elif path == "/portal/home":
                data = {"featured": [PREVIEW], "latest": [], "breaking": [], "most_read": [], "by_sport": {"football": [PREVIEW], "basketball": [], "tennis": [], "motorsport": []}, "by_league": [], "sports_data": {"connected": False}}
            elif path in ["/articles", "/articles/recent", "/articles/most-read"]:
                data = [PREVIEW] if path != "/articles/most-read" else []
            elif path == "/meta/sports":
                data = ["football"]
            elif path == "/meta/taxonomy":
                data = {"sports": []}
            elif path.endswith("/comments"):
                data = {"count": 0, "comments": []}
            elif path.endswith("/related"):
                data = []
            elif path.endswith("/view"):
                data = {"ok": True, "counted": True}
            elif path == "/articles/news-a":
                status, data = (200, FULL) if state["ready"] else (503, {"detail": "Controlled unavailable response"})
            elif path == "/articles/news-b":
                data = SECOND
            elif path == "/articles/news-empty":
                data = {**PREVIEW, "slug": "news-empty", "title": "Empty reader response", "blocks": [], "content": ""}
            headers = {"Access-Control-Allow-Origin": BASE, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS"}
            route.fulfill(status=status, content_type="application/json", headers=headers, body=json.dumps(data))

        context.route("**/*", route_request)
        try:
            page.goto(BASE + "/", wait_until="networkidle")
            lead = page.locator('a[href="/article/news-a"]').first
            lead.wait_for(state="visible")
            lead.click()
            page.locator(".article-page [role=alert]").wait_for(state="visible")
            assert page.locator(".article-page h1").inner_text() == PREVIEW["title"]
            assert page.locator(".article-body-skeleton").count() == 0
            state["ready"] = True
            page.get_by_role("button", name="Retry", exact=True).click()
            page.get_by_text(BODY, exact=True).wait_for(state="visible")
            assert page.locator(".article-page [role=alert]").count() == 0
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            assert not overflow, f"reader overflow at {width}px"
            page.screenshot(path=str(OUT / f"news-reader-{width}.png"), full_page=True)
            page.locator('a[href="/article/news-b"]').first.click()
            page.get_by_text(BODY_B, exact=True).wait_for(state="visible")
            assert page.get_by_text(BODY, exact=True).count() == 0
            assert page.locator(".article-page h1").inner_text() == SECOND["title"]
            page.goto(BASE + "/article/news-empty", wait_until="networkidle")
            page.locator(".article-page [role=alert]").wait_for(state="visible")
            assert page.get_by_role("button", name="Retry", exact=True).count() == 1
            assert not page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            assert not state["js_errors"], state["js_errors"]
            assert not [item for item in state["requests"] if item["path"].startswith("/sports-data/")], "News journey requested score data"
            assert not state["unexpected_external"], state["unexpected_external"]
            report["cases"].append({"width": width, "passed": True, "preview_failure_retry": True, "next_article_identity": True, "empty_response_notice": True, "horizontal_overflow": False, "js_errors": [], "api_requests": state["requests"]})
        except Exception as error:
            page.screenshot(path=str(OUT / f"news-reader-{width}-FAIL.png"), full_page=True)
            report["cases"].append({"width": width, "passed": False, "error": str(error), **state})
            raise
        finally:
            (OUT / "news-browser.json").write_text(json.dumps(report, indent=2) + "\n")
            context.close()
    browser.close()
print("NEWS_BROWSER_ACCEPTANCE " + json.dumps(report))
