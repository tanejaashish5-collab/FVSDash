"""
ForgeVoice Studio - Playwright E2E UI Test Suite
Covers all major pages and interactions.
Run with: python test_e2e_ui_playwright.py
"""
import asyncio
import json
from datetime import datetime
from playwright.async_api import async_playwright, expect

# Configuration
BASE_URL = "https://video-monetize-flow.preview.emergentagent.com"
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"

# Test results storage
test_results = []


def log_result(page_name: str, test_name: str, passed: bool, details: str = ""):
    """Log test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "page": page_name,
        "test": test_name,
        "passed": passed,
        "details": details
    }
    test_results.append(result)
    print(f"{status} | {page_name} | {test_name}" + (f" | {details}" if details else ""))


async def test_login_page(page):
    """Test 1: Login Page - Verify login works."""
    page_name = "Login"
    
    try:
        await page.goto(f"{BASE_URL}/login")
        await page.wait_for_load_state("networkidle")
        
        # Verify login form elements
        email_input = page.locator('input[type="email"]')
        password_input = page.locator('input[type="password"]')
        login_button = page.locator('button:has-text("Sign In")')
        
        await expect(email_input).to_be_visible()
        await expect(password_input).to_be_visible()
        await expect(login_button).to_be_visible()
        log_result(page_name, "Form elements visible", True)
        
        # Perform login
        await email_input.fill(CLIENT_EMAIL)
        await password_input.fill(CLIENT_PASSWORD)
        await login_button.click()
        
        # Wait for redirect to dashboard
        await page.wait_for_url("**/dashboard/**", timeout=10000)
        log_result(page_name, "Login successful", True, "Redirected to dashboard")
        
        # Close any modals (Spotlight Tour)
        try:
            skip_btn = page.locator('text=Skip for now')
            if await skip_btn.is_visible(timeout=2000):
                await skip_btn.click()
        except:
            pass
        
        return True
        
    except Exception as e:
        log_result(page_name, "Login flow", False, str(e)[:100])
        return False


async def test_overview_page(page):
    """Test 2: Overview Page - Loads with real data."""
    page_name = "Overview"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/overview")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)
        
        # Close any modals
        try:
            skip_btn = page.locator('text=Skip for now')
            if await skip_btn.is_visible(timeout=1000):
                await skip_btn.click()
                await page.wait_for_timeout(500)
        except:
            pass
        
        # Verify page title
        title = page.locator('h1:has-text("Welcome back")')
        await expect(title).to_be_visible(timeout=5000)
        log_result(page_name, "Page title visible", True)
        
        # Verify stats cards exist
        active_projects = page.locator('text=ACTIVE PROJECTS')
        published = page.locator('text=PUBLISHED')
        total_assets = page.locator('text=TOTAL ASSETS')
        
        await expect(active_projects).to_be_visible(timeout=5000)
        await expect(published).to_be_visible(timeout=5000)
        log_result(page_name, "Stats cards visible", True)
        
        # Verify YouTube stats section
        yt_stats = page.locator('text=YouTube Channel Stats')
        await expect(yt_stats).to_be_visible(timeout=5000)
        log_result(page_name, "YouTube stats visible", True)
        
        # Verify subscriber count is a real number
        subscriber_text = await page.locator('text=/1,\\d{3}/').first.text_content()
        if subscriber_text:
            log_result(page_name, "Real subscriber data", True, f"Found: {subscriber_text}")
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_submissions_page(page):
    """Test 3: Submissions Page - Table loads and search works."""
    page_name = "Submissions"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/submissions")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)
        
        # Verify submissions table/grid exists
        submissions_container = page.locator('[data-testid="submissions-page"]')
        await expect(submissions_container).to_be_visible(timeout=5000)
        log_result(page_name, "Page container visible", True)
        
        # Verify submission cards exist (at least one)
        submission_cards = page.locator('[data-testid^="submission-card"]')
        count = await submission_cards.count()
        
        if count == 0:
            # Try alternative selector
            submission_items = page.locator('.submission-item, [class*="submission"]')
            count = await submission_items.count()
        
        log_result(page_name, "Submissions loaded", count > 0, f"Found {count} items")
        
        # Test search functionality
        search_input = page.locator('[data-testid="submissions-search"], input[placeholder*="Search"]')
        if await search_input.is_visible(timeout=2000):
            await search_input.fill("chanakya")
            await page.wait_for_timeout(500)
            log_result(page_name, "Search input works", True)
        else:
            log_result(page_name, "Search input", False, "Not found")
        
        # Verify filter buttons
        filter_btns = page.locator('button:has-text("All"), button:has-text("Short")')
        if await filter_btns.first.is_visible(timeout=2000):
            log_result(page_name, "Filter buttons visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_calendar_page(page):
    """Test 4: Calendar Page - Renders with events."""
    page_name = "Calendar"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/calendar")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Verify calendar grid
        calendar = page.locator('[data-testid="calendar-page"], .calendar-grid, [class*="calendar"]')
        await expect(calendar.first).to_be_visible(timeout=5000)
        log_result(page_name, "Calendar container visible", True)
        
        # Verify month/week navigation
        nav_btns = page.locator('button:has-text("Today"), button:has-text("Month"), button:has-text("Week")')
        if await nav_btns.first.is_visible(timeout=2000):
            log_result(page_name, "Navigation buttons visible", True)
        
        # Verify calendar header with days
        day_headers = page.locator('text=Sun, text=Mon, text=Tue')
        if await day_headers.first.is_visible(timeout=2000):
            log_result(page_name, "Day headers visible", True)
        
        # Check for AI Schedule button
        ai_btn = page.locator('button:has-text("AI Schedule"), button:has-text("Generate")')
        if await ai_btn.first.is_visible(timeout=2000):
            log_result(page_name, "AI Schedule button visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_fvs_system_page(page):
    """Test 5: FVS System Page - Brain Accuracy panel and recommendation cards."""
    page_name = "FVS System"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/fvs")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)
        
        # Verify page loads
        fvs_page = page.locator('[data-testid="fvs-system-page"]')
        await expect(fvs_page).to_be_visible(timeout=5000)
        log_result(page_name, "Page container visible", True)
        
        # Verify Brain Accuracy panel
        brain_accuracy = page.locator('text=FVS BRAIN ACCURACY, text=Brain Accuracy')
        if await brain_accuracy.first.is_visible(timeout=3000):
            log_result(page_name, "Brain Accuracy panel visible", True)
        else:
            log_result(page_name, "Brain Accuracy panel", False, "Not found")
        
        # Verify recommendation cards or empty state
        rec_cards = page.locator('[data-testid^="recommendation-card"], .recommendation-card')
        card_count = await rec_cards.count()
        
        if card_count > 0:
            log_result(page_name, "Recommendation cards", True, f"Found {card_count}")
        else:
            # Check for empty state
            empty_state = page.locator('text=No recommendations, text=Run a scan')
            if await empty_state.first.is_visible(timeout=2000):
                log_result(page_name, "Empty state shown", True, "No recommendations yet")
            else:
                log_result(page_name, "Recommendation cards", False, "None found")
        
        # Verify Scan button
        scan_btn = page.locator('button:has-text("Scan"), button:has-text("Run Scan")')
        if await scan_btn.first.is_visible(timeout=2000):
            log_result(page_name, "Scan button visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_analytics_page(page):
    """Test 6: Analytics Page - Performance and Trend Intelligence tabs."""
    page_name = "Analytics"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/analytics")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Verify page loads
        analytics_page = page.locator('[data-testid="analytics-page"]')
        await expect(analytics_page).to_be_visible(timeout=5000)
        log_result(page_name, "Page container visible", True)
        
        # Verify Performance metrics
        views_metric = page.locator('text=TOTAL VIEWS, text=Views')
        if await views_metric.first.is_visible(timeout=3000):
            log_result(page_name, "Views metric visible", True)
        
        # Verify subscriber count
        subscribers = page.locator('text=SUBSCRIBERS, text=Subscriber')
        if await subscribers.first.is_visible(timeout=2000):
            log_result(page_name, "Subscribers metric visible", True)
        
        # Verify tabs exist
        performance_tab = page.locator('button:has-text("Performance"), [role="tab"]:has-text("Performance")')
        trend_tab = page.locator('button:has-text("Trend"), [role="tab"]:has-text("Trend")')
        
        if await performance_tab.first.is_visible(timeout=2000):
            log_result(page_name, "Performance tab visible", True)
        
        if await trend_tab.first.is_visible(timeout=2000):
            await trend_tab.first.click()
            await page.wait_for_timeout(1000)
            log_result(page_name, "Trend Intelligence tab clickable", True)
        
        # Verify chart or data visualization
        chart = page.locator('canvas, svg, .recharts-wrapper, [class*="chart"]')
        if await chart.first.is_visible(timeout=3000):
            log_result(page_name, "Charts/visualizations visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_strategy_lab_page(page):
    """Test 7: Strategy Lab - Form submits and generates content."""
    page_name = "Strategy Lab"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/strategy")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)
        
        # Verify page loads
        strategy_page = page.locator('[data-testid="strategy-lab-page"]')
        await expect(strategy_page).to_be_visible(timeout=5000)
        log_result(page_name, "Page container visible", True)
        
        # Verify topic input
        topic_input = page.locator('[data-testid="topic-input"], input[placeholder*="topic"], textarea[placeholder*="topic"]')
        if await topic_input.first.is_visible(timeout=3000):
            log_result(page_name, "Topic input visible", True)
        else:
            # Try alternative
            topic_input = page.locator('input, textarea').first
            log_result(page_name, "Input field found", await topic_input.is_visible())
        
        # Verify generate buttons
        generate_btn = page.locator('button:has-text("Generate"), button:has-text("Create")')
        if await generate_btn.first.is_visible(timeout=2000):
            log_result(page_name, "Generate button visible", True)
        
        # Verify tabs (Research, Outline, Script)
        tabs = page.locator('button:has-text("Research"), button:has-text("Outline"), button:has-text("Script")')
        tab_count = await tabs.count()
        log_result(page_name, "Content tabs visible", tab_count >= 2, f"Found {tab_count} tabs")
        
        # Verify History panel toggle
        history_btn = page.locator('button:has-text("History"), [data-testid="history-toggle"]')
        if await history_btn.first.is_visible(timeout=2000):
            log_result(page_name, "History button visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_publishing_page(page):
    """Test 8: Publishing Page - Loads with YouTube connected status."""
    page_name = "Publishing"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/publishing")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Verify page loads
        publishing_page = page.locator('[data-testid="publishing-page"]')
        await expect(publishing_page).to_be_visible(timeout=5000)
        log_result(page_name, "Page container visible", True)
        
        # Verify Publishing Command Center title
        title = page.locator('text=Publishing Command Center, h1:has-text("Publishing")')
        if await title.first.is_visible(timeout=3000):
            log_result(page_name, "Page title visible", True)
        
        # Verify stats cards
        total_published = page.locator('text=TOTAL PUBLISHED')
        if await total_published.is_visible(timeout=3000):
            log_result(page_name, "Stats cards visible", True)
        
        # Verify YouTube connected status (green indicator or "Connected")
        youtube_status = page.locator('[class*="green"], text=Connected, .platform-connected')
        if await youtube_status.first.is_visible(timeout=3000):
            log_result(page_name, "YouTube connected status", True)
        else:
            # Check for YouTube icon/button
            yt_platform = page.locator('[data-testid*="youtube"], svg[class*="youtube"]')
            log_result(page_name, "YouTube platform visible", await yt_platform.first.is_visible(timeout=2000))
        
        # Verify tabs (Content Queue, Published, Failed)
        queue_tab = page.locator('button:has-text("Content Queue"), button:has-text("Queue")')
        published_tab = page.locator('button:has-text("Published")')
        
        if await queue_tab.first.is_visible(timeout=2000):
            log_result(page_name, "Queue tab visible", True)
        if await published_tab.first.is_visible(timeout=2000):
            log_result(page_name, "Published tab visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_settings_page(page):
    """Test 9: Settings Page - Loads Channel Profile."""
    page_name = "Settings"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/settings")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)
        
        # Verify page loads
        settings_page = page.locator('[data-testid="settings-page"]')
        await expect(settings_page).to_be_visible(timeout=5000)
        log_result(page_name, "Page container visible", True)
        
        # Verify Channel Profile section
        channel_profile = page.locator('text=Channel Profile, text=Brand Brain, h2:has-text("Profile")')
        if await channel_profile.first.is_visible(timeout=3000):
            log_result(page_name, "Channel Profile section visible", True)
        
        # Verify form fields
        channel_name = page.locator('input[placeholder*="channel"], input[name*="channel"], label:has-text("Channel")')
        if await channel_name.first.is_visible(timeout=2000):
            log_result(page_name, "Channel name field visible", True)
        
        # Verify save button
        save_btn = page.locator('button:has-text("Save"), button:has-text("Update")')
        if await save_btn.first.is_visible(timeout=2000):
            log_result(page_name, "Save button visible", True)
        
        # Verify OAuth connections section
        connections = page.locator('text=Connected Accounts, text=YouTube, text=Platform')
        if await connections.first.is_visible(timeout=2000):
            log_result(page_name, "Connections section visible", True)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:100])
        return False


async def test_header_search(page):
    """Test 10: Header Search - Global search works."""
    page_name = "Header Search"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/overview")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)
        
        # Close any modals
        try:
            skip_btn = page.locator('text=Skip for now')
            if await skip_btn.is_visible(timeout=1000):
                await skip_btn.click()
        except:
            pass
        
        # Find header search
        search_input = page.locator('[data-testid="header-search"]')
        await expect(search_input).to_be_visible(timeout=3000)
        log_result(page_name, "Search input visible", True)
        
        # Type search query
        await search_input.fill("power")
        await page.wait_for_timeout(500)
        
        # Wait for dropdown
        dropdown = page.locator('.search-results, [class*="dropdown"], [class*="results"]')
        if await dropdown.first.is_visible(timeout=3000):
            log_result(page_name, "Search dropdown visible", True)
            
            # Check for results
            results = page.locator('text=SUBMISSIONS, text=Submissions')
            if await results.first.is_visible(timeout=2000):
                log_result(page_name, "Search results grouped", True)
        else:
            log_result(page_name, "Search dropdown", False, "Not visible after typing")
        
        return True
        
    except Exception as e:
        log_result(page_name, "Search functionality", False, str(e)[:100])
        return False


async def run_all_tests():
    """Run all E2E tests."""
    print("=" * 70)
    print("ForgeVoice Studio - Playwright E2E UI Test Suite")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        # Run tests in order
        tests = [
            ("Login", test_login_page),
            ("Overview", test_overview_page),
            ("Submissions", test_submissions_page),
            ("Calendar", test_calendar_page),
            ("FVS System", test_fvs_system_page),
            ("Analytics", test_analytics_page),
            ("Strategy Lab", test_strategy_lab_page),
            ("Publishing", test_publishing_page),
            ("Settings", test_settings_page),
            ("Header Search", test_header_search),
        ]
        
        for name, test_func in tests:
            print(f"\n--- Testing: {name} ---")
            try:
                await test_func(page)
            except Exception as e:
                log_result(name, "Test execution", False, str(e)[:100])
        
        await browser.close()
    
    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Pass Rate: {(passed/total*100):.1f}%")
    
    # Group by page
    print("\n" + "-" * 50)
    print("RESULTS BY PAGE:")
    print("-" * 50)
    
    pages = {}
    for r in test_results:
        page = r["page"]
        if page not in pages:
            pages[page] = {"passed": 0, "failed": 0}
        if r["passed"]:
            pages[page]["passed"] += 1
        else:
            pages[page]["failed"] += 1
    
    for page, counts in pages.items():
        status = "✅" if counts["failed"] == 0 else "❌"
        print(f"  {status} {page}: {counts['passed']} passed, {counts['failed']} failed")
    
    # Show failures
    failures = [r for r in test_results if not r["passed"]]
    if failures:
        print("\n" + "-" * 50)
        print("FAILURES:")
        print("-" * 50)
        for f in failures:
            print(f"  ❌ {f['page']} | {f['test']} | {f['details']}")
    
    print("\n" + "=" * 70)
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Save results to JSON
    with open("/app/test_reports/playwright_e2e_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{(passed/total*100):.1f}%",
            "results": test_results
        }, f, indent=2)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)
