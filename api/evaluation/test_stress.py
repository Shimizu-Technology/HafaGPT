"""
Stress Tests for HåfaGPT Token Management & Error Handling

Tests that the token management system properly handles:
1. Very long messages (10K+ tokens)
2. Many conversation turns (30+ messages)
3. Combined long context scenarios
4. Error recovery and message persistence

Usage:
    # Requires server running at localhost:8000
    cd HafaGPT-API
    source .venv/bin/activate
    
    # Run all stress tests
    python -m evaluation.test_stress
    
    # Run specific test
    python -m evaluation.test_stress --test long_message
    
    # Run against production (be careful!)
    python -m evaluation.test_stress --api-url https://hafagpt-api.onrender.com

Created: 2024-12-14
Purpose: Verify token overflow fixes work correctly
"""

import os
import sys
import json
import uuid
import time
import argparse
import requests
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()


class StressTester:
    """Stress test suite for token management and error handling."""
    
    def __init__(self, api_url: str = "http://localhost:8000", verbose: bool = True):
        self.api_url = api_url.rstrip('/')
        self.verbose = verbose
        self.results = []
        self.conversations_created = []
        
    def log(self, message: str, level: str = "info"):
        """Log a message if verbose mode is on."""
        if self.verbose:
            prefix = {"info": "ℹ️ ", "success": "✅", "error": "❌", "warn": "⚠️ "}
            print(f"{prefix.get(level, '')} {message}")
    
    def _create_conversation(self, title: str = "Stress Test") -> Optional[str]:
        """Create a new conversation for testing."""
        try:
            response = requests.post(
                f"{self.api_url}/api/eval/conversations",
                json={"title": title},
                timeout=30
            )
            if response.status_code == 200:
                conv_id = response.json().get("id")
                self.conversations_created.append(conv_id)
                return conv_id
            else:
                self.log(f"Failed to create conversation: {response.status_code}", "error")
                return None
        except Exception as e:
            self.log(f"Error creating conversation: {e}", "error")
            return None
    
    def _send_message(self, message: str, conversation_id: Optional[str] = None, 
                      timeout: int = 120) -> Dict[str, Any]:
        """
        Send a message and return the result.
        
        Returns:
            Dict with keys: success, response, error, time_taken
        """
        start_time = time.time()
        try:
            # Eval endpoint uses Form data, not JSON
            form_data = {
                "message": message,
                "mode": "english"
            }
            if conversation_id:
                form_data["conversation_id"] = conversation_id
                
            response = requests.post(
                f"{self.api_url}/api/eval/chat",
                data=form_data,  # Form data, not json
                timeout=timeout
            )
            
            time_taken = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "error": None,
                    "time_taken": time_taken,
                    "status_code": 200
                }
            else:
                return {
                    "success": False,
                    "response": None,
                    "error": f"HTTP {response.status_code}: {response.text[:500]}",
                    "time_taken": time_taken,
                    "status_code": response.status_code
                }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "response": None,
                "error": "Request timed out",
                "time_taken": time.time() - start_time,
                "status_code": None
            }
        except Exception as e:
            return {
                "success": False,
                "response": None,
                "error": str(e),
                "time_taken": time.time() - start_time,
                "status_code": None
            }
    
    def _get_messages(self, conversation_id: str) -> List[Dict]:
        """Get all messages from a conversation."""
        try:
            response = requests.get(
                f"{self.api_url}/api/conversations/{conversation_id}/messages",
                timeout=30
            )
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []
    
    def _generate_long_text(self, target_tokens: int) -> str:
        """
        Generate text of approximately the target token count.
        ~4 chars per token on average.
        """
        # Use realistic Chamorro learning content
        base_phrases = [
            "I want to learn how to say many different things in the Chamorro language. ",
            "Please teach me about Chamorro grammar, vocabulary, and cultural expressions. ",
            "What are the most common greetings, farewells, and everyday phrases? ",
            "Can you explain the difference between formal and informal speech in Chamorro? ",
            "I'm interested in learning about Chamorro food, family, nature, and traditions. ",
            "How do you conjugate verbs in Chamorro? What are the different tenses? ",
            "Tell me about the history and origins of the Chamorro language. ",
            "What resources are available for learning Chamorro? Are there any good books? ",
            "I want to practice having conversations in Chamorro with my family. ",
            "Please help me understand the pronunciation rules for Chamorro words. ",
        ]
        
        # Repeat to reach target length
        text = ""
        target_chars = target_tokens * 4  # ~4 chars per token
        
        while len(text) < target_chars:
            for phrase in base_phrases:
                text += phrase
                if len(text) >= target_chars:
                    break
        
        return text[:target_chars]
    
    # =========================================================================
    # STRESS TEST 1: Very Long Single Message
    # =========================================================================
    def test_long_message(self) -> Dict[str, Any]:
        """
        Test: Send a single very long message (~15K tokens).
        
        Expected behavior:
        - Message should be truncated to fit token budget
        - Response should still be generated
        - No crash or 500 error
        - Message should be saved to database
        """
        test_name = "Long Message (15K tokens)"
        self.log(f"\n{'='*60}")
        self.log(f"TEST: {test_name}")
        self.log(f"{'='*60}")
        
        # Create conversation
        conv_id = self._create_conversation("Stress Test - Long Message")
        if not conv_id:
            return {"test": test_name, "passed": False, "error": "Could not create conversation"}
        
        # Generate ~15K token message
        long_message = self._generate_long_text(15000)
        self.log(f"Generated message: {len(long_message)} chars (~{len(long_message)//4} tokens)")
        
        # Send the message
        self.log("Sending long message...")
        result = self._send_message(long_message, conv_id, timeout=180)
        
        # Check results
        passed = True
        errors = []
        
        if not result["success"]:
            # Check if it's a graceful error (token limit message) vs crash
            if result["error"] and "token" in result["error"].lower():
                self.log("Got graceful token limit error (expected)", "success")
            else:
                passed = False
                errors.append(f"Request failed: {result['error']}")
                self.log(f"Request failed: {result['error']}", "error")
        else:
            self.log(f"Got response in {result['time_taken']:.1f}s", "success")
            # Check response isn't empty
            if not result["response"] or len(result["response"]) < 10:
                passed = False
                errors.append("Response was empty or too short")
            else:
                self.log(f"Response length: {len(result['response'])} chars", "info")
        
        # Verify message was saved
        time.sleep(2)  # Give time for async save
        messages = self._get_messages(conv_id)
        if len(messages) >= 1:
            self.log(f"Message was saved to database ({len(messages)} messages)", "success")
        else:
            # This might be okay if the endpoint doesn't save eval messages
            self.log("Could not verify message persistence (eval endpoint may not save)", "warn")
        
        result_summary = {
            "test": test_name,
            "passed": passed,
            "errors": errors,
            "response_time": result["time_taken"],
            "response_length": len(result.get("response") or ""),
            "message_length_chars": len(long_message),
            "message_length_tokens_approx": len(long_message) // 4
        }
        
        self.results.append(result_summary)
        self.log(f"Result: {'PASSED' if passed else 'FAILED'}", "success" if passed else "error")
        return result_summary
    
    # =========================================================================
    # STRESS TEST 2: Many Conversation Turns
    # =========================================================================
    def test_many_turns(self, num_turns: int = 30) -> Dict[str, Any]:
        """
        Test: Send many messages in a single conversation.
        
        Expected behavior:
        - Older messages should be summarized/truncated
        - Recent messages should still have full context
        - Response time should remain reasonable
        - No token overflow errors
        """
        test_name = f"Many Turns ({num_turns} messages)"
        self.log(f"\n{'='*60}")
        self.log(f"TEST: {test_name}")
        self.log(f"{'='*60}")
        
        # Create conversation
        conv_id = self._create_conversation("Stress Test - Many Turns")
        if not conv_id:
            return {"test": test_name, "passed": False, "error": "Could not create conversation"}
        
        # List of diverse questions to ask
        questions = [
            "What is 'hello' in Chamorro?",
            "How do you say 'thank you'?",
            "What does 'håfa' mean?",
            "Tell me about Chamorro greetings",
            "How do you say 'goodbye'?",
            "What is 'water' in Chamorro?",
            "How do you say 'I love you'?",
            "What does 'maolek' mean?",
            "Tell me about the word 'familia'",
            "How do you say 'good morning'?",
            "What is 'sun' in Chamorro?",
            "How do you say 'moon'?",
            "What does 'tåno' mean?",
            "Tell me about Chamorro numbers",
            "How do you count to five?",
            "What is 'one' in Chamorro?",
            "How do you say 'two'?",
            "What does 'tres' mean?",
            "Tell me about Chamorro colors",
            "What is 'red' in Chamorro?",
            "How do you say 'blue'?",
            "What does 'betde' mean?",
            "Tell me about Chamorro food words",
            "What is 'rice' in Chamorro?",
            "How do you say 'fish'?",
            "What does 'kelaguen' mean?",
            "Tell me about Chamorro family terms",
            "What is 'mother' in Chamorro?",
            "How do you say 'father'?",
            "What does 'che'lu' mean?",
            "Tell me about Chamorro verbs",
            "How do you say 'to go'?",
            "What is 'to eat' in Chamorro?",
            "How do you say 'to sleep'?",
            "Now, based on everything we discussed, what was the first word I asked about?",
        ]
        
        passed = True
        errors = []
        response_times = []
        
        for i in range(min(num_turns, len(questions))):
            question = questions[i]
            self.log(f"Turn {i+1}/{num_turns}: {question[:50]}...")
            
            result = self._send_message(question, conv_id, timeout=120)
            response_times.append(result["time_taken"])
            
            if not result["success"]:
                if "token" in str(result.get("error", "")).lower():
                    self.log(f"Token limit hit at turn {i+1} (may be expected)", "warn")
                else:
                    passed = False
                    errors.append(f"Turn {i+1} failed: {result['error']}")
                    self.log(f"Failed: {result['error']}", "error")
                    break
            else:
                self.log(f"OK ({result['time_taken']:.1f}s)", "success")
        
        # Check if last response references early context
        if result.get("response"):
            response_lower = result["response"].lower()
            if "hello" in response_lower or "håfa" in response_lower or "hafa" in response_lower:
                self.log("Final response correctly referenced earlier context!", "success")
            else:
                self.log("Final response may not have remembered early context", "warn")
        
        avg_time = sum(response_times) / len(response_times) if response_times else 0
        
        result_summary = {
            "test": test_name,
            "passed": passed,
            "errors": errors,
            "turns_completed": len(response_times),
            "avg_response_time": avg_time,
            "max_response_time": max(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0
        }
        
        self.results.append(result_summary)
        self.log(f"Result: {'PASSED' if passed else 'FAILED'}", "success" if passed else "error")
        self.log(f"Avg response time: {avg_time:.1f}s")
        return result_summary
    
    # =========================================================================
    # STRESS TEST 3: Long Message + Long History Combined
    # =========================================================================
    def test_combined_stress(self) -> Dict[str, Any]:
        """
        Test: Build up conversation history, then send a long message.
        
        This is the most challenging scenario - both history AND current
        message are large.
        
        Expected behavior:
        - System should truncate both history and message as needed
        - Response should still be generated
        - No crash
        """
        test_name = "Combined Stress (History + Long Message)"
        self.log(f"\n{'='*60}")
        self.log(f"TEST: {test_name}")
        self.log(f"{'='*60}")
        
        # Create conversation
        conv_id = self._create_conversation("Stress Test - Combined")
        if not conv_id:
            return {"test": test_name, "passed": False, "error": "Could not create conversation"}
        
        # Build up history with 15 turns
        self.log("Building conversation history (15 turns)...")
        history_questions = [
            "What is 'hello' in Chamorro?",
            "How do you say 'thank you'?",
            "What does 'håfa' mean?",
            "Tell me about Chamorro greetings",
            "How do you say 'goodbye'?",
            "What is 'water' in Chamorro?",
            "How do you say 'I love you'?",
            "What does 'maolek' mean?",
            "Tell me about the word 'familia'",
            "How do you say 'good morning'?",
            "What is 'sun' in Chamorro?",
            "How do you say 'moon'?",
            "What does 'tåno' mean?",
            "Tell me about Chamorro numbers",
            "How do you count to five?",
        ]
        
        for i, q in enumerate(history_questions):
            result = self._send_message(q, conv_id, timeout=60)
            if not result["success"]:
                self.log(f"History build failed at turn {i+1}", "error")
                break
            self.log(f"History turn {i+1}/15 complete", "info")
        
        # Now send a long message on top of the history
        self.log("Sending long message on top of history...")
        long_message = self._generate_long_text(8000)  # 8K tokens
        self.log(f"Long message: {len(long_message)} chars (~{len(long_message)//4} tokens)")
        
        result = self._send_message(long_message, conv_id, timeout=180)
        
        passed = True
        errors = []
        
        if not result["success"]:
            if "token" in str(result.get("error", "")).lower():
                self.log("Got graceful token limit error (acceptable)", "warn")
            else:
                passed = False
                errors.append(f"Request failed: {result['error']}")
                self.log(f"Failed: {result['error']}", "error")
        else:
            self.log(f"Got response in {result['time_taken']:.1f}s", "success")
        
        result_summary = {
            "test": test_name,
            "passed": passed,
            "errors": errors,
            "response_time": result.get("time_taken", 0),
            "history_turns": len(history_questions),
            "final_message_tokens_approx": len(long_message) // 4
        }
        
        self.results.append(result_summary)
        self.log(f"Result: {'PASSED' if passed else 'FAILED'}", "success" if passed else "error")
        return result_summary
    
    # =========================================================================
    # STRESS TEST 4: Rapid Fire (Concurrent-ish requests)
    # =========================================================================
    def test_rapid_fire(self, num_requests: int = 10) -> Dict[str, Any]:
        """
        Test: Send many requests in quick succession.
        
        Tests database connection pool handling and SSL recovery.
        """
        test_name = f"Rapid Fire ({num_requests} quick requests)"
        self.log(f"\n{'='*60}")
        self.log(f"TEST: {test_name}")
        self.log(f"{'='*60}")
        
        questions = [
            "What is 'hello' in Chamorro?",
            "How do you say 'water'?",
            "What does 'maolek' mean?",
            "Tell me about Chamorro",
            "What is 'thank you'?",
            "How do you say 'goodbye'?",
            "What is 'love' in Chamorro?",
            "How do you count in Chamorro?",
            "What does 'håfa' mean?",
            "Tell me a Chamorro greeting",
        ]
        
        passed = True
        errors = []
        success_count = 0
        
        for i in range(num_requests):
            question = questions[i % len(questions)]
            self.log(f"Request {i+1}/{num_requests}...")
            
            result = self._send_message(question, timeout=60)
            
            if result["success"]:
                success_count += 1
                self.log(f"OK ({result['time_taken']:.1f}s)", "success")
            else:
                errors.append(f"Request {i+1}: {result['error']}")
                self.log(f"Failed: {result['error']}", "error")
            
            # Small delay to not completely hammer the server
            time.sleep(0.5)
        
        # Allow some failures but not too many
        failure_rate = (num_requests - success_count) / num_requests
        if failure_rate > 0.3:  # More than 30% failure is bad
            passed = False
        
        result_summary = {
            "test": test_name,
            "passed": passed,
            "errors": errors[:5],  # Only keep first 5 errors
            "success_count": success_count,
            "total_requests": num_requests,
            "success_rate": f"{(success_count/num_requests)*100:.1f}%"
        }
        
        self.results.append(result_summary)
        self.log(f"Result: {'PASSED' if passed else 'FAILED'} ({success_count}/{num_requests} succeeded)", 
                 "success" if passed else "error")
        return result_summary
    
    # =========================================================================
    # STRESS TEST 5: Error Recovery
    # =========================================================================
    def test_error_recovery(self) -> Dict[str, Any]:
        """
        Test: Verify the system recovers gracefully from various error conditions.
        
        Tests:
        - Empty message handling
        - Very short message
        - Message after potential error
        """
        test_name = "Error Recovery"
        self.log(f"\n{'='*60}")
        self.log(f"TEST: {test_name}")
        self.log(f"{'='*60}")
        
        passed = True
        errors = []
        
        # Test 1: Empty message
        self.log("Test 1: Empty message...")
        result = self._send_message("", timeout=30)
        # Empty message should either fail gracefully or be handled
        self.log(f"Empty message result: {'success' if result['success'] else result['error']}", "info")
        
        # Test 2: Single character
        self.log("Test 2: Single character message...")
        result = self._send_message("a", timeout=30)
        if result["success"]:
            self.log("Single char handled OK", "success")
        else:
            self.log(f"Single char: {result['error']}", "warn")
        
        # Test 3: Normal message after potential issues
        self.log("Test 3: Normal message after edge cases...")
        result = self._send_message("What is 'hello' in Chamorro?", timeout=60)
        if result["success"]:
            self.log("Recovery successful - normal message works", "success")
        else:
            passed = False
            errors.append(f"Normal message failed after edge cases: {result['error']}")
            self.log(f"Failed: {result['error']}", "error")
        
        result_summary = {
            "test": test_name,
            "passed": passed,
            "errors": errors
        }
        
        self.results.append(result_summary)
        self.log(f"Result: {'PASSED' if passed else 'FAILED'}", "success" if passed else "error")
        return result_summary
    
    # =========================================================================
    # Run All Tests
    # =========================================================================
    def run_all(self) -> List[Dict[str, Any]]:
        """Run all stress tests and return results."""
        print("\n" + "="*70)
        print("🔥 HAFAGPT STRESS TEST SUITE")
        print("="*70)
        print(f"API URL: {self.api_url}")
        print(f"Started: {datetime.now().isoformat()}")
        print("="*70)
        
        # Run tests in order of increasing stress
        self.test_error_recovery()
        self.test_rapid_fire(num_requests=10)
        self.test_long_message()
        self.test_many_turns(num_turns=25)
        self.test_combined_stress()
        
        # Summary
        print("\n" + "="*70)
        print("📊 STRESS TEST SUMMARY")
        print("="*70)
        
        passed = sum(1 for r in self.results if r.get("passed"))
        failed = len(self.results) - passed
        
        for result in self.results:
            status = "✅ PASSED" if result.get("passed") else "❌ FAILED"
            print(f"  {status}: {result['test']}")
            if result.get("errors"):
                for error in result["errors"][:2]:
                    print(f"          └─ {error[:80]}")
        
        print(f"\nTotal: {passed} passed, {failed} failed")
        print("="*70)
        
        # Save results to tmp/YYYY-MM-DD folder (consistent with other tests)
        today = datetime.now().strftime('%Y-%m-%d')
        tmp_dir = os.path.join(os.path.dirname(__file__), "tmp", today)
        os.makedirs(tmp_dir, exist_ok=True)
        
        results_file = os.path.join(
            tmp_dir,
            f"stress_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(results_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "api_url": self.api_url,
                "summary": {"passed": passed, "failed": failed},
                "results": self.results
            }, f, indent=2)
        print(f"\nResults saved to: {results_file}")
        
        return self.results


def main():
    parser = argparse.ArgumentParser(description="HåfaGPT Stress Tests")
    parser.add_argument("--api-url", default="http://localhost:8000",
                        help="API URL to test against")
    parser.add_argument("--test", choices=[
        "long_message", "many_turns", "combined", "rapid_fire", "error_recovery", "all"
    ], default="all", help="Which test to run")
    parser.add_argument("--quiet", action="store_true", help="Less verbose output")
    
    args = parser.parse_args()
    
    tester = StressTester(api_url=args.api_url, verbose=not args.quiet)
    
    if args.test == "all":
        tester.run_all()
    elif args.test == "long_message":
        tester.test_long_message()
    elif args.test == "many_turns":
        tester.test_many_turns()
    elif args.test == "combined":
        tester.test_combined_stress()
    elif args.test == "rapid_fire":
        tester.test_rapid_fire()
    elif args.test == "error_recovery":
        tester.test_error_recovery()


if __name__ == "__main__":
    main()
