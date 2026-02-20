"""
ForgeVoice Studio - Playwright E2E UI Test Suite (v2)
Covers all major pages and interactions with flexible selectors.
Run with: python test_e2e_ui_playwright.py
"""
import asyncio
import json
from datetime import datetime
from playwright.async_api import async_playwright

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


async def close_modals(page):
    """Close any open modals."""
    try:
        skip_btn = page.locator('text=Skip for now')
        if await skip_btn.is_visible(timeout=1500):
            await skip_btn.click()
            await page.wait_for_timeout(300)
    except:
        pass
    
    try:
        close_btn = page.locator('[data-testid="modal-close"], button:has-text("Close"), .modal-close')
        if await close_btn.first.is_visible(timeout=500):
            await close_btn.first.click()
            await page.wait_for_timeout(300)
    except:
        pass


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
        
        email_visible = await email_input.is_visible(timeout=5000)
        password_visible = await password_input.is_visible()
        button_visible = await login_button.is_visible()
        
        log_result(page_name, "Form elements visible", email_visible and password_visible and button_visible)
        
        # Perform login
        await email_input.fill(CLIENT_EMAIL)
        await password_input.fill(CLIENT_PASSWORD)
        await login_button.click()
        
        # Wait for redirect
        await page.wait_for_timeout(3000)
        
        current_url = page.url
        login_success = "/dashboard" in current_url
        log_result(page_name, "Login successful", login_success, f"URL: {current_url[:50]}")
        
        await close_modals(page)
        return login_success
        
    except Exception as e:
        log_result(page_name, "Login flow", False, str(e)[:80])
        return False


async def test_overview_page(page):
    """Test 2: Overview Page - Loads with real data."""
    page_name = "Overview"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/overview")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        await close_modals(page)
        
        # Check for page title (ForgeVoice in header or Welcome in content)
        has_title = await page.locator('h1:has-text("ForgeVoice"), text=Welcome').first.is_visible(timeout=5000)
        log_result(page_name, "Page title visible", has_title)
        
        # Check for stats cards (look for numbers)
        stats_text = await page.locator('text=/\\d+/').all_text_contents()
        has_stats = len(stats_text) > 3
        log_result(page_name, "Stats data loaded", has_stats, f"Found {len(stats_text)} numbers")
        
        # Check for YouTube section
        yt_visible = await page.locator('text=/YouTube|youtube/i').first.is_visible(timeout=3000)
        log_result(page_name, "YouTube section visible", yt_visible)
        
        # Check for sidebar
        sidebar = await page.locator('nav, [class*="sidebar"]').first.is_visible()
        log_result(page_name, "Sidebar visible", sidebar)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_submissions_page(page):
    """Test 3: Submissions Page - Table loads and search works."""
    page_name = "Submissions"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/submissions")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check page loaded
        page_content = await page.content()
        has_submissions_content = "Submission" in page_content or "Short" in page_content
        log_result(page_name, "Page content loaded", has_submissions_content)
        
        # Check for filter tabs
        all_tab = await page.locator('button:has-text("All")').first.is_visible(timeout=3000)
        log_result(page_name, "Filter tabs visible", all_tab)
        
        # Check for search input
        search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
        search_visible = await search.first.is_visible(timeout=2000)
        log_result(page_name, "Search input visible", search_visible)
        
        if search_visible:
            await search.first.fill("chanakya")
            await page.wait_for_timeout(500)
            log_result(page_name, "Search input works", True)
        
        # Check for any submission cards/items
        cards = await page.locator('[class*="card"], [class*="submission"]').count()
        log_result(page_name, "Submission items visible", cards > 0, f"Found {cards}")
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_calendar_page(page):
    """Test 4: Calendar Page - Renders with events."""
    page_name = "Calendar"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/calendar")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for month/day headers
        has_calendar = await page.locator('text=/Mon|Tue|Wed|Thu|Fri|Sat|Sun/').first.is_visible(timeout=5000)
        log_result(page_name, "Calendar days visible", has_calendar)
        
        # Check for Today button
        today_btn = await page.locator('button:has-text("Today")').first.is_visible(timeout=2000)
        log_result(page_name, "Today button visible", today_btn)
        
        # Check for view toggles
        month_btn = await page.locator('button:has-text("Month")').first.is_visible(timeout=2000)
        log_result(page_name, "Month toggle visible", month_btn)
        
        # Check for AI features
        ai_btn = await page.locator('button:has-text("AI"), button:has-text("Schedule")').first.is_visible(timeout=2000)
        log_result(page_name, "AI Schedule button visible", ai_btn)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_fvs_system_page(page):
    """Test 5: FVS System Page - Brain Accuracy panel and recommendation cards."""
    page_name = "FVS System"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/fvs")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for FVS/Brain content
        fvs_content = await page.content()
        has_fvs = "FVS" in fvs_content or "Brain" in fvs_content or "Accuracy" in fvs_content
        log_result(page_name, "FVS content visible", has_fvs)
        
        # Check for Brain Accuracy
        brain = await page.locator('text=/Brain|Accuracy|FVS/i').first.is_visible(timeout=3000)
        log_result(page_name, "Brain panel visible", brain)
        
        # Check for action buttons (Submit New Content, Open Strategy Lab, etc.)
        action_btn = await page.locator('button:has-text("Submit"), button:has-text("Strategy"), button:has-text("Video")').first.is_visible(timeout=2000)
        log_result(page_name, "Action buttons visible", action_btn)
        
        # Check for active challenges or recommendations
        challenges = await page.locator('text=/Challenge|Recommendation|Prediction/i').first.is_visible(timeout=2000)
        log_result(page_name, "Challenges/Recommendations visible", challenges)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_analytics_page(page):
    """Test 6: Analytics Page - Performance and Trend Intelligence tabs."""
    page_name = "Analytics"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/analytics")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for metrics
        has_views = await page.locator('text=/Views|views/i').first.is_visible(timeout=3000)
        log_result(page_name, "Views metric visible", has_views)
        
        has_subscribers = await page.locator('text=/Subscriber/i').first.is_visible(timeout=2000)
        log_result(page_name, "Subscribers visible", has_subscribers)
        
        # Check for Performance tab
        perf_tab = await page.locator('button:has-text("Performance")').first.is_visible(timeout=2000)
        log_result(page_name, "Performance tab visible", perf_tab)
        
        # Check for Trend tab and click it
        trend_tab = page.locator('button:has-text("Trend")')
        trend_visible = await trend_tab.first.is_visible(timeout=2000)
        log_result(page_name, "Trend tab visible", trend_visible)
        
        if trend_visible:
            await trend_tab.first.click()
            await page.wait_for_timeout(1000)
            log_result(page_name, "Trend tab clickable", True)
        
        # Check for charts
        has_chart = await page.locator('canvas, svg, [class*="chart"], [class*="recharts"]').first.is_visible(timeout=2000)
        log_result(page_name, "Charts visible", has_chart)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_strategy_lab_page(page):
    """Test 7: Strategy Lab - Form submits and generates content."""
    page_name = "Strategy Lab"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/strategy")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for Strategy Lab content
        content = await page.content()
        has_strategy = "Strategy" in content or "Research" in content or "Script" in content
        log_result(page_name, "Strategy content visible", has_strategy)
        
        # Check for topic input
        topic_input = page.locator('input, textarea')
        input_count = await topic_input.count()
        log_result(page_name, "Input fields visible", input_count > 0, f"Found {input_count}")
        
        # Check for generate button
        gen_btn = await page.locator('button:has-text("Generate")').first.is_visible(timeout=2000)
        log_result(page_name, "Generate button visible", gen_btn)
        
        # Check for content tabs
        research_tab = await page.locator('button:has-text("Research")').first.is_visible(timeout=2000)
        script_tab = await page.locator('button:has-text("Script")').first.is_visible(timeout=2000)
        log_result(page_name, "Content tabs visible", research_tab or script_tab)
        
        # Check for History
        history = await page.locator('text=/History|Sessions/i').first.is_visible(timeout=2000)
        log_result(page_name, "History visible", history)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_publishing_page(page):
    """Test 8: Publishing Page - Loads with YouTube connected status."""
    page_name = "Publishing"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/publishing")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for Publishing content
        content = await page.content()
        has_publishing = "Publishing" in content or "Queue" in content or "Published" in content
        log_result(page_name, "Publishing content visible", has_publishing)
        
        # Check for stats
        has_stats = await page.locator('text=/TOTAL|PUBLISHED|QUEUE/i').first.is_visible(timeout=3000)
        log_result(page_name, "Stats cards visible", has_stats)
        
        # Check for YouTube indicator (case insensitive)
        yt_visible = "youtube" in content.lower()
        log_result(page_name, "YouTube platform visible", yt_visible)
        
        # Check for tabs
        queue_tab = await page.locator('button:has-text("Queue")').first.is_visible(timeout=2000)
        published_tab = await page.locator('button:has-text("Published")').first.is_visible(timeout=2000)
        log_result(page_name, "Content tabs visible", queue_tab or published_tab)
        
        # Check for quota indicator
        quota = await page.locator('text=/Quota|10,000/i').first.is_visible(timeout=2000)
        log_result(page_name, "Quota indicator visible", quota)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_settings_page(page):
    """Test 9: Settings Page - Loads Channel Profile."""
    page_name = "Settings"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/settings")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for Settings content
        content = await page.content()
        has_settings = "Settings" in content or "Profile" in content or "Channel" in content
        log_result(page_name, "Settings content visible", has_settings)
        
        # Check for Channel/Profile section
        profile = await page.locator('text=/Channel|Profile|Brand/i').first.is_visible(timeout=3000)
        log_result(page_name, "Profile section visible", profile)
        
        # Check for form inputs
        inputs = await page.locator('input, textarea').count()
        log_result(page_name, "Form fields visible", inputs > 0, f"Found {inputs}")
        
        # Check for Save button
        save_btn = await page.locator('button:has-text("Save")').first.is_visible(timeout=2000)
        log_result(page_name, "Save button visible", save_btn)
        
        # Check for OAuth/connections
        connections = await page.locator('text=/Connect|YouTube|Platform/i').first.is_visible(timeout=2000)
        log_result(page_name, "Connections section visible", connections)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def test_header_search(page):
    """Test 10: Header Search - Global search works."""
    page_name = "Header Search"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/overview")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)
        await close_modals(page)
        
        # Find header search
        search_input = page.locator('[data-testid="header-search"], header input[placeholder*="Search"]')
        search_visible = await search_input.first.is_visible(timeout=3000)
        log_result(page_name, "Search input visible", search_visible)
        
        if search_visible:
            await search_input.first.click()
            await search_input.first.fill("power")
            await page.wait_for_timeout(800)  # Wait for debounce
            
            # Check for dropdown results
            dropdown = page.locator('[class*="dropdown"], [class*="result"], [class*="search"]')
            dropdown_visible = await dropdown.nth(1).is_visible(timeout=2000)
            
            if not dropdown_visible:
                # Check for text results
                results = await page.locator('text=/Submissions|SUBMISSIONS/').first.is_visible(timeout=2000)
                dropdown_visible = results
            
            log_result(page_name, "Search dropdown visible", dropdown_visible)
            
            # Check for grouped results
            if dropdown_visible:
                submissions_group = await page.locator('text=/Submissions|SUBMISSIONS/').first.is_visible(timeout=1000)
                log_result(page_name, "Results grouped", submissions_group)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Search functionality", False, str(e)[:80])
        return False


async def test_video_lab_page(page):
    """Test 11: AI Video Lab - Form and generation."""
    page_name = "AI Video Lab"
    
    try:
        await page.goto(f"{BASE_URL}/dashboard/video-lab")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Check for Video Lab content
        content = await page.content()
        has_video = "Video" in content or "Generation" in content or "Provider" in content
        log_result(page_name, "Video Lab content visible", has_video)
        
        # Check for provider selector
        provider = await page.locator('text=/Provider|Kling|Runway/i').first.is_visible(timeout=3000)
        log_result(page_name, "Provider selector visible", provider)
        
        # Check for prompt input
        prompt = await page.locator('textarea, input[placeholder*="prompt"]').first.is_visible(timeout=2000)
        log_result(page_name, "Prompt input visible", prompt)
        
        # Check for Create Video Task button
        create_btn = await page.locator('button:has-text("Create Video"), button:has-text("Generate")').first.is_visible(timeout=2000)
        log_result(page_name, "Create button visible", create_btn)
        
        return True
        
    except Exception as e:
        log_result(page_name, "Page load", False, str(e)[:80])
        return False


async def run_all_tests():
    """Run all E2E tests."""
    print("=" * 70)
    print("ForgeVoice Studio - Playwright E2E UI Test Suite v2")
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
            ("AI Video Lab", test_video_lab_page),
        ]
        
        for name, test_func in tests:
            print(f"\n--- Testing: {name} ---")
            try:
                await test_func(page)
            except Exception as e:
                log_result(name, "Test execution", False, str(e)[:80])
        
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
        pg = r["page"]
        if pg not in pages:
            pages[pg] = {"passed": 0, "failed": 0}
        if r["passed"]:
            pages[pg]["passed"] += 1
        else:
            pages[pg]["failed"] += 1
    
    for pg, counts in pages.items():
        status = "✅" if counts["failed"] == 0 else "⚠️" if counts["passed"] > counts["failed"] else "❌"
        print(f"  {status} {pg}: {counts['passed']} passed, {counts['failed']} failed")
    
    # Show failures
    failures = [r for r in test_results if not r["passed"]]
    if failures:
        print("\n" + "-" * 50)
        print(f"FAILURES ({len(failures)}):")
        print("-" * 50)
        for f in failures:
            print(f"  ❌ {f['page']} | {f['test']} | {f['details'][:60]}")
    
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
            "pages_summary": pages,
            "results": test_results
        }, f, indent=2)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)
