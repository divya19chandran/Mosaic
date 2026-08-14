from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 900, "height": 700})
    page.goto("http://127.0.0.1:8931/blog/building-hobbies-ai-first.html")
    page.wait_for_timeout(300)
    lists = page.query_selector_all(".post-body ul.list-centered")
    print("lists found:", len(lists))
    for i, ul in enumerate(lists):
        ul.scroll_into_view_if_needed()
        ul.screenshot(path=f"/sessions/vibrant-compassionate-newton/applied_list_{i+1}.png")
    browser.close()
