"""
Web Search Tool for Chamorro Chatbot
Uses Brave Search API to find current information not in the RAG database.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def web_search(query, search_type="general", max_results=5):
    """
    Search the web using Brave Search API.
    
    Args:
        query: The search query
        search_type: "general", "recipe", or "news"
        max_results: Number of results to return (default 5)
    
    Returns:
        dict with 'success', 'results', and optional 'error'
    """
    api_key = os.getenv("BRAVE_API_KEY")
    
    if not api_key:
        return {
            "success": False,
            "error": "BRAVE_API_KEY not found in environment variables",
            "results": []
        }
    
    # Adjust query based on search type
    if search_type == "recipe":
        query = f"chamorro recipe {query}"
    elif search_type == "news":
        query = f"guam chamorro {query}"
    
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": api_key
    }
    params = {
        "q": query,
        "count": max_results
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract web results
        web_results = data.get("web", {}).get("results", [])
        
        if not web_results:
            return {
                "success": True,
                "results": [],
                "message": "No results found"
            }
        
        # Format results
        formatted_results = []
        for result in web_results[:max_results]:
            formatted_results.append({
                "title": result.get("title", "No title"),
                "url": result.get("url", ""),
                "description": result.get("description", "No description"),
                "snippet": result.get("extra_snippets", [])
            })
        
        return {
            "success": True,
            "results": formatted_results,
            "query": query
        }
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Search request timed out",
            "results": []
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Search failed: {str(e)}",
            "results": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "results": []
        }


def format_search_results(search_response):
    """
    Format search results for LLM context.
    
    Args:
        search_response: Response from web_search()
    
    Returns:
        Formatted string for LLM prompt
    """
    if not search_response["success"]:
        return ""
    
    results = search_response["results"]
    if not results:
        return ""
    
    formatted = "\n\n" + "="*80 + "\n"
    formatted += "🔍 REAL-TIME WEB SEARCH RESULTS (Use these to answer the question!)\n"
    formatted += "="*80 + "\n"
    formatted += f"Search Query: {search_response.get('query', 'N/A')}\n\n"
    
    for i, result in enumerate(results, 1):
        formatted += f"──────────────────────────────────────────────────────────────────────────────\n"
        formatted += f"[Web Source {i}]\n"
        formatted += f"Title: {result['title']}\n"
        formatted += f"URL: {result['url']}\n"
        formatted += f"Content: {result['description']}\n"
        formatted += f"──────────────────────────────────────────────────────────────────────────────\n\n"
    
    formatted += "="*80 + "\n"
    formatted += "⚠️ IMPORTANT INSTRUCTIONS:\n"
    formatted += "1. YOU HAVE CURRENT WEB INFORMATION ABOVE - USE IT!\n"
    formatted += "2. Answer the user's question using these web search results\n"
    formatted += "3. Start your response with: 'Based on current information...' or 'According to recent sources...'\n"
    formatted += "4. Cite the sources when using the information\n"
    formatted += "5. DO NOT say 'I cannot browse the internet' - you have the results above!\n"
    formatted += "="*80 + "\n\n"
    
    return formatted


# Test function
if __name__ == "__main__":
    print("🔍 Testing Brave Search API...\n")
    
    # Test 1: General search
    print("Test 1: General search - 'Guam Liberation Day 2025'")
    result = web_search("Guam Liberation Day 2025")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"Found {len(result['results'])} results")
        if result['results']:
            print(f"First result: {result['results'][0]['title']}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")
    print()
    
    # Test 2: Recipe search
    print("Test 2: Recipe search - 'kelaguen'")
    result = web_search("kelaguen", search_type="recipe")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"Found {len(result['results'])} results")
        if result['results']:
            print(f"First result: {result['results'][0]['title']}")
    print()
    
    # Test 3: Format results
    print("Test 3: Formatting results")
    formatted = format_search_results(result)
    if formatted:
        print("Formatted output preview:")
        print(formatted[:300] + "...")
    else:
        print("No results to format")


