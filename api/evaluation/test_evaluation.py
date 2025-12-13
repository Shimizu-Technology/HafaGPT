#!/usr/bin/env python3
"""
HafaGPT Evaluation Script

Automatically tests the chatbot against a comprehensive test suite
and generates detailed performance reports.

Usage:
    python test_evaluation.py [--mode english] [--limit 10] [--test-file test_queries_v2.json]

Options:
    --mode       Chat mode to test (english, chamorro, learn). Default: english
    --limit      Number of queries to test (for quick testing). Default: all
    --api-url    API endpoint URL. Default: http://localhost:8000
    --output     Output directory for results. Default: ./evaluation
    --test-file  Test file to use. Default: evaluation/test_queries.json
                 Use test_queries_v2.json for expanded 100-test suite
"""

import json
import sys
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import requests
from collections import defaultdict

# ANSI color codes for pretty output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def load_test_queries(file_path: str) -> Dict:
    """Load test queries from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize_for_comparison(text: str) -> str:
    """
    Normalize text for comparison by removing diacritics and glottal stops.
    This allows 'påtgon' to match 'patgon', 'guma'' to match 'guma', etc.
    
    Args:
        text: Text to normalize
        
    Returns:
        Normalized text (lowercase, no diacritics, no glottal stops)
    """
    import unicodedata
    import re
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove glottal stops (apostrophes)
    text = re.sub(r"['ʼ`'']", "", text)
    
    # Remove diacritics (å→a, ñ→n, etc.)
    # NFD = decompose characters (å becomes a + combining ring)
    text = unicodedata.normalize('NFD', text)
    # Filter out combining marks
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    
    return text

def check_keywords_present(response: str, expected_keywords: List[str]) -> tuple[bool, List[str]]:
    """
    Check if any expected keywords are present in the response.
    Uses diacritic normalization for fuzzy matching.
    Returns (passed, found_keywords)
    """
    response_normalized = normalize_for_comparison(response)
    found_keywords = []
    
    for keyword in expected_keywords:
        keyword_normalized = normalize_for_comparison(keyword)
        # Check if normalized keyword is in normalized response
        if keyword_normalized in response_normalized:
            found_keywords.append(keyword)
    
    # Pass if at least one expected keyword is found
    passed = len(found_keywords) > 0
    return passed, found_keywords

def send_query(api_url: str, query: str, mode: str = 'english', skill_level: str = None) -> Optional[Dict]:
    """Send a query to the chatbot API and return the response."""
    try:
        # Use the evaluation endpoint which doesn't require auth
        payload = {
            'message': query,
            'mode': mode,
            'session_id': f'eval_session_{int(time.time())}'
        }
        
        # Add skill_level if provided
        if skill_level:
            payload['skill_level'] = skill_level
        
        response = requests.post(
            f"{api_url}/api/eval/chat",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"{Colors.RED}Error: API returned status {response.status_code}{Colors.END}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}Error: Could not connect to API at {api_url}{Colors.END}")
        print(f"Make sure the backend server is running!")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print(f"{Colors.YELLOW}Warning: Query timed out{Colors.END}")
        return None
    except Exception as e:
        print(f"{Colors.RED}Error: {str(e)}{Colors.END}")
        return None

def calculate_score(passed: bool, found_keywords: List[str], expected_keywords: List[str]) -> float:
    """
    Calculate a score for the response:
    - 100%: All expected keywords found
    - 80%: At least one keyword found
    - 50%: Partial match (response mentions the topic)
    - 0%: No match
    """
    if not passed:
        return 0.0
    
    match_ratio = len(found_keywords) / len(expected_keywords)
    
    if match_ratio >= 1.0:
        return 100.0
    elif match_ratio >= 0.5:
        return 80.0
    else:
        return 50.0

def run_evaluation(
    api_url: str,
    test_queries: List[Dict],
    mode: str = 'english',
    limit: Optional[int] = None,
    skill_level: Optional[str] = None
) -> Dict:
    """Run the evaluation on all test queries."""
    
    results = []
    category_stats = defaultdict(lambda: {'total': 0, 'passed': 0, 'scores': []})
    
    # Limit queries if specified
    queries_to_test = test_queries[:limit] if limit else test_queries
    total = len(queries_to_test)
    
    skill_label = f" (skill_level={skill_level})" if skill_level else ""
    print(f"\n{Colors.BOLD}🧪 Running evaluation on {total} queries{skill_label}...{Colors.END}\n")
    
    for i, test in enumerate(queries_to_test, 1):
        query_id = test['id']
        query = test['query']
        expected = test['expected_keywords']
        category = test['category']
        difficulty = test['difficulty']
        
        # Print progress
        print(f"[{i}/{total}] Testing: {Colors.BLUE}{query}{Colors.END}")
        
        # Send query
        start_time = time.time()
        api_response = send_query(api_url, query, mode, skill_level)
        response_time = time.time() - start_time
        
        if not api_response:
            print(f"  {Colors.RED}❌ FAILED - No response{Colors.END}\n")
            results.append({
                'id': query_id,
                'query': query,
                'category': category,
                'difficulty': difficulty,
                'expected': expected,
                'actual': None,
                'passed': False,
                'found_keywords': [],
                'score': 0.0,
                'response_time': response_time
            })
            category_stats[category]['total'] += 1
            continue
        
        bot_response = api_response.get('response', '')
        
        # Check if keywords are present
        passed, found_keywords = check_keywords_present(bot_response, expected)
        score = calculate_score(passed, found_keywords, expected)
        
        # Store result
        result = {
            'id': query_id,
            'query': query,
            'category': category,
            'difficulty': difficulty,
            'expected': expected,
            'actual': bot_response,
            'passed': passed,
            'found_keywords': found_keywords,
            'score': score,
            'response_time': response_time
        }
        results.append(result)
        
        # Update category stats
        category_stats[category]['total'] += 1
        if passed:
            category_stats[category]['passed'] += 1
        category_stats[category]['scores'].append(score)
        
        # Print result
        status_icon = f"{Colors.GREEN}✅" if passed else f"{Colors.RED}❌"
        status_text = "PASSED" if passed else "FAILED"
        print(f"  {status_icon} {status_text} (Score: {score:.0f}%) - {response_time:.2f}s{Colors.END}")
        
        if passed:
            print(f"  {Colors.GREEN}Found: {', '.join(found_keywords)}{Colors.END}")
        else:
            print(f"  {Colors.RED}Expected: {', '.join(expected)}{Colors.END}")
        
        print()  # Blank line for readability
    
    # Calculate overall stats
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r['passed'])
    overall_accuracy = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    avg_score = sum(r['score'] for r in results) / total_tests if total_tests > 0 else 0
    avg_response_time = sum(r['response_time'] for r in results) / total_tests if total_tests > 0 else 0
    
    return {
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'mode': mode,
            'skill_level': skill_level,
            'api_url': api_url,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': total_tests - passed_tests,
            'overall_accuracy': overall_accuracy,
            'avg_score': avg_score,
            'avg_response_time': avg_response_time
        },
        'results': results,
        'category_stats': dict(category_stats)
    }

def generate_report(evaluation_results: Dict, output_dir: Path):
    """Generate detailed evaluation report."""
    
    metadata = evaluation_results['metadata']
    results = evaluation_results['results']
    category_stats = evaluation_results['category_stats']
    
    # Save full JSON results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    skill_suffix = f"_{metadata.get('skill_level')}" if metadata.get('skill_level') else ""
    json_file = output_dir / f'eval_results_{timestamp}{skill_suffix}.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(evaluation_results, f, indent=2, ensure_ascii=False)
    
    print(f"{Colors.GREEN}✅ Full results saved to: {json_file}{Colors.END}\n")
    
    # Generate human-readable report
    report_file = output_dir / f'eval_report_{timestamp}{skill_suffix}.txt'
    
    with open(report_file, 'w', encoding='utf-8') as f:
        # Header
        f.write("=" * 80 + "\n")
        f.write("HafaGPT EVALUATION REPORT\n")
        f.write("=" * 80 + "\n\n")
        
        f.write(f"Timestamp: {metadata['timestamp']}\n")
        f.write(f"Mode: {metadata['mode']}\n")
        if metadata.get('skill_level'):
            f.write(f"Skill Level: {metadata['skill_level']}\n")
        f.write(f"API URL: {metadata['api_url']}\n\n")
        
        # Overall Summary
        f.write("-" * 80 + "\n")
        f.write("OVERALL SUMMARY\n")
        f.write("-" * 80 + "\n\n")
        
        f.write(f"Total Tests: {metadata['total_tests']}\n")
        f.write(f"Passed: {metadata['passed_tests']} ({metadata['overall_accuracy']:.1f}%)\n")
        f.write(f"Failed: {metadata['failed_tests']} ({100-metadata['overall_accuracy']:.1f}%)\n")
        f.write(f"Average Score: {metadata['avg_score']:.1f}%\n")
        f.write(f"Average Response Time: {metadata['avg_response_time']:.2f}s\n\n")
        
        # Category Breakdown
        f.write("-" * 80 + "\n")
        f.write("CATEGORY BREAKDOWN\n")
        f.write("-" * 80 + "\n\n")
        
        for category, stats in sorted(category_stats.items()):
            total = stats['total']
            passed = stats['passed']
            accuracy = (passed / total * 100) if total > 0 else 0
            avg_score = sum(stats['scores']) / total if total > 0 else 0
            
            f.write(f"{category.upper()}: {passed}/{total} ({accuracy:.1f}%) - Avg Score: {avg_score:.1f}%\n")
        
        f.write("\n")
        
        # Failed Queries
        failed_results = [r for r in results if not r['passed']]
        
        if failed_results:
            f.write("-" * 80 + "\n")
            f.write(f"FAILED QUERIES ({len(failed_results)} total)\n")
            f.write("-" * 80 + "\n\n")
            
            for result in failed_results:
                f.write(f"ID: {result['id']}\n")
                f.write(f"Query: {result['query']}\n")
                f.write(f"Category: {result['category']} | Difficulty: {result['difficulty']}\n")
                f.write(f"Expected Keywords: {', '.join(result['expected'])}\n")
                if result['actual']:
                    f.write(f"Response: {result['actual'][:200]}...\n")
                else:
                    f.write("Response: [No response]\n")
                f.write("\n")
    
    print(f"{Colors.GREEN}✅ Human-readable report saved to: {report_file}{Colors.END}\n")
    
    # Print summary to console
    print(f"\n{Colors.BOLD}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}📊 EVALUATION SUMMARY{Colors.END}")
    print(f"{Colors.BOLD}{'=' * 80}{Colors.END}\n")
    
    print(f"{Colors.BOLD}Overall Accuracy:{Colors.END} {metadata['overall_accuracy']:.1f}% ({metadata['passed_tests']}/{metadata['total_tests']})")
    print(f"{Colors.BOLD}Average Score:{Colors.END} {metadata['avg_score']:.1f}%")
    print(f"{Colors.BOLD}Average Response Time:{Colors.END} {metadata['avg_response_time']:.2f}s\n")
    
    print(f"{Colors.BOLD}Category Breakdown:{Colors.END}")
    for category, stats in sorted(category_stats.items()):
        total = stats['total']
        passed = stats['passed']
        accuracy = (passed / total * 100) if total > 0 else 0
        color = Colors.GREEN if accuracy >= 80 else Colors.YELLOW if accuracy >= 60 else Colors.RED
        print(f"  {color}{category.capitalize()}: {accuracy:.1f}% ({passed}/{total}){Colors.END}")
    
    if failed_results:
        print(f"\n{Colors.RED}⚠️  {len(failed_results)} queries failed. See report for details.{Colors.END}")
    else:
        print(f"\n{Colors.GREEN}🎉 All queries passed!{Colors.END}")
    
    print(f"\n{Colors.BOLD}{'=' * 80}{Colors.END}\n")

def main():
    parser = argparse.ArgumentParser(description='Evaluate HafaGPT chatbot performance')
    parser.add_argument('--mode', default='english', choices=['english', 'chamorro', 'learn'],
                       help='Chat mode to test')
    parser.add_argument('--skill-level', choices=['beginner', 'intermediate', 'advanced'],
                       help='User skill level to test (for personalization testing)')
    parser.add_argument('--limit', type=int, help='Limit number of queries to test')
    parser.add_argument('--api-url', default='http://localhost:8000',
                       help='API endpoint URL')
    parser.add_argument('--output', default='./evaluation',
                       help='Output directory for results')
    parser.add_argument('--test-file', default='test_queries.json',
                       help='Test file to use (default: test_queries.json, or use test_queries_v2.json for 100 tests)')
    parser.add_argument('--category', type=str, 
                       help='Filter by category (e.g., translation_eng_to_cham, grammar, cultural). Comma-separated for multiple.')
    
    args = parser.parse_args()
    
    # Setup
    script_dir = Path(__file__).parent
    test_file = script_dir / args.test_file
    output_dir = Path(args.output)
    output_dir.mkdir(exist_ok=True)
    
    # Check if test file exists
    if not test_file.exists():
        print(f"{Colors.RED}❌ Test file not found: {test_file}{Colors.END}")
        print(f"{Colors.YELLOW}Available test files:{Colors.END}")
        for f in script_dir.glob('test_queries*.json'):
            print(f"  - {f.name}")
        sys.exit(1)
    
    # Load test queries
    print(f"{Colors.BOLD}📂 Loading test queries from: {test_file.name}{Colors.END}")
    test_data = load_test_queries(test_file)
    test_queries = test_data['test_queries']
    test_version = test_data.get('metadata', {}).get('version', '1.0')
    
    # Filter by category if specified
    if args.category:
        categories = [c.strip().lower() for c in args.category.split(',')]
        test_queries = [q for q in test_queries if q['category'].lower() in categories]
        print(f"{Colors.BOLD}🏷️  Filtering by categories: {', '.join(categories)}{Colors.END}")
    
    print(f"{Colors.BOLD}📊 Test Suite Version: {test_version}{Colors.END}")
    print(f"{Colors.BOLD}📊 Found {len(test_queries)} test queries{Colors.END}")
    print(f"{Colors.BOLD}🎯 Testing mode: {args.mode}{Colors.END}")
    print(f"{Colors.BOLD}🌐 API URL: {args.api_url}{Colors.END}")
    
    if args.limit:
        print(f"{Colors.YELLOW}⚠️  Limited to first {args.limit} queries{Colors.END}")
    
    # Run evaluation
    evaluation_results = run_evaluation(
        api_url=args.api_url,
        test_queries=test_queries,
        mode=args.mode,
        limit=args.limit,
        skill_level=args.skill_level
    )
    
    # Generate report
    generate_report(evaluation_results, output_dir)

if __name__ == '__main__':
    main()

