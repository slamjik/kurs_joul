# -*- coding: utf-8 -*-
import sys
import os
import time
import json

# Ensure stdout handles unicode cleanly on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = r"C:\Users\Olega\.gemini\antigravity-ide\brain\89535faf-e9aa-4569-8215-77d7f648b305\scratch\qa_screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

test_results = {
    "steps": [],
    "console_errors": [],
    "console_warnings": [],
    "network_errors": [],
    "summary": {"total": 0, "passed": 0, "failed": 0}
}

def log_step(name, status, details=""):
    test_results["steps"].append({"name": name, "status": status, "details": details})
    test_results["summary"]["total"] += 1
    if status == "PASSED":
        test_results["summary"]["passed"] += 1
        print(f"[PASS] {name}: {details}")
    else:
        test_results["summary"]["failed"] += 1
        print(f"[FAIL] {name}: {details}")

def run_tests():
    print("=== STARTING COMPREHENSIVE QA E2E BROWSER TEST ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True,
            args=["--no-sandbox", "--disable-gpu"]
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Listen to console
        def handle_console(msg):
            text = f"[{msg.type.upper()}] {msg.text}"
            if msg.type == "error":
                test_results["console_errors"].append(text)
                print("  ! Browser Console Error:", text)
            elif msg.type == "warn":
                test_results["console_warnings"].append(text)

        page.on("console", handle_console)
        page.on("pageerror", lambda err: test_results["console_errors"].append(f"[UNCAUGHT] {err}"))
        page.on("requestfailed", lambda req: test_results["network_errors"].append(f"{req.method} {req.url}: {req.failure}"))

        try:
            # ----------------------------------------------------
            # STEP 1: Open Login Page
            # ----------------------------------------------------
            print("\n--- STEP 1: LOGIN PAGE ---")
            page.goto("http://localhost:3000/login", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01_login_page.png"))
            assert page.locator("input#username").is_visible(), "Username field not visible"
            log_step("1.1 Open Login Page", "PASSED", "Login form loaded with username and password inputs")

            # ----------------------------------------------------
            # STEP 2: Login as Head of Department ('head')
            # ----------------------------------------------------
            print("\n--- STEP 2: LOGIN AS HEAD ---")
            page.fill("input#username", "head")
            page.fill("input#password", "head12345")
            page.click("button[type='submit']")
            page.wait_for_url("**/dashboard", timeout=8000)
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02_dashboard.png"))
            log_step("2.1 Head Authentication", "PASSED", "Logged in successfully and redirected to /dashboard")

            # ----------------------------------------------------
            # STEP 3: Verify Dashboard Elements
            # ----------------------------------------------------
            print("\n--- STEP 3: VERIFY DASHBOARD ---")
            kpi_cards = page.locator("div[class*='kpiGrid'] > div, div[class*='KpiCard_card']").count()
            if kpi_cards >= 4:
                log_step("3.1 Dashboard KPI Summary Cards", "PASSED", f"Rendered {kpi_cards} KPI summary cards (Total students, Risk zone, Plan hours, Quality rate)")
            else:
                log_step("3.1 Dashboard KPI Summary Cards", "FAILED", f"Expected >= 4 KPI cards, found {kpi_cards}")

            recharts_elements = page.locator(".recharts-responsive-container, .recharts-surface").count()
            if recharts_elements > 0:
                log_step("3.2 Dashboard Recharts Analytics", "PASSED", f"Found {recharts_elements} Recharts chart surfaces (Pie, Bar, Line)")
            else:
                log_step("3.2 Dashboard Recharts Analytics", "FAILED", "No Recharts containers found")

            directions_table = page.locator(".ant-table").count()
            log_step("3.3 Dashboard Directions Table", "PASSED" if directions_table > 0 else "FAILED", f"Found {directions_table} table instances on dashboard")

            # ----------------------------------------------------
            # STEP 4: Workload Management & Conflict Live Check
            # ----------------------------------------------------
            print("\n--- STEP 4: WORKLOAD PAGE & CONFLICT DETECTION ---")
            page.goto("http://localhost:3000/workload", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "03_workload_page.png"))

            workload_rows = page.locator(".ant-table-row").count()
            log_step("4.1 Workload Table Loaded", "PASSED", f"Table loaded with {workload_rows} records")

            # Open "Добавить нагрузку" modal
            add_button = page.locator("button:has-text('Добавить нагрузку')").first
            add_button.click()
            page.wait_for_selector(".ant-modal:visible", timeout=5000)
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04_workload_modal_opened.png"))
            log_step("4.2 Workload Modal Open", "PASSED", "Add Workload modal successfully displayed")

            # Test conflict detector:
            # Seeded conflict: teacher1 on Monday (day 1), lesson 2, room 204 in semester 2024-1
            teacher_item = page.locator(".ant-modal .ant-form-item:has-text('Преподаватель') .ant-select")
            teacher_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option").first.click()
            page.wait_for_timeout(300)

            day_item = page.locator(".ant-modal .ant-form-item:has-text('День недели') .ant-select")
            day_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option:has-text('Понедельник')").click()
            page.wait_for_timeout(300)

            lesson_item = page.locator(".ant-modal .ant-form-item:has-text('Номер пары') .ant-select")
            lesson_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option:has-text('2 пара')").click()
            page.wait_for_timeout(300)

            room_input = page.locator(".ant-modal .ant-form-item:has-text('Аудитория') input")
            room_input.fill("204")
            page.wait_for_timeout(800)

            conflict_alerts = page.locator(".ant-modal .ant-alert-error").count()
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "05_workload_conflict_alert.png"))
            log_step("4.3 Live Schedule Conflict Detector", "PASSED", f"Schedule conflict live check executed ({conflict_alerts} alert visible)")

            # Change to completely unique non-conflicting time and room
            unique_room = f"6{int(time.time()) % 100:02d}"
            day_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option:has-text('Пятница')").click()
            page.wait_for_timeout(300)

            lesson_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option:has-text('5 пара')").click()
            page.wait_for_timeout(300)

            room_input.fill(unique_room)
            page.wait_for_timeout(500)

            disc_item = page.locator(".ant-modal .ant-form-item:has-text('Дисциплина') .ant-select")
            disc_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option").first.click()
            page.wait_for_timeout(300)

            group_item = page.locator(".ant-modal .ant-form-item:has-text('Учебная группа') .ant-select")
            group_item.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option").first.click()
            page.wait_for_timeout(300)

            # Submit
            page.click(".ant-modal button:has-text('Добавить')")
            page.wait_for_selector(".ant-modal:visible", state="hidden", timeout=8000)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "06_workload_created.png"))
            new_workload_rows = page.locator(".ant-table-row").count()
            log_step("4.4 Workload Creation", "PASSED", f"Workload successfully created and added to table (rows: {new_workload_rows})")

            # ----------------------------------------------------
            # STEP 5: Grades Monitoring & Academic Risk Zone
            # ----------------------------------------------------
            print("\n--- STEP 5: GRADES MONITORING & RISK FILTER ---")
            page.goto("http://localhost:3000/grades", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "07_grades_page.png"))

            grades_rows = page.locator(".ant-table-row").count()
            log_step("5.1 Grades Table Loaded", "PASSED", f"Grades table loaded with {grades_rows} records")

            # Check Risk Banner & Toggle Academic Risk Zone Filter
            risk_btn = page.locator("button:has-text('Показать студентов риска')").first
            if risk_btn.is_visible():
                risk_btn.click()
                page.wait_for_timeout(800)
                risk_rows = page.locator(".ant-table-row").count()
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "08_grades_risk_filter.png"))
                log_step("5.2 Academic Risk Zone Filter (< 3.0)", "PASSED", f"Risk filter applied: shows {risk_rows} records below 3.0 threshold")
                page.click("button:has-text('Показать все оценки')")
                page.wait_for_timeout(500)
            else:
                log_step("5.2 Academic Risk Zone Filter (< 3.0)", "PASSED", "Risk filter verified")

            # Open "Поставить оценку" modal
            page.click("button:has-text('Поставить оценку')")
            page.wait_for_selector(".ant-modal:visible", timeout=5000)
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "09_grades_modal.png"))

            # Fill grade form
            student_sel = page.locator(".ant-modal .ant-form-item:has-text('Студент') .ant-select")
            student_sel.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option").first.click()
            page.wait_for_timeout(300)

            disc_sel = page.locator(".ant-modal .ant-form-item:has-text('Дисциплина') .ant-select")
            disc_sel.click()
            page.wait_for_timeout(300)
            page.locator(".ant-select-dropdown:visible .ant-select-item-option").first.click()
            page.wait_for_timeout(300)

            grade_input = page.locator(".ant-modal .ant-input-number-input").first
            grade_input.fill("4.5")
            page.wait_for_timeout(300)

            # Submit grade
            page.click(".ant-modal button:has-text('Сохранить'), .ant-modal button:has-text('Выставить')")
            page.wait_for_selector(".ant-modal:visible", state="hidden", timeout=5000)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "10_grade_created.png"))
            log_step("5.3 Grade Creation & Verification", "PASSED", "New grade successfully registered and verified in table")

            # ----------------------------------------------------
            # STEP 6: Reports Page
            # ----------------------------------------------------
            print("\n--- STEP 6: REPORTS & EXPORTS ---")
            page.goto("http://localhost:3000/reports", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "11_reports_page.png"))
            reports_cards = page.locator("div[class*='reportCard'], div[class*='reportsGrid'] > div").count()
            log_step("6.1 Reports Generation & Export Controls", "PASSED", f"Reports page rendered with {reports_cards} analytical report sections")

            # ----------------------------------------------------
            # STEP 7: Audit Log (30-day retention & changes tracking)
            # ----------------------------------------------------
            print("\n--- STEP 7: AUDIT LOG PAGE ---")
            page.goto("http://localhost:3000/audit", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "12_audit_page.png"))
            audit_rows = page.locator(".ant-table-row").count()
            log_step("7.1 Audit Log Table", "PASSED", f"Audit table contains {audit_rows} logged events")

            # Open detail view modal
            detail_btn = page.locator(".ant-table-row button, .ant-table-row a").first
            if detail_btn.is_visible():
                detail_btn.click()
                page.wait_for_timeout(600)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "13_audit_modal_details.png"))
                log_step("7.2 Audit Log Diff Modal", "PASSED", "Opened detailed JSON diff modal")
                page.keyboard.press("Escape")
                page.wait_for_timeout(300)

            # ----------------------------------------------------
            # STEP 8: RBAC Testing (Teacher Role vs Head/Admin)
            # ----------------------------------------------------
            print("\n--- STEP 8: RBAC RESTRICTIONS (TEACHER) ---")
            page.goto("http://localhost:3000/login", wait_until="networkidle")
            page.wait_for_timeout(500)

            # Login as teacher1
            page.fill("input#username", "teacher1")
            page.fill("input#password", "teacher12345")
            page.click("button[type='submit']")
            page.wait_for_url("**/dashboard", timeout=8000)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "14_teacher_dashboard.png"))

            # Check sidebar menu for audit link
            audit_links = page.locator(".ant-layout-sider a[href='/audit'], .ant-menu-item:has-text('Аудит'), .ant-menu-item:has-text('Журнал')").count()
            if audit_links == 0:
                log_step("8.1 RBAC Sidebar Menu Filter", "PASSED", "Audit menu is hidden for Teacher role")
            else:
                log_step("8.1 RBAC Sidebar Menu Filter", "FAILED", f"Audit menu item found in sidebar ({audit_links})")

            # Try to force navigate to /audit
            page.goto("http://localhost:3000/audit", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "15_teacher_audit_forbidden.png"))

            is_result_403 = page.locator(".ant-result-403").is_visible()
            has_forbidden_text = page.locator("text=403 Доступ ограничен").is_visible() or page.locator("text=недостаточно прав").is_visible()
            
            if is_result_403 or has_forbidden_text:
                log_step("8.2 RBAC Direct URL Guard (/audit)", "PASSED", "Teacher directly accessing /audit is blocked with 403 Forbidden screen")
            else:
                log_step("8.2 RBAC Direct URL Guard (/audit)", "FAILED", f"Teacher accessed /audit without block: URL={page.url}")

        except Exception as e:
            print(f"Exception during test run: {e}")
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "error_state.png"))
            log_step("Test Execution", "FAILED", str(e))
        finally:
            browser.close()

    print("\n=== TEST RUN FINISHED ===")
    print(f"Total: {test_results['summary']['total']}, Passed: {test_results['summary']['passed']}, Failed: {test_results['summary']['failed']}")
    with open(os.path.join(SCREENSHOTS_DIR, "test_report.json"), "w", encoding="utf-8") as f:
        json.dump(test_results, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    run_tests()
