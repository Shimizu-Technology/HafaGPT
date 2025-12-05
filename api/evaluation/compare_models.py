#!/usr/bin/env python3
"""
Model Comparison Script for HafaGPT

Compares multiple LLM models against the Chamorro language test suite.
Generates detailed comparison reports with accuracy, speed, and cost metrics.

Usage:
    # Compare specific models
    python compare_models.py --models gpt-4o-mini,claude-3.5-sonnet,gemini-2.0-flash
    
    # Quick test with 10 queries
    python compare_models.py --models gpt-4o-mini,deepseek-v3 --limit 10
    
    # Test all available models
    python compare_models.py --all

Requirements:
    - OPENAI_API_KEY (for OpenAI models)
    - OPENROUTER_API_KEY (for Claude, Gemini, DeepSeek, Qwen, etc.)
    
Get OpenRouter key at: https://openrouter.ai (free tier available)
"""

import json
import sys
import time
import argparse
import unicodedata
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

try:
    # When run as module (python -m evaluation.compare_models)
    from evaluation.model_providers import (
        get_provider, 
        list_available_models, 
        ModelProvider, 
        ModelResponse,
        AVAILABLE_MODELS
    )
except ImportError:
    # When run directly (python compare_models.py)
    from model_providers import (
        get_provider, 
        list_available_models, 
        ModelProvider, 
        ModelResponse,
        AVAILABLE_MODELS
    )


# ANSI color codes
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    BOLD = '\033[1m'
    END = '\033[0m'


# =============================================================================
# System Prompt for Chamorro Language Assistant
# =============================================================================

SYSTEM_PROMPT = """You are HåfaGPT, an expert Chamorro language tutor and cultural guide. You help users learn Chamorro, the indigenous language of Guam and the Mariana Islands.

When answering questions:
1. Provide accurate Chamorro translations with proper diacritics (å, ñ, ') when known
2. Explain cultural context when relevant
3. Give pronunciation guidance
4. Be encouraging and educational

Important notes:
- "Håfa Adai" is the standard greeting (literally "What?" in a welcoming sense)
- "Si Yu'os Må'åse'" means "Thank you" (literally "May God have mercy")
- "Maolek" means "good" or "well"
- The glottal stop (') is an important consonant in Chamorro

Always aim to be helpful, accurate, and culturally respectful."""


# =============================================================================
# Evaluation Functions
# =============================================================================

def normalize_for_comparison(text: str) -> str:
    """Normalize text for comparison by removing diacritics and glottal stops."""
    text = text.lower()
    text = re.sub(r"['ʼ`'']", "", text)
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return text


def check_keywords_present(response: str, expected_keywords: List[str]) -> tuple[bool, List[str]]:
    """Check if expected keywords are present in the response."""
    response_normalized = normalize_for_comparison(response)
    found_keywords = []
    
    for keyword in expected_keywords:
        keyword_normalized = normalize_for_comparison(keyword)
        if keyword_normalized in response_normalized:
            found_keywords.append(keyword)
    
    passed = len(found_keywords) > 0
    return passed, found_keywords


def calculate_score(passed: bool, found_keywords: List[str], expected_keywords: List[str]) -> float:
    """Calculate a score for the response."""
    if not passed:
        return 0.0
    
    match_ratio = len(found_keywords) / len(expected_keywords)
    
    if match_ratio >= 1.0:
        return 100.0
    elif match_ratio >= 0.5:
        return 80.0
    else:
        return 50.0


def load_test_queries(file_path: str) -> List[Dict]:
    """Load test queries from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data.get('test_queries', [])


def evaluate_model(
    provider: ModelProvider,
    model_name: str,
    test_queries: List[Dict],
    limit: Optional[int] = None,
    verbose: bool = True
) -> Dict[str, Any]:
    """
    Evaluate a single model against the test suite.
    
    Returns:
        Dict with results, stats, and metrics
    """
    queries_to_test = test_queries[:limit] if limit else test_queries
    total = len(queries_to_test)
    
    results = []
    category_stats = defaultdict(lambda: {'total': 0, 'passed': 0, 'scores': []})
    total_cost = 0.0
    total_time = 0.0
    total_tokens = 0
    
    if verbose:
        print(f"\n{Colors.BOLD}🔬 Testing: {model_name}{Colors.END}")
        print(f"   Provider: {provider.get_provider_name()}")
        print(f"   Model ID: {provider.model}")
        print("-" * 50)
    
    for i, test in enumerate(queries_to_test, 1):
        query = test['query']
        expected = test['expected_keywords']
        category = test['category']
        
        if verbose:
            progress = f"[{i}/{total}]"
            print(f"  {progress} {query[:50]}...", end=" ", flush=True)
        
        try:
            response = provider.chat(
                message=query,
                system_prompt=SYSTEM_PROMPT,
                temperature=0.3,  # Lower for more consistent results
                max_tokens=512
            )
            
            # Check keywords
            passed, found_keywords = check_keywords_present(response.content, expected)
            score = calculate_score(passed, found_keywords, expected)
            
            # Update stats
            total_cost += response.cost_estimate or 0
            total_time += response.response_time
            total_tokens += response.total_tokens or 0
            
            category_stats[category]['total'] += 1
            category_stats[category]['scores'].append(score)
            if passed:
                category_stats[category]['passed'] += 1
            
            results.append({
                'query': query,
                'category': category,
                'expected': expected,
                'found_keywords': found_keywords,
                'passed': passed,
                'score': score,
                'response_time': response.response_time,
                'tokens': response.total_tokens,
                'cost': response.cost_estimate,
                'response_preview': response.content[:200]
            })
            
            if verbose:
                status = f"{Colors.GREEN}✓{Colors.END}" if passed else f"{Colors.RED}✗{Colors.END}"
                print(f"{status} ({response.response_time:.1f}s)")
                
        except Exception as e:
            if verbose:
                print(f"{Colors.RED}ERROR: {str(e)[:50]}{Colors.END}")
            results.append({
                'query': query,
                'category': category,
                'expected': expected,
                'found_keywords': [],
                'passed': False,
                'score': 0.0,
                'response_time': 0,
                'tokens': 0,
                'cost': 0,
                'error': str(e)
            })
            category_stats[category]['total'] += 1
            category_stats[category]['scores'].append(0)
    
    # Calculate overall stats
    all_scores = [r['score'] for r in results]
    passed_count = sum(1 for r in results if r['passed'])
    
    # Category breakdown
    category_summary = {}
    for cat, stats in category_stats.items():
        avg_score = sum(stats['scores']) / len(stats['scores']) if stats['scores'] else 0
        category_summary[cat] = {
            'total': stats['total'],
            'passed': stats['passed'],
            'accuracy': (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0,
            'avg_score': avg_score
        }
    
    return {
        'model_name': model_name,
        'provider': provider.get_provider_name(),
        'model_id': provider.model,
        'results': results,
        'summary': {
            'total_queries': total,
            'passed': passed_count,
            'accuracy': (passed_count / total * 100) if total > 0 else 0,
            'avg_score': sum(all_scores) / len(all_scores) if all_scores else 0,
            'avg_response_time': total_time / total if total > 0 else 0,
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'cost_per_query': total_cost / total if total > 0 else 0,
        },
        'category_breakdown': category_summary
    }


def compare_models(
    model_names: List[str],
    test_queries: List[Dict],
    limit: Optional[int] = None,
    verbose: bool = True
) -> Dict[str, Any]:
    """
    Compare multiple models against the test suite.
    
    Returns:
        Dict with all results and comparison summary
    """
    comparison_results = {}
    
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}🏆 Model Comparison - HafaGPT Chamorro Test Suite{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"\nModels to test: {', '.join(model_names)}")
    print(f"Test queries: {len(test_queries[:limit] if limit else test_queries)}")
    
    for model_name in model_names:
        try:
            provider = get_provider(model_name)
            result = evaluate_model(provider, model_name, test_queries, limit, verbose)
            comparison_results[model_name] = result
        except Exception as e:
            print(f"\n{Colors.RED}⚠️ Failed to test {model_name}: {str(e)}{Colors.END}")
            comparison_results[model_name] = {
                'model_name': model_name,
                'error': str(e),
                'summary': {
                    'accuracy': 0,
                    'avg_score': 0,
                    'avg_response_time': 0,
                    'total_cost': 0,
                }
            }
    
    return comparison_results


def print_comparison_table(results: Dict[str, Any]) -> None:
    """Print a formatted comparison table."""
    print(f"\n{Colors.BOLD}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}📊 COMPARISON RESULTS{Colors.END}")
    print(f"{Colors.BOLD}{'='*80}{Colors.END}")
    
    # Header
    print(f"\n{'Model':<20} {'Accuracy':>10} {'Avg Score':>10} {'Speed':>10} {'Cost':>12} {'$/Query':>10}")
    print("-" * 80)
    
    # Sort by accuracy
    sorted_results = sorted(
        [(name, data) for name, data in results.items() if 'error' not in data],
        key=lambda x: x[1]['summary']['accuracy'],
        reverse=True
    )
    
    for i, (name, data) in enumerate(sorted_results):
        summary = data['summary']
        
        # Color coding
        if i == 0:
            color = Colors.GREEN  # Best
        elif summary['accuracy'] >= 80:
            color = Colors.CYAN
        elif summary['accuracy'] >= 60:
            color = Colors.YELLOW
        else:
            color = Colors.RED
        
        # Format cost
        cost_str = f"${summary['total_cost']:.4f}" if summary['total_cost'] > 0 else "FREE"
        per_query = f"${summary['cost_per_query']:.5f}" if summary['cost_per_query'] > 0 else "FREE"
        
        print(f"{color}{name:<20} {summary['accuracy']:>9.1f}% {summary['avg_score']:>9.1f}% "
              f"{summary['avg_response_time']:>8.2f}s {cost_str:>12} {per_query:>10}{Colors.END}")
    
    # Print failed models
    failed = [(name, data) for name, data in results.items() if 'error' in data]
    if failed:
        print(f"\n{Colors.RED}Failed models:{Colors.END}")
        for name, data in failed:
            print(f"  {name}: {data['error'][:50]}")
    
    # Category breakdown for top model
    if sorted_results:
        best_model, best_data = sorted_results[0]
        print(f"\n{Colors.BOLD}🏆 Best Model: {best_model}{Colors.END}")
        print(f"\nCategory Breakdown:")
        for cat, stats in best_data.get('category_breakdown', {}).items():
            bar = "█" * int(stats['accuracy'] / 5) + "░" * (20 - int(stats['accuracy'] / 5))
            print(f"  {cat:<15} [{bar}] {stats['accuracy']:.1f}%")


def print_category_comparison(results: Dict[str, Any]) -> None:
    """Print category-by-category comparison across models."""
    print(f"\n{Colors.BOLD}📈 CATEGORY COMPARISON{Colors.END}")
    print("-" * 80)
    
    # Get all categories
    categories = set()
    for data in results.values():
        if 'category_breakdown' in data:
            categories.update(data['category_breakdown'].keys())
    
    # Sort models by overall accuracy
    sorted_models = sorted(
        [(name, data) for name, data in results.items() if 'error' not in data],
        key=lambda x: x[1]['summary']['accuracy'],
        reverse=True
    )
    
    model_names = [name for name, _ in sorted_models]
    
    # Print header
    print(f"\n{'Category':<15}", end="")
    for name in model_names:
        print(f" {name[:12]:>12}", end="")
    print()
    print("-" * (15 + 13 * len(model_names)))
    
    # Print each category
    for category in sorted(categories):
        print(f"{category:<15}", end="")
        for name in model_names:
            data = results[name]
            cat_data = data.get('category_breakdown', {}).get(category, {})
            accuracy = cat_data.get('accuracy', 0)
            
            # Color code
            if accuracy >= 90:
                color = Colors.GREEN
            elif accuracy >= 70:
                color = Colors.CYAN
            elif accuracy >= 50:
                color = Colors.YELLOW
            else:
                color = Colors.RED
            
            print(f" {color}{accuracy:>11.1f}%{Colors.END}", end="")
        print()


def save_comparison_report(results: Dict[str, Any], output_dir: str) -> str:
    """Save detailed comparison report to files."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save JSON results
    json_file = output_path / f"model_comparison_{timestamp}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Save text report
    txt_file = output_path / f"model_comparison_{timestamp}.txt"
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("HafaGPT Model Comparison Report\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 80 + "\n\n")
        
        # Summary table
        f.write("SUMMARY\n")
        f.write("-" * 80 + "\n")
        f.write(f"{'Model':<20} {'Accuracy':>10} {'Avg Score':>10} {'Speed':>10} {'Cost':>12}\n")
        f.write("-" * 80 + "\n")
        
        sorted_results = sorted(
            [(name, data) for name, data in results.items() if 'error' not in data],
            key=lambda x: x[1]['summary']['accuracy'],
            reverse=True
        )
        
        for name, data in sorted_results:
            s = data['summary']
            cost = f"${s['total_cost']:.4f}" if s['total_cost'] > 0 else "FREE"
            f.write(f"{name:<20} {s['accuracy']:>9.1f}% {s['avg_score']:>9.1f}% "
                   f"{s['avg_response_time']:>8.2f}s {cost:>12}\n")
        
        # Recommendations
        if sorted_results:
            f.write("\n" + "=" * 80 + "\n")
            f.write("RECOMMENDATIONS\n")
            f.write("-" * 80 + "\n")
            
            best_accuracy = sorted_results[0]
            f.write(f"🏆 Best Accuracy: {best_accuracy[0]} ({best_accuracy[1]['summary']['accuracy']:.1f}%)\n")
            
            # Best value (accuracy / cost)
            value_sorted = sorted(
                sorted_results,
                key=lambda x: x[1]['summary']['accuracy'] / max(x[1]['summary']['total_cost'], 0.0001),
                reverse=True
            )
            f.write(f"💰 Best Value: {value_sorted[0][0]}\n")
            
            # Fastest
            speed_sorted = sorted(
                sorted_results,
                key=lambda x: x[1]['summary']['avg_response_time']
            )
            f.write(f"⚡ Fastest: {speed_sorted[0][0]} ({speed_sorted[0][1]['summary']['avg_response_time']:.2f}s avg)\n")
    
    print(f"\n{Colors.GREEN}📁 Reports saved:{Colors.END}")
    print(f"   {json_file}")
    print(f"   {txt_file}")
    
    return str(json_file)


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Compare LLM models for Chamorro language learning",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Compare specific models
  python compare_models.py --models gpt-4o-mini,claude-3.5-sonnet,gemini-2.0-flash
  
  # Quick test with 10 queries
  python compare_models.py --models gpt-4o-mini,deepseek-v3 --limit 10
  
  # Test all available models (requires all API keys)
  python compare_models.py --all --limit 20
  
  # List available models
  python compare_models.py --list

Required Environment Variables:
  OPENAI_API_KEY     - For OpenAI models (gpt-4o-mini, gpt-4o)
  OPENROUTER_API_KEY - For all other models via OpenRouter
                       Get one at: https://openrouter.ai (free tier available)
        """
    )
    
    parser.add_argument(
        '--models', '-m',
        type=str,
        help='Comma-separated list of models to compare'
    )
    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Test all available models'
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        default=None,
        help='Limit number of test queries (for quick testing)'
    )
    parser.add_argument(
        '--test-file', '-t',
        type=str,
        default='evaluation/test_queries.json',
        help='Path to test queries JSON file'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='evaluation',
        help='Output directory for reports'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='List available models and exit'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Reduce output verbosity'
    )
    
    args = parser.parse_args()
    
    # List models
    if args.list:
        print(f"\n{Colors.BOLD}Available Models:{Colors.END}")
        print("-" * 70)
        print(f"{'Name':<20} {'Provider':<12} {'Input $/1M':>12} {'Output $/1M':>12}")
        print("-" * 70)
        for name, info in list_available_models().items():
            cost_in = f"${info['cost_per_1m_input']:.3f}" if info['cost_per_1m_input'] > 0 else "FREE"
            cost_out = f"${info['cost_per_1m_output']:.3f}" if info['cost_per_1m_output'] > 0 else "FREE"
            print(f"{name:<20} {info['provider']:<12} {cost_in:>12} {cost_out:>12}")
        print("-" * 70)
        print(f"\n{Colors.CYAN}Usage: python compare_models.py --models gpt-4o-mini,claude-3.5-sonnet{Colors.END}")
        return
    
    # Determine models to test
    if args.all:
        model_names = list(AVAILABLE_MODELS.keys())
    elif args.models:
        model_names = [m.strip() for m in args.models.split(',')]
    else:
        # Default: compare baseline vs top contenders
        model_names = ['gpt-4o-mini', 'gemini-2.0-flash', 'deepseek-v3']
        print(f"\n{Colors.YELLOW}No models specified. Using defaults: {', '.join(model_names)}{Colors.END}")
        print(f"Use --models to specify models or --list to see available options.\n")
    
    # Validate models
    invalid = [m for m in model_names if m not in AVAILABLE_MODELS]
    if invalid:
        print(f"{Colors.RED}Unknown models: {', '.join(invalid)}{Colors.END}")
        print(f"Available: {', '.join(AVAILABLE_MODELS.keys())}")
        sys.exit(1)
    
    # Load test queries
    try:
        test_queries = load_test_queries(args.test_file)
        print(f"Loaded {len(test_queries)} test queries from {args.test_file}")
    except FileNotFoundError:
        print(f"{Colors.RED}Error: Test file not found: {args.test_file}{Colors.END}")
        sys.exit(1)
    
    # Run comparison
    results = compare_models(
        model_names=model_names,
        test_queries=test_queries,
        limit=args.limit,
        verbose=not args.quiet
    )
    
    # Print results
    print_comparison_table(results)
    print_category_comparison(results)
    
    # Save reports
    save_comparison_report(results, args.output)
    
    # Final recommendation
    sorted_results = sorted(
        [(name, data) for name, data in results.items() if 'error' not in data],
        key=lambda x: x[1]['summary']['accuracy'],
        reverse=True
    )
    
    if sorted_results:
        best = sorted_results[0]
        print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.GREEN}🏆 WINNER: {best[0]}{Colors.END}")
        print(f"   Accuracy: {best[1]['summary']['accuracy']:.1f}%")
        print(f"   Avg Response Time: {best[1]['summary']['avg_response_time']:.2f}s")
        print(f"   Total Cost: ${best[1]['summary']['total_cost']:.4f}")
        print(f"{Colors.BOLD}{'='*60}{Colors.END}\n")


if __name__ == "__main__":
    main()

