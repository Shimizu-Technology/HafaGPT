#!/usr/bin/env python3
"""
Multi-run evaluation comparison script.
Runs each skill level multiple times and generates a comparison report.
"""

import subprocess
import sys
import time
import json
import os
from datetime import datetime
import requests

# Configuration
API_URL = "https://hafagpt-api.onrender.com"
TEST_FILE = "test_queries_v3.json"
SKILL_LEVELS = ["baseline", "beginner", "intermediate", "advanced"]
RUNS_PER_LEVEL = 3
# Output organized by date
from datetime import datetime
TODAY = datetime.now().strftime("%Y-%m-%d")
OUTPUT_DIR = f"evaluation/tmp/{TODAY}/comparison"

def wake_up_server():
    """Wake up the Render server before running tests."""
    print("🔄 Waking up Render server...")
    try:
        # Hit a lightweight endpoint to wake up the server
        response = requests.get("https://hafagpt-api.onrender.com/api/health", timeout=120)
        if response.status_code == 200:
            print("✅ Server is awake!")
            return True
    except requests.exceptions.Timeout:
        print("⏳ Server waking up (cold start)...")
        time.sleep(30)
        return wake_up_server()
    except Exception as e:
        print(f"⚠️ Health check failed: {e}")
    
    # Fallback: hit the eval endpoint directly
    try:
        response = requests.post(f"{API_URL}/api/eval/chat", json={"message": "test", "mode": "english"}, timeout=120)
        print(f"✅ Server responded with status {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Failed to wake server: {e}")
        return False

def run_single_test(skill_level: str, run_number: int) -> dict:
    """Run a single evaluation test and return results."""
    output_file = f"{OUTPUT_DIR}/{skill_level}_run{run_number}.txt"
    
    # Build command
    cmd = [
        sys.executable, "-m", "evaluation.test_evaluation",
        "--test-file", TEST_FILE,
        "--api-url", API_URL,
    ]
    if skill_level != "baseline":
        cmd.extend(["--skill-level", skill_level])
    
    print(f"\n{'='*60}")
    print(f"🧪 Running {skill_level.upper()} - Run {run_number}/{RUNS_PER_LEVEL}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    with open(output_file, "w") as f:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        for line in process.stdout:
            print(line, end="")  # Live output
            f.write(line)
        
        process.wait()
    
    elapsed = time.time() - start_time
    
    # Parse results from output
    result = parse_results(output_file)
    result["elapsed_seconds"] = round(elapsed, 1)
    result["skill_level"] = skill_level
    result["run_number"] = run_number
    
    return result

def parse_results(output_file: str) -> dict:
    """Parse the test output file for results."""
    result = {
        "accuracy": 0.0,
        "passed": 0,
        "total": 0,
        "failed": 0
    }
    
    try:
        with open(output_file, "r") as f:
            content = f.read()
            
            # Look for "Overall Accuracy: X% (Y/Z)"
            import re
            match = re.search(r"Overall Accuracy:.*?(\d+\.?\d*)%.*?\((\d+)/(\d+)\)", content)
            if match:
                result["accuracy"] = float(match.group(1))
                result["passed"] = int(match.group(2))
                result["total"] = int(match.group(3))
                result["failed"] = result["total"] - result["passed"]
    except Exception as e:
        print(f"⚠️ Error parsing results: {e}")
    
    return result

def generate_comparison_report(all_results: list):
    """Generate a markdown comparison report."""
    report_file = f"{OUTPUT_DIR}/comparison_report.md"
    
    # Group by skill level
    by_skill = {}
    for r in all_results:
        skill = r["skill_level"]
        if skill not in by_skill:
            by_skill[skill] = []
        by_skill[skill].append(r)
    
    with open(report_file, "w") as f:
        f.write("# 📊 Skill Level Evaluation Comparison\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**API:** {API_URL}\n")
        f.write(f"**Test Suite:** {TEST_FILE}\n")
        f.write(f"**Runs per level:** {RUNS_PER_LEVEL}\n\n")
        
        f.write("---\n\n")
        f.write("## Summary\n\n")
        f.write("| Skill Level | Run 1 | Run 2 | Run 3 | Average | Std Dev |\n")
        f.write("|-------------|-------|-------|-------|---------|--------|\n")
        
        for skill in SKILL_LEVELS:
            if skill in by_skill:
                runs = by_skill[skill]
                accuracies = [r["accuracy"] for r in runs]
                avg = sum(accuracies) / len(accuracies) if accuracies else 0
                
                # Calculate std dev
                if len(accuracies) > 1:
                    variance = sum((x - avg) ** 2 for x in accuracies) / len(accuracies)
                    std_dev = variance ** 0.5
                else:
                    std_dev = 0
                
                run_strs = [f"{r['accuracy']:.1f}%" for r in runs]
                while len(run_strs) < 3:
                    run_strs.append("-")
                
                f.write(f"| **{skill.capitalize()}** | {run_strs[0]} | {run_strs[1]} | {run_strs[2]} | {avg:.1f}% | ±{std_dev:.1f}% |\n")
        
        f.write("\n---\n\n")
        f.write("## Detailed Results\n\n")
        
        for skill in SKILL_LEVELS:
            if skill in by_skill:
                f.write(f"### {skill.capitalize()}\n\n")
                f.write("| Run | Accuracy | Passed | Failed | Time |\n")
                f.write("|-----|----------|--------|--------|------|\n")
                
                for r in by_skill[skill]:
                    f.write(f"| {r['run_number']} | {r['accuracy']:.1f}% | {r['passed']}/{r['total']} | {r['failed']} | {r['elapsed_seconds']}s |\n")
                
                f.write("\n")
        
        f.write("---\n\n")
        f.write("## Insights\n\n")
        
        # Calculate insights
        if all(skill in by_skill for skill in SKILL_LEVELS):
            avgs = {}
            for skill in SKILL_LEVELS:
                runs = by_skill[skill]
                avgs[skill] = sum(r["accuracy"] for r in runs) / len(runs)
            
            best = max(avgs, key=avgs.get)
            worst = min(avgs, key=avgs.get)
            
            f.write(f"- **Best performing:** {best.capitalize()} ({avgs[best]:.1f}% avg)\n")
            f.write(f"- **Lowest performing:** {worst.capitalize()} ({avgs[worst]:.1f}% avg)\n")
            f.write(f"- **Variance:** {avgs[best] - avgs[worst]:.1f}% between best and worst\n")
    
    print(f"\n📄 Comparison report saved to: {report_file}")
    return report_file

def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("🧪 HåfaGPT Skill Level Comparison Test")
    print(f"   Running {len(SKILL_LEVELS)} skill levels × {RUNS_PER_LEVEL} runs = {len(SKILL_LEVELS) * RUNS_PER_LEVEL} total tests")
    print(f"   Estimated time: ~{len(SKILL_LEVELS) * RUNS_PER_LEVEL * 15} minutes")
    print("")
    
    # Wake up server first
    if not wake_up_server():
        print("❌ Could not connect to server. Exiting.")
        sys.exit(1)
    
    all_results = []
    
    for skill_level in SKILL_LEVELS:
        for run_num in range(1, RUNS_PER_LEVEL + 1):
            # Wait between runs to avoid rate limits (60 requests per 60 seconds)
            if all_results:
                print("\n⏳ Waiting 90 seconds before next test run to reset rate limits...")
                time.sleep(90)
            
            result = run_single_test(skill_level, run_num)
            all_results.append(result)
            
            print(f"\n✅ {skill_level.upper()} Run {run_num}: {result['accuracy']:.1f}% ({result['passed']}/{result['total']})")
    
    # Generate comparison report
    print("\n" + "="*60)
    print("📊 Generating comparison report...")
    generate_comparison_report(all_results)
    
    # Save raw results as JSON
    json_file = f"{OUTPUT_DIR}/all_results.json"
    with open(json_file, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"📄 Raw results saved to: {json_file}")
    
    print("\n✅ All tests complete!")

if __name__ == "__main__":
    main()
