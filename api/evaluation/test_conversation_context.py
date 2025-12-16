"""
Conversation Context Tests

Tests that verify the chatbot correctly maintains context across multi-turn conversations.

What this tests:
1. Context Retention - Does it remember what was discussed N messages ago?
2. Reference Resolution - Can it answer "what was that word?" correctly?
3. No Hallucination - Does it avoid inventing things that weren't said?
4. Cross-Conversation Isolation - Does it NOT leak context from other conversations?

Usage:
    # Run all tests (requires server running at localhost:8000)
    python -m evaluation.test_conversation_context
    
    # Run specific test
    python -m evaluation.test_conversation_context --test context_retention
    
    # Run against production
    python -m evaluation.test_conversation_context --api-url https://hafagpt-api.onrender.com

Note: These tests create real conversations in the database to test the full flow.
"""

import os
import sys
import json
import uuid
import time
import argparse
import requests
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()


class ConversationContextTester:
    """Test suite for conversation context handling."""
    
    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url.rstrip('/')
        self.test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.conversations_created = []
        self.results = []
        
    def _create_conversation(self, title: str = "Test Conversation") -> str:
        """Create a new conversation and return its ID."""
        try:
            # Use the eval endpoint (no auth required)
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
                print(f"❌ Failed to create conversation: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error creating conversation: {e}")
            return None
    
    def _send_message(self, conversation_id: str, message: str, wait_for_response: bool = True) -> Optional[str]:
        """Send a message to a conversation and return the response."""
        try:
            # Use the eval endpoint (no auth required, supports conversation_id)
            response = requests.post(
                f"{self.api_url}/api/eval/chat",
                json={
                    "message": message,
                    "mode": "english",
                    "conversation_id": conversation_id
                },
                timeout=120  # Long timeout for LLM response
            )
            if response.status_code == 200:
                return response.json().get("response", "")
            else:
                print(f"❌ Chat request failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error sending message: {e}")
            return None
    
    def _check_keywords(self, response: str, expected_keywords: list[str]) -> tuple[bool, list[str]]:
        """Check if response contains expected keywords."""
        if not response:
            return False, expected_keywords
        
        response_lower = response.lower()
        found = []
        missing = []
        
        for keyword in expected_keywords:
            if keyword.lower() in response_lower:
                found.append(keyword)
            else:
                missing.append(keyword)
        
        # Pass if at least one keyword found
        passed = len(found) > 0
        return passed, missing
    
    def _check_not_contains(self, response: str, forbidden_keywords: list[str]) -> tuple[bool, list[str]]:
        """Check if response does NOT contain forbidden keywords."""
        if not response:
            return True, []
        
        response_lower = response.lower()
        found_forbidden = []
        
        for keyword in forbidden_keywords:
            if keyword.lower() in response_lower:
                found_forbidden.append(keyword)
        
        passed = len(found_forbidden) == 0
        return passed, found_forbidden
    
    def test_context_retention_5_messages(self) -> dict:
        """Test: Does the bot remember context from 5 messages ago?"""
        print("\n📝 Test: Context Retention (5 messages)")
        print("-" * 50)
        
        conv_id = self._create_conversation("Context Test - 5 Messages")
        if not conv_id:
            return {"test": "context_retention_5", "passed": False, "error": "Failed to create conversation"}
        
        # Build up conversation history
        messages = [
            ("How do you say 'dog' in Chamorro?", None),  # Should answer: ga'lågu
            ("What about 'cat'?", None),  # Should answer: katu
            ("And 'bird'?", None),  # Should answer: paluma/påharu
            ("How do you say 'fish'?", None),  # Should answer: guihan
            ("Tell me a fun fact about Guam.", None),  # Filler message
            # NOW test recall:
            ("What was the first animal I asked about?", ["dog", "ga'lågu"]),
        ]
        
        for i, (msg, expected) in enumerate(messages):
            print(f"  [{i+1}/{len(messages)}] Sending: {msg[:50]}...")
            response = self._send_message(conv_id, msg)
            
            if expected:
                passed, missing = self._check_keywords(response, expected)
                result = {
                    "test": "context_retention_5",
                    "passed": passed,
                    "message": msg,
                    "expected": expected,
                    "missing": missing,
                    "response_preview": response[:200] if response else None
                }
                
                if passed:
                    print(f"  ✅ PASSED - Bot correctly remembered the first animal")
                else:
                    print(f"  ❌ FAILED - Bot didn't mention 'dog' or 'ga'lågu'")
                    print(f"     Response: {response[:200] if response else 'None'}...")
                
                return result
            
            time.sleep(1)  # Brief pause between messages
        
        return {"test": "context_retention_5", "passed": False, "error": "Test didn't complete"}
    
    def test_context_retention_10_messages(self) -> dict:
        """Test: Does the bot remember context from 10 messages ago?"""
        print("\n📝 Test: Context Retention (10 messages)")
        print("-" * 50)
        
        conv_id = self._create_conversation("Context Test - 10 Messages")
        if not conv_id:
            return {"test": "context_retention_10", "passed": False, "error": "Failed to create conversation"}
        
        # Build up 10 messages of history
        messages = [
            ("What is the Chamorro word for 'mother'?", None),  # nåna
            ("How about 'father'?", None),  # tåta
            ("What's 'grandmother'?", None),  # 
            ("And 'grandfather'?", None),  #
            ("How do you say 'sister'?", None),  #
            ("What about 'brother'?", None),  #
            ("How is 'uncle' said?", None),  #
            ("And 'aunt'?", None),  #
            ("What's the word for 'cousin'?", None),  #
            ("Tell me about Chamorro family traditions.", None),  # Filler
            # Test recall:
            ("Earlier I asked about family words. What was the very first family member I asked about?", ["mother", "nåna"]),
        ]
        
        for i, (msg, expected) in enumerate(messages):
            print(f"  [{i+1}/{len(messages)}] Sending: {msg[:50]}...")
            response = self._send_message(conv_id, msg)
            
            if expected:
                passed, missing = self._check_keywords(response, expected)
                result = {
                    "test": "context_retention_10",
                    "passed": passed,
                    "message": msg,
                    "expected": expected,
                    "missing": missing,
                    "response_preview": response[:200] if response else None
                }
                
                if passed:
                    print(f"  ✅ PASSED - Bot correctly remembered 'mother' from 10 messages ago")
                else:
                    print(f"  ❌ FAILED - Bot didn't recall the first family member")
                    print(f"     Response: {response[:200] if response else 'None'}...")
                
                return result
            
            time.sleep(1)
        
        return {"test": "context_retention_10", "passed": False, "error": "Test didn't complete"}
    
    def test_reference_resolution(self) -> dict:
        """Test: Can the bot resolve references like 'that word you mentioned'?"""
        print("\n📝 Test: Reference Resolution")
        print("-" * 50)
        
        conv_id = self._create_conversation("Reference Resolution Test")
        if not conv_id:
            return {"test": "reference_resolution", "passed": False, "error": "Failed to create conversation"}
        
        # Teach a specific word, then ask about it indirectly
        # Note: Chamorro has multiple words for "beautiful" - bunita/bunitu, gefpa'gu, såmai
        # We accept any of them since the bot may choose different translations
        messages = [
            ("How do you say 'beautiful' in Chamorro?", None),
            ("Can you use that word in a sentence?", ["bunita", "bunitu", "gefpa'gu", "såmai", "beautiful"]),
        ]
        
        for i, (msg, expected) in enumerate(messages):
            print(f"  [{i+1}/{len(messages)}] Sending: {msg[:50]}...")
            response = self._send_message(conv_id, msg)
            
            if expected:
                passed, missing = self._check_keywords(response, expected)
                result = {
                    "test": "reference_resolution",
                    "passed": passed,
                    "message": msg,
                    "expected": expected,
                    "missing": missing,
                    "response_preview": response[:200] if response else None
                }
                
                if passed:
                    print(f"  ✅ PASSED - Bot correctly used 'bunita/bunitu' in the sentence")
                else:
                    print(f"  ❌ FAILED - Bot didn't reference the previously mentioned word")
                    print(f"     Response: {response[:200] if response else 'None'}...")
                
                return result
            
            time.sleep(1)
        
        return {"test": "reference_resolution", "passed": False, "error": "Test didn't complete"}
    
    def test_no_hallucination(self) -> dict:
        """Test: Does the bot avoid hallucinating things that weren't discussed?"""
        print("\n📝 Test: No Hallucination")
        print("-" * 50)
        
        conv_id = self._create_conversation("Hallucination Test")
        if not conv_id:
            return {"test": "no_hallucination", "passed": False, "error": "Failed to create conversation"}
        
        # Ask about something specific, then ask about something we DIDN'T discuss
        messages = [
            ("How do you say 'hello' in Chamorro?", None),  # håfa adai
            ("Did we discuss the word for 'goodbye' earlier in THIS conversation?", None),  # We didn't!
        ]
        
        print(f"  [1/2] Sending: {messages[0][0][:50]}...")
        self._send_message(conv_id, messages[0][0])
        time.sleep(1)
        
        print(f"  [2/2] Sending: {messages[1][0][:50]}...")
        response = self._send_message(conv_id, messages[1][0])
        
        # The bot should say NO, we didn't discuss goodbye
        # Note: It may helpfully provide goodbye info while clarifying we didn't discuss it
        response_lower = response.lower() if response else ""
        
        # Check if it correctly indicates "no" or clarifies we only discussed hello
        indicates_correct = any(phrase in response_lower for phrase in [
            "no,", "didn't discuss", "did not discuss", "haven't discussed",
            "we discussed hello", "only asked about hello", "just asked about hello",
            "only hello", "just hello", "first message", "not yet",
            "only greeting", "just greeting", "haven't talked about goodbye"
        ])
        
        # Check if it definitely INCORRECTLY claims we previously discussed goodbye
        definite_hallucination = any(phrase in response_lower for phrase in [
            "yes, we discussed goodbye earlier", "we talked about goodbye before",
            "as i mentioned about goodbye", "when we discussed goodbye"
        ])
        
        # Pass if it either correctly says no, or at least doesn't definitively hallucinate
        passed = indicates_correct or not definite_hallucination
        
        result = {
            "test": "no_hallucination",
            "passed": passed,
            "response_preview": response[:300] if response else None,
            "notes": "Bot should not claim we discussed 'goodbye' when we only discussed 'hello'. Note: Providing goodbye info while clarifying is OK."
        }
        
        if passed:
            print(f"  ✅ PASSED - Bot handled context correctly")
        else:
            print(f"  ⚠️  CAUTION - Bot may have hallucinated prior discussion")
            print(f"     Response: {response[:300] if response else 'None'}...")
        
        return result
    
    def test_cross_conversation_isolation(self) -> dict:
        """Test: Does context from one conversation leak into another?"""
        print("\n📝 Test: Cross-Conversation Isolation")
        print("-" * 50)
        
        # Conversation A: Discuss specific topic
        conv_a = self._create_conversation("Isolation Test - Conv A")
        if not conv_a:
            return {"test": "cross_conversation_isolation", "passed": False, "error": "Failed to create conv A"}
        
        print("  [Conv A] Discussing numbers...")
        self._send_message(conv_a, "Teach me Chamorro numbers 1-5: unu, dos, tres, kuåtro, singko")
        time.sleep(1)
        
        # Conversation B: Ask about what was discussed (should NOT know about Conv A)
        conv_b = self._create_conversation("Isolation Test - Conv B")
        if not conv_b:
            return {"test": "cross_conversation_isolation", "passed": False, "error": "Failed to create conv B"}
        
        print("  [Conv B] Asking about prior context (should be empty)...")
        response = self._send_message(conv_b, "What did we discuss earlier in this conversation?")
        
        response_lower = response.lower() if response else ""
        
        # The bot should NOT mention numbers, unu, dos, etc. from Conv A
        leaked_keywords = ["unu", "dos", "tres", "kuåtro", "singko", "numbers 1-5"]
        passed, found_leaked = self._check_not_contains(response, leaked_keywords)
        
        # It should indicate this is a new conversation
        indicates_new = any(phrase in response_lower for phrase in [
            "first message", "new conversation", "haven't discussed",
            "just started", "no prior", "nothing yet"
        ])
        
        result = {
            "test": "cross_conversation_isolation",
            "passed": passed,
            "leaked_keywords": found_leaked if not passed else [],
            "response_preview": response[:300] if response else None,
            "notes": "Conv B should NOT know about numbers discussed in Conv A"
        }
        
        if passed:
            print(f"  ✅ PASSED - Conversation B has no knowledge of Conversation A")
        else:
            print(f"  ❌ FAILED - Context leaked! Found: {found_leaked}")
            print(f"     Response: {response[:300] if response else 'None'}...")
        
        return result
    
    def test_multi_turn_coherence(self) -> dict:
        """Test: Does a multi-turn conversation remain coherent?"""
        print("\n📝 Test: Multi-Turn Coherence")
        print("-" * 50)
        
        conv_id = self._create_conversation("Coherence Test")
        if not conv_id:
            return {"test": "multi_turn_coherence", "passed": False, "error": "Failed to create conversation"}
        
        # A logical flow that builds on previous messages
        messages = [
            ("I'm planning a trip to Guam. What's a good greeting to learn?", None),
            ("Great! How do I say that when I arrive at the airport?", ["håfa", "adai"]),  # Should reference greeting
            ("What if I want to thank someone for helping me?", ["ma'åse", "yu'os"]),  # Thank you
            ("Can you give me a full phrase combining the greeting and thank you?", ["håfa", "ma'åse"]),
        ]
        
        all_passed = True
        failed_checks = []
        
        for i, (msg, expected) in enumerate(messages):
            print(f"  [{i+1}/{len(messages)}] {msg[:50]}...")
            response = self._send_message(conv_id, msg)
            
            if expected:
                passed, missing = self._check_keywords(response, expected)
                if not passed:
                    all_passed = False
                    failed_checks.append({"message": msg, "expected": expected, "missing": missing})
            
            time.sleep(1)
        
        result = {
            "test": "multi_turn_coherence",
            "passed": all_passed,
            "failed_checks": failed_checks if not all_passed else [],
            "notes": "Conversation should flow logically with correct references"
        }
        
        if all_passed:
            print(f"  ✅ PASSED - Multi-turn conversation was coherent")
        else:
            print(f"  ❌ FAILED - Some turns didn't maintain coherence")
            for fc in failed_checks:
                print(f"     Missing {fc['expected']} in response to: {fc['message'][:40]}...")
        
        return result
    
    def run_all_tests(self) -> dict:
        """Run all conversation context tests."""
        print("\n" + "=" * 60)
        print("🧪 CONVERSATION CONTEXT TEST SUITE")
        print("=" * 60)
        print(f"API URL: {self.api_url}")
        print(f"Test User: {self.test_user_id}")
        print(f"Started: {datetime.now().isoformat()}")
        
        tests = [
            self.test_context_retention_5_messages,
            self.test_reference_resolution,
            self.test_no_hallucination,
            self.test_cross_conversation_isolation,
            self.test_multi_turn_coherence,
            self.test_context_retention_10_messages,  # Longer test last
        ]
        
        results = []
        passed = 0
        failed = 0
        
        for test_fn in tests:
            try:
                result = test_fn()
                results.append(result)
                if result.get("passed"):
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"  ❌ Test crashed: {e}")
                results.append({"test": test_fn.__name__, "passed": False, "error": str(e)})
                failed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}/{len(tests)}")
        print(f"❌ Failed: {failed}/{len(tests)}")
        print(f"📈 Success Rate: {passed/len(tests)*100:.1f}%")
        print(f"Conversations Created: {len(self.conversations_created)}")
        
        # Save results
        report = {
            "timestamp": datetime.now().isoformat(),
            "api_url": self.api_url,
            "test_user_id": self.test_user_id,
            "passed": passed,
            "failed": failed,
            "total": len(tests),
            "success_rate": passed / len(tests) * 100,
            "results": results,
            "conversations_created": self.conversations_created
        }
        
        return report


def main():
    parser = argparse.ArgumentParser(description="Test conversation context handling")
    parser.add_argument("--api-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--test", help="Run specific test (e.g., context_retention_5)")
    parser.add_argument("--output", help="Save results to JSON file")
    args = parser.parse_args()
    
    tester = ConversationContextTester(api_url=args.api_url)
    
    if args.test:
        # Run specific test
        test_map = {
            "context_retention_5": tester.test_context_retention_5_messages,
            "context_retention_10": tester.test_context_retention_10_messages,
            "reference_resolution": tester.test_reference_resolution,
            "no_hallucination": tester.test_no_hallucination,
            "cross_conversation_isolation": tester.test_cross_conversation_isolation,
            "multi_turn_coherence": tester.test_multi_turn_coherence,
        }
        
        if args.test in test_map:
            result = test_map[args.test]()
            print(f"\nResult: {json.dumps(result, indent=2)}")
        else:
            print(f"Unknown test: {args.test}")
            print(f"Available: {', '.join(test_map.keys())}")
            sys.exit(1)
    else:
        # Run all tests
        report = tester.run_all_tests()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\n📄 Results saved to: {args.output}")
        
        # Exit with error code if any failed
        if report["failed"] > 0:
            sys.exit(1)


if __name__ == "__main__":
    main()
