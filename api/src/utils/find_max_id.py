#!/usr/bin/env python3
"""Find the maximum ID on chamoru.info dictionary"""

import requests
import time

def check_id_exists(id_num):
    """Check if a dictionary ID exists"""
    url = f"http://www.chamoru.info/dictionary/display.php?action=view&id={id_num}"
    try:
        response = requests.get(url, timeout=5)
        return "no entry found" not in response.text.lower()
    except:
        return False

def binary_search_max(low, high):
    """Binary search to find maximum existing ID"""
    print(f"🔍 Binary searching between {low} and {high}...")
    
    max_found = low
    
    while low <= high:
        mid = (low + high) // 2
        print(f"   Testing ID {mid}...", end=" ")
        
        exists = check_id_exists(mid)
        
        if exists:
            print(f"✅ EXISTS")
            max_found = mid
            low = mid + 1  # Search higher
        else:
            print(f"❌ NOT FOUND")
            high = mid - 1  # Search lower
        
        time.sleep(0.3)  # Be polite to server
    
    return max_found

def find_max_with_gap_tolerance():
    """Find max ID, accounting for possible gaps"""
    print("="*70)
    print("🔍 FINDING MAXIMUM DICTIONARY ID")
    print("="*70)
    
    # Start from your known existing ID
    start = 10200
    
    # Find upper bound (where entries definitely don't exist)
    print(f"\n📍 Starting from known ID: {start}")
    print(f"   Testing if {start} exists...", end=" ")
    if check_id_exists(start):
        print("✅ Confirmed")
    else:
        print("❌ Doesn't exist!")
        return None
    
    # Find rough upper bound
    print(f"\n🔍 Finding upper bound...")
    test_points = [10500, 11000, 12000, 15000, 20000]
    upper_bound = None
    
    for test_id in test_points:
        print(f"   Testing ID {test_id}...", end=" ")
        if check_id_exists(test_id):
            print(f"✅ EXISTS (continuing...)")
            start = test_id
            time.sleep(0.3)
        else:
            print(f"❌ NOT FOUND (upper bound found)")
            upper_bound = test_id
            break
    
    if upper_bound is None:
        print("   No entries found above 10200!")
        upper_bound = 10500
    
    # Binary search between start and upper_bound
    print(f"\n🎯 Binary search phase:")
    max_id = binary_search_max(start, upper_bound)
    
    # Verify we found the actual max by checking a few IDs after
    print(f"\n✅ Maximum ID found: {max_id}")
    print(f"\n🔍 Verifying by checking IDs {max_id+1} to {max_id+10}...")
    
    for offset in range(1, 11):
        test_id = max_id + offset
        if check_id_exists(test_id):
            print(f"   ⚠️  ID {test_id} EXISTS! Updating max...")
            max_id = test_id
        time.sleep(0.2)
    
    print(f"\n" + "="*70)
    print(f"🎯 FINAL RESULT: Maximum ID is {max_id}")
    print(f"="*70)
    print(f"\nRecommendation: Crawl IDs 1 to {max_id + 100} (with buffer)")
    print(f"="*70)
    
    return max_id

if __name__ == "__main__":
    find_max_with_gap_tolerance()

