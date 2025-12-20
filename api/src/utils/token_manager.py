"""
Token Management Module

Provides token counting and budget management for LLM requests.
Ensures prompts never exceed model context limits by intelligently
truncating and summarizing content.

Token Budget Allocation (24,000 tokens total for safety):
- System Prompt:     3,000 tokens max
- RAG Context:       4,000 tokens max  
- Conversation:      8,000 tokens max (hybrid: recent exact + old summarized)
- Current Message:   6,000 tokens max (includes document content)
- Response Buffer:   3,000 tokens reserved for generation
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass
from openai import OpenAI

# Use tiktoken for accurate token counting
import tiktoken

logger = logging.getLogger(__name__)

# Token budget configuration
@dataclass
class TokenBudget:
    """Token budget allocation for different prompt components."""
    total: int = 24000  # Conservative limit to work with all models
    system_prompt: int = 3000
    rag_context: int = 4000
    conversation_history: int = 8000
    current_message: int = 6000
    response_buffer: int = 3000  # Reserved for model response
    
    def validate(self) -> bool:
        """Ensure budget allocations are valid."""
        allocated = (
            self.system_prompt + 
            self.rag_context + 
            self.conversation_history + 
            self.current_message + 
            self.response_buffer
        )
        return allocated <= self.total

# Default budget
DEFAULT_BUDGET = TokenBudget()


def get_tokenizer(model: str = "gpt-4o"):
    """
    Get the appropriate tokenizer for a model.
    
    Args:
        model: Model name (e.g., "gpt-4o", "deepseek/deepseek-chat")
    
    Returns:
        tiktoken.Encoding object
    """
    try:
        # For OpenAI models, use exact tokenizer
        if "gpt" in model.lower():
            return tiktoken.encoding_for_model(model)
        
        # For other models (DeepSeek, Gemini, Claude), use cl100k_base
        # This is a reasonable approximation for most modern LLMs
        return tiktoken.get_encoding("cl100k_base")
    except Exception as e:
        logger.warning(f"Could not get tokenizer for {model}, using cl100k_base: {e}")
        return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """
    Count tokens in a text string.
    
    Args:
        text: Text to count tokens for
        model: Model name for tokenizer selection
    
    Returns:
        Number of tokens
    """
    if not text:
        return 0
    
    try:
        tokenizer = get_tokenizer(model)
        return len(tokenizer.encode(text))
    except Exception as e:
        # Fallback: estimate ~4 chars per token
        logger.warning(f"Token counting failed, using estimate: {e}")
        return len(text) // 4


def count_message_tokens(messages: list, model: str = "gpt-4o") -> int:
    """
    Count tokens in a list of chat messages.
    
    OpenAI format: [{"role": "user", "content": "..."}]
    Accounts for message formatting overhead.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Model name for tokenizer selection
    
    Returns:
        Total token count including formatting overhead
    """
    if not messages:
        return 0
    
    total = 0
    for msg in messages:
        # Each message has ~4 token overhead for formatting
        total += 4
        
        content = msg.get("content", "")
        if isinstance(content, str):
            total += count_tokens(content, model)
        elif isinstance(content, list):
            # Vision messages with image_url
            for item in content:
                if item.get("type") == "text":
                    total += count_tokens(item.get("text", ""), model)
                elif item.get("type") == "image_url":
                    # Images cost ~85-765 tokens depending on detail
                    # Use conservative estimate for "low" detail
                    total += 85
    
    # Add 2 tokens for conversation priming
    total += 2
    
    return total


def truncate_text(text: str, max_tokens: int, model: str = "gpt-4o") -> str:
    """
    Truncate text to fit within a token limit.
    
    Args:
        text: Text to truncate
        max_tokens: Maximum tokens allowed
        model: Model name for tokenizer selection
    
    Returns:
        Truncated text with "[truncated]" indicator if needed
    """
    if not text:
        return text
    
    current_tokens = count_tokens(text, model)
    if current_tokens <= max_tokens:
        return text
    
    try:
        tokenizer = get_tokenizer(model)
        tokens = tokenizer.encode(text)
        
        # Leave room for truncation indicator
        truncation_indicator = "\n\n[... content truncated due to length ...]"
        indicator_tokens = count_tokens(truncation_indicator, model)
        
        # Truncate tokens
        truncated_tokens = tokens[:max_tokens - indicator_tokens]
        truncated_text = tokenizer.decode(truncated_tokens)
        
        return truncated_text + truncation_indicator
    except Exception as e:
        logger.warning(f"Token-based truncation failed, using char estimate: {e}")
        # Fallback: ~4 chars per token
        max_chars = max_tokens * 4
        return text[:max_chars] + "\n\n[... content truncated ...]"


def truncate_conversation_history(
    messages: list,
    max_tokens: int,
    model: str = "gpt-4o",
    keep_recent: int = 6
) -> list:
    """
    Truncate conversation history to fit within token limit.
    
    Strategy:
    1. Always keep the most recent N messages exactly
    2. Truncate/drop older messages to fit budget
    
    Args:
        messages: List of message dicts (alternating user/assistant)
        max_tokens: Maximum tokens for conversation history
        model: Model name for tokenizer
        keep_recent: Number of recent messages to preserve exactly
    
    Returns:
        Truncated message list
    """
    if not messages:
        return messages
    
    total_tokens = count_message_tokens(messages, model)
    if total_tokens <= max_tokens:
        return messages
    
    logger.info(f"Conversation history ({total_tokens} tokens) exceeds budget ({max_tokens}), truncating...")
    
    # Keep recent messages
    recent = messages[-keep_recent:] if len(messages) > keep_recent else messages
    recent_tokens = count_message_tokens(recent, model)
    
    if recent_tokens >= max_tokens:
        # Even recent messages exceed budget - truncate individual messages
        logger.warning(f"Recent {keep_recent} messages ({recent_tokens} tokens) exceed budget, truncating content...")
        truncated = []
        remaining_budget = max_tokens
        
        for msg in reversed(recent):  # Start from most recent
            msg_tokens = count_message_tokens([msg], model)
            if remaining_budget <= 0:
                break
            
            if msg_tokens > remaining_budget:
                # Truncate this message's content
                if isinstance(msg.get("content"), str):
                    truncated_content = truncate_text(msg["content"], remaining_budget - 10, model)
                    truncated.append({"role": msg["role"], "content": truncated_content})
                remaining_budget = 0
            else:
                truncated.append(msg)
                remaining_budget -= msg_tokens
        
        return list(reversed(truncated))
    
    # We have room for some older messages
    remaining_budget = max_tokens - recent_tokens
    older = messages[:-keep_recent] if len(messages) > keep_recent else []
    
    # Take as many older messages as fit
    included_older = []
    for msg in reversed(older):  # Work backwards from oldest of "older"
        msg_tokens = count_message_tokens([msg], model)
        if msg_tokens <= remaining_budget:
            included_older.insert(0, msg)
            remaining_budget -= msg_tokens
        else:
            break  # Can't fit more
    
    result = included_older + recent
    logger.info(f"Truncated to {len(result)} messages ({count_message_tokens(result, model)} tokens)")
    
    return result


async def summarize_text(
    text: str,
    max_output_tokens: int = 500,
    context: str = "conversation history"
) -> str:
    """
    Summarize text using a fast, cheap model (Gemini 2.0 Flash).
    
    Used for:
    - Summarizing old conversation history
    - Summarizing long documents
    
    Args:
        text: Text to summarize
        max_output_tokens: Max tokens for summary
        context: Description of what's being summarized (for prompt)
    
    Returns:
        Summarized text
    """
    if not text or len(text) < 500:
        return text  # Not worth summarizing
    
    try:
        # Use Gemini 2.0 Flash via OpenRouter - very fast and cheap
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_key:
            logger.warning("OPENROUTER_API_KEY not set, skipping summarization")
            return truncate_text(text, max_output_tokens * 4)  # Fallback to truncation
        
        client = OpenAI(
            api_key=openrouter_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            max_tokens=max_output_tokens,
            temperature=0.3,  # Lower temperature for factual summary
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant that creates concise summaries. Summarize the following {context} in a way that preserves the key information and context. Be brief but complete."
                },
                {
                    "role": "user",
                    "content": f"Please summarize this {context}:\n\n{text}"
                }
            ]
        )
        
        summary = response.choices[0].message.content
        logger.info(f"Summarized {len(text)} chars to {len(summary)} chars")
        return summary
        
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        # Fallback to simple truncation
        return truncate_text(text, max_output_tokens * 4)


async def summarize_conversation_history(
    messages: list,
    max_summary_tokens: int = 500
) -> str:
    """
    Summarize older conversation messages into a context string.
    
    Args:
        messages: List of message dicts to summarize
        max_summary_tokens: Max tokens for the summary
    
    Returns:
        Summary string to prepend to conversation
    """
    if not messages:
        return ""
    
    # Format messages for summarization
    conversation_text = ""
    for msg in messages:
        role = "User" if msg.get("role") == "user" else "Assistant"
        content = msg.get("content", "")
        if isinstance(content, str):
            conversation_text += f"{role}: {content}\n\n"
        elif isinstance(content, list):
            # Extract text from vision messages
            for item in content:
                if item.get("type") == "text":
                    conversation_text += f"{role}: {item.get('text', '')}\n\n"
    
    summary = await summarize_text(
        conversation_text,
        max_output_tokens=max_summary_tokens,
        context="earlier conversation"
    )
    
    return f"[Summary of earlier conversation]: {summary}"


async def prepare_conversation_history_hybrid(
    messages: list,
    max_tokens: int,
    model: str = "gpt-4o",
    recent_count: int = 6,
    summarize_old: bool = True
) -> list:
    """
    Prepare conversation history using hybrid approach:
    1. Keep recent messages exactly
    2. Summarize older messages into a single context message
    3. Ensure total fits within budget
    
    Args:
        messages: Full conversation history
        max_tokens: Token budget for conversation history
        model: Model name for tokenizer
        recent_count: Number of recent messages to keep exactly
        summarize_old: Whether to summarize old messages (vs just drop them)
    
    Returns:
        Processed message list ready for LLM
    """
    if not messages:
        return []
    
    total_tokens = count_message_tokens(messages, model)
    if total_tokens <= max_tokens:
        return messages  # All messages fit
    
    logger.info(f"Preparing hybrid history: {len(messages)} messages, {total_tokens} tokens, budget {max_tokens}")
    
    # Split into recent and older
    recent = messages[-recent_count:] if len(messages) > recent_count else messages
    older = messages[:-recent_count] if len(messages) > recent_count else []
    
    recent_tokens = count_message_tokens(recent, model)
    
    if recent_tokens >= max_tokens:
        # Recent messages alone exceed budget - just truncate
        return truncate_conversation_history(recent, max_tokens, model, recent_count)
    
    if not older:
        return recent  # No older messages to summarize
    
    if not summarize_old:
        # Just keep recent, drop older
        logger.info(f"Dropping {len(older)} older messages to fit budget")
        return recent
    
    # Summarize older messages
    remaining_budget = max_tokens - recent_tokens - 50  # Leave some buffer
    
    if remaining_budget > 100:  # Only summarize if we have room
        summary = await summarize_conversation_history(older, max_summary_tokens=remaining_budget // 4)
        
        if summary:
            # Add summary as a system-like context message
            summary_message = {
                "role": "user",  # Use user role for compatibility
                "content": summary
            }
            return [summary_message] + recent
    
    return recent


def truncate_rag_context(context: str, max_tokens: int, model: str = "gpt-4o") -> str:
    """
    Truncate RAG context to fit within token budget.
    
    Preserves structure by truncating individual chunks if needed.
    
    Args:
        context: RAG context string
        max_tokens: Maximum tokens allowed
        model: Model name for tokenizer
    
    Returns:
        Truncated context
    """
    if not context:
        return context
    
    current_tokens = count_tokens(context, model)
    if current_tokens <= max_tokens:
        return context
    
    logger.info(f"RAG context ({current_tokens} tokens) exceeds budget ({max_tokens}), truncating...")
    
    # Try to preserve the header and truncate chunk content
    lines = context.split('\n')
    
    # Find where chunks start (after headers)
    chunk_start = 0
    for i, line in enumerate(lines):
        if line.startswith('[Reference '):
            chunk_start = i
            break
    
    # Keep headers
    header = '\n'.join(lines[:chunk_start])
    header_tokens = count_tokens(header, model)
    
    # Truncate remaining content
    remaining_budget = max_tokens - header_tokens - 50
    if remaining_budget < 200:
        # Not enough room, just truncate everything
        return truncate_text(context, max_tokens, model)
    
    chunk_content = '\n'.join(lines[chunk_start:])
    truncated_chunks = truncate_text(chunk_content, remaining_budget, model)
    
    return header + '\n' + truncated_chunks


def truncate_document_content(
    doc_text: str,
    max_tokens: int,
    model: str = "gpt-4o"
) -> tuple[str, bool]:
    """
    Truncate document content to fit within token budget.
    
    Strategy: Keep first and last portions for context.
    
    Args:
        doc_text: Full document text
        max_tokens: Maximum tokens allowed
        model: Model name for tokenizer
    
    Returns:
        Tuple of (truncated_text, was_truncated)
    """
    if not doc_text:
        return doc_text, False
    
    current_tokens = count_tokens(doc_text, model)
    if current_tokens <= max_tokens:
        return doc_text, False
    
    logger.info(f"Document ({current_tokens} tokens) exceeds budget ({max_tokens}), truncating...")
    
    # Keep first 60% and last 30% of budget (10% for indicator)
    first_budget = int(max_tokens * 0.6)
    last_budget = int(max_tokens * 0.3)
    
    tokenizer = get_tokenizer(model)
    tokens = tokenizer.encode(doc_text)
    
    first_tokens = tokens[:first_budget]
    last_tokens = tokens[-last_budget:]
    
    first_text = tokenizer.decode(first_tokens)
    last_text = tokenizer.decode(last_tokens)
    
    truncated = f"{first_text}\n\n[... document truncated ({current_tokens - max_tokens} tokens removed) ...]\n\n{last_text}"
    
    return truncated, True


class TokenManager:
    """
    Manager class for handling token budgets across a request.
    
    Usage:
        manager = TokenManager(budget=TokenBudget())
        
        # Prepare each component
        system_prompt = manager.prepare_system_prompt(raw_prompt)
        rag_context = manager.prepare_rag_context(raw_context)
        history = await manager.prepare_history(raw_history)
        message = manager.prepare_message(raw_message)
        
        # Get final token count
        total = manager.total_tokens_used()
    """
    
    def __init__(self, budget: TokenBudget = None, model: str = "gpt-4o"):
        self.budget = budget or DEFAULT_BUDGET
        self.model = model
        self._system_prompt_tokens = 0
        self._rag_context_tokens = 0
        self._history_tokens = 0
        self._message_tokens = 0
    
    def prepare_system_prompt(self, prompt: str) -> str:
        """Prepare system prompt within budget."""
        if not prompt:
            return prompt
        
        result = truncate_text(prompt, self.budget.system_prompt, self.model)
        self._system_prompt_tokens = count_tokens(result, self.model)
        
        if self._system_prompt_tokens > self.budget.system_prompt:
            logger.warning(f"System prompt still over budget after truncation: {self._system_prompt_tokens}")
        
        return result
    
    def prepare_rag_context(self, context: str) -> str:
        """Prepare RAG context within budget."""
        if not context:
            return context
        
        result = truncate_rag_context(context, self.budget.rag_context, self.model)
        self._rag_context_tokens = count_tokens(result, self.model)
        
        return result
    
    async def prepare_history(
        self,
        messages: list,
        summarize: bool = True
    ) -> list:
        """Prepare conversation history within budget."""
        if not messages:
            return messages
        
        result = await prepare_conversation_history_hybrid(
            messages,
            self.budget.conversation_history,
            self.model,
            recent_count=6,
            summarize_old=summarize
        )
        self._history_tokens = count_message_tokens(result, self.model)
        
        return result
    
    def prepare_message(self, message: str) -> str:
        """Prepare current message within budget."""
        if not message:
            return message
        
        result = truncate_text(message, self.budget.current_message, self.model)
        self._message_tokens = count_tokens(result, self.model)
        
        return result
    
    def prepare_document_content(self, doc_text: str) -> tuple[str, bool]:
        """Prepare document content within message budget."""
        # Documents share the message budget
        available = self.budget.current_message - self._message_tokens - 100
        return truncate_document_content(doc_text, max(available, 1000), self.model)
    
    def total_tokens_used(self) -> int:
        """Get total tokens used across all components."""
        return (
            self._system_prompt_tokens +
            self._rag_context_tokens +
            self._history_tokens +
            self._message_tokens
        )
    
    def tokens_remaining_for_response(self) -> int:
        """Get tokens available for model response."""
        used = self.total_tokens_used()
        return max(0, self.budget.total - used)
    
    def get_token_summary(self) -> dict:
        """Get summary of token usage for logging."""
        return {
            "system_prompt": self._system_prompt_tokens,
            "rag_context": self._rag_context_tokens,
            "conversation_history": self._history_tokens,
            "current_message": self._message_tokens,
            "total_used": self.total_tokens_used(),
            "remaining_for_response": self.tokens_remaining_for_response(),
            "budget_total": self.budget.total
        }

