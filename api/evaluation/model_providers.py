"""
Model Providers for LLM Comparison

Provides a unified interface for testing multiple LLM providers:
- OpenAI (direct)
- Anthropic Claude (direct)
- Google Gemini (direct)
- OpenRouter (100+ models including DeepSeek, Qwen, Mistral, etc.)

Usage:
    provider = get_provider("openai", model="gpt-4o-mini")
    response = provider.chat("What is 'hello' in Chamorro?")
"""

import os
import time
import json
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


@dataclass
class ModelResponse:
    """Standardized response from any model."""
    content: str
    model: str
    provider: str
    response_time: float
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost_estimate: Optional[float] = None  # Estimated cost in USD


class ModelProvider(ABC):
    """Abstract base class for LLM providers."""
    
    def __init__(self, model: str, api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key
    
    @abstractmethod
    def chat(self, message: str, system_prompt: Optional[str] = None, 
             temperature: float = 0.7, max_tokens: int = 1024) -> ModelResponse:
        """Send a chat message and get a response."""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name."""
        pass
    
    @abstractmethod
    def get_cost_per_1m_tokens(self) -> tuple[float, float]:
        """Get cost per 1M tokens (input, output)."""
        pass
    
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate the cost of a request."""
        input_cost, output_cost = self.get_cost_per_1m_tokens()
        return (input_tokens * input_cost / 1_000_000) + (output_tokens * output_cost / 1_000_000)


class OpenAIProvider(ModelProvider):
    """OpenAI API provider (GPT-4o, GPT-4o-mini, etc.)"""
    
    # Cost per 1M tokens (input, output)
    PRICING = {
        "gpt-4o": (2.50, 10.00),
        "gpt-4o-mini": (0.15, 0.60),
        "gpt-4-turbo": (10.00, 30.00),
        "gpt-3.5-turbo": (0.50, 1.50),
    }
    
    def __init__(self, model: str = "gpt-4o-mini", api_key: Optional[str] = None):
        super().__init__(model, api_key or os.getenv("OPENAI_API_KEY"))
        if not self.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY env var.")
        
        from openai import OpenAI
        self.client = OpenAI(api_key=self.api_key)
    
    def chat(self, message: str, system_prompt: Optional[str] = None,
             temperature: float = 0.7, max_tokens: int = 1024) -> ModelResponse:
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        
        start_time = time.time()
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        response_time = time.time() - start_time
        
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        
        return ModelResponse(
            content=response.choices[0].message.content,
            model=self.model,
            provider="openai",
            response_time=response_time,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_estimate=self.estimate_cost(input_tokens, output_tokens)
        )
    
    def get_provider_name(self) -> str:
        return "OpenAI"
    
    def get_cost_per_1m_tokens(self) -> tuple[float, float]:
        return self.PRICING.get(self.model, (0.15, 0.60))


class AnthropicProvider(ModelProvider):
    """Anthropic Claude API provider."""
    
    PRICING = {
        "claude-3-5-sonnet-20241022": (3.00, 15.00),
        "claude-3-5-sonnet-latest": (3.00, 15.00),
        "claude-3-5-haiku-20241022": (0.80, 4.00),
        "claude-3-5-haiku-latest": (0.80, 4.00),
        "claude-3-opus-20240229": (15.00, 75.00),
    }
    
    def __init__(self, model: str = "claude-3-5-sonnet-latest", api_key: Optional[str] = None):
        super().__init__(model, api_key or os.getenv("ANTHROPIC_API_KEY"))
        if not self.api_key:
            raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY env var.")
        
        import anthropic
        self.client = anthropic.Anthropic(api_key=self.api_key)
    
    def chat(self, message: str, system_prompt: Optional[str] = None,
             temperature: float = 0.7, max_tokens: int = 1024) -> ModelResponse:
        
        start_time = time.time()
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt or "You are a helpful Chamorro language learning assistant.",
            messages=[{"role": "user", "content": message}],
            temperature=temperature
        )
        response_time = time.time() - start_time
        
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        
        return ModelResponse(
            content=response.content[0].text,
            model=self.model,
            provider="anthropic",
            response_time=response_time,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_estimate=self.estimate_cost(input_tokens, output_tokens)
        )
    
    def get_provider_name(self) -> str:
        return "Anthropic"
    
    def get_cost_per_1m_tokens(self) -> tuple[float, float]:
        return self.PRICING.get(self.model, (3.00, 15.00))


class GeminiProvider(ModelProvider):
    """Google Gemini API provider."""
    
    PRICING = {
        "gemini-2.0-flash-exp": (0.0, 0.0),  # Free during experimental
        "gemini-1.5-flash": (0.075, 0.30),
        "gemini-1.5-pro": (1.25, 5.00),
    }
    
    def __init__(self, model: str = "gemini-2.0-flash-exp", api_key: Optional[str] = None):
        super().__init__(model, api_key or os.getenv("GOOGLE_API_KEY"))
        if not self.api_key:
            raise ValueError("Google API key required. Set GOOGLE_API_KEY env var.")
        
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        self.client = genai.GenerativeModel(model)
    
    def chat(self, message: str, system_prompt: Optional[str] = None,
             temperature: float = 0.7, max_tokens: int = 1024) -> ModelResponse:
        
        import google.generativeai as genai
        
        # Combine system prompt with message
        full_message = message
        if system_prompt:
            full_message = f"{system_prompt}\n\nUser: {message}"
        
        start_time = time.time()
        response = self.client.generate_content(
            full_message,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens
            )
        )
        response_time = time.time() - start_time
        
        # Gemini doesn't provide token counts easily, estimate
        input_tokens = len(full_message.split()) * 1.3  # Rough estimate
        output_tokens = len(response.text.split()) * 1.3
        
        return ModelResponse(
            content=response.text,
            model=self.model,
            provider="google",
            response_time=response_time,
            input_tokens=int(input_tokens),
            output_tokens=int(output_tokens),
            total_tokens=int(input_tokens + output_tokens),
            cost_estimate=self.estimate_cost(int(input_tokens), int(output_tokens))
        )
    
    def get_provider_name(self) -> str:
        return "Google"
    
    def get_cost_per_1m_tokens(self) -> tuple[float, float]:
        return self.PRICING.get(self.model, (0.0, 0.0))


class OpenRouterProvider(ModelProvider):
    """
    OpenRouter API provider - unified access to 100+ models.
    
    Supported models include:
    - openai/gpt-4o, openai/gpt-4o-mini
    - anthropic/claude-3.5-sonnet, anthropic/claude-3.5-haiku
    - google/gemini-2.0-flash-exp, google/gemini-pro-1.5
    - deepseek/deepseek-chat (DeepSeek V3)
    - qwen/qwen-2.5-72b-instruct
    - mistralai/mistral-large-latest
    - meta-llama/llama-3.1-405b-instruct
    - And many more!
    
    See https://openrouter.ai/docs/models for full list
    """
    
    # Cost per 1M tokens (input, output) - December 2025
    # Source: https://openrouter.ai/models
    # Note: Prices may vary, check OpenRouter for current rates
    PRICING = {
        # OpenAI
        "openai/gpt-4o": (2.50, 10.00),
        "openai/gpt-4o-mini": (0.15, 0.60),
        "openai/gpt-4.1": (2.00, 8.00),
        "openai/gpt-4.1-mini": (0.40, 1.60),
        "openai/o1": (15.00, 60.00),
        "openai/o1-mini": (1.10, 4.40),
        "openai/o3-mini": (1.10, 4.40),
        
        # Anthropic Claude - December 2025
        "anthropic/claude-opus-4.5": (15.00, 75.00),
        "anthropic/claude-sonnet-4.5": (3.00, 15.00),
        "anthropic/claude-haiku-4.5": (0.80, 4.00),
        "anthropic/claude-opus-4": (15.00, 75.00),
        "anthropic/claude-opus-4.1": (15.00, 75.00),
        "anthropic/claude-sonnet-4": (3.00, 15.00),
        "anthropic/claude-3.7-sonnet": (3.00, 15.00),
        "anthropic/claude-3.7-sonnet:thinking": (3.00, 15.00),
        "anthropic/claude-3.5-sonnet": (3.00, 15.00),
        "anthropic/claude-3.5-haiku": (0.80, 4.00),
        
        # Google Gemini - December 2025
        "google/gemini-3-pro-preview": (1.25, 5.00),
        "google/gemini-2.5-flash-preview-09-2025": (0.15, 0.60),
        "google/gemini-2.5-flash-lite-preview-09-2025": (0.075, 0.30),
        "google/gemini-2.0-flash-exp:free": (0.0, 0.0),
        "google/gemini-2.0-flash-thinking-exp:free": (0.0, 0.0),
        "google/gemini-flash-1.5": (0.075, 0.30),
        "google/gemini-pro-1.5": (1.25, 5.00),
        
        # DeepSeek - BEST VALUE!
        "deepseek/deepseek-chat": (0.14, 0.28),
        "deepseek/deepseek-r1": (0.55, 2.19),
        "deepseek/deepseek-r1-distill-llama-70b": (0.23, 0.69),
        
        # Qwen - December 2025
        "qwen/qwen3-vl-235b-a22b-thinking": (1.50, 6.00),
        "qwen/qwen3-vl-235b-a22b-instruct": (1.20, 4.80),
        "qwen/qwen3-vl-30b-a3b-thinking": (0.35, 1.40),
        "qwen/qwen3-vl-30b-a3b-instruct": (0.28, 1.12),
        "qwen/qwen3-vl-8b-thinking": (0.10, 0.40),
        "qwen/qwen3-vl-8b-instruct": (0.08, 0.32),
        "qwen/qwen-2.5-72b-instruct": (0.35, 0.40),
        "qwen/qwq-32b-preview": (0.12, 0.18),
        
        # Mistral - December 2025
        "mistralai/magistral-medium-2506": (2.00, 6.00),
        "mistralai/mistral-large-latest": (2.00, 6.00),
        "mistralai/mistral-small-latest": (0.20, 0.60),
        "mistralai/mixtral-8x22b-instruct": (0.90, 0.90),
        "mistralai/mixtral-8x7b-instruct": (0.24, 0.24),
        "mistralai/ministral-8b": (0.10, 0.10),
        "mistralai/ministral-3b": (0.04, 0.04),
        
        # Meta Llama - December 2025
        "meta-llama/llama-4-maverick": (0.50, 0.70),
        "meta-llama/llama-4-scout": (0.15, 0.60),
        "meta-llama/llama-3.3-70b-instruct": (0.30, 0.40),
        "meta-llama/llama-3.3-70b-instruct:free": (0.0, 0.0),
        "meta-llama/llama-3.2-3b-instruct": (0.06, 0.06),
        "meta-llama/llama-3.2-3b-instruct:free": (0.0, 0.0),
        "meta-llama/llama-3.1-405b-instruct": (2.70, 2.70),
        "meta-llama/llama-3.1-70b-instruct": (0.52, 0.75),
        
        # Others
        "cohere/command-r-plus": (2.50, 10.00),
        "01-ai/yi-large": (0.80, 0.80),
        "google/gemma-2-27b-it": (0.27, 0.27),
        "microsoft/phi-4": (0.07, 0.14),
    }
    
    def __init__(self, model: str = "openai/gpt-4o-mini", api_key: Optional[str] = None):
        super().__init__(model, api_key or os.getenv("OPENROUTER_API_KEY"))
        if not self.api_key:
            raise ValueError("OpenRouter API key required. Set OPENROUTER_API_KEY env var.")
        
        import httpx
        self.http_client = httpx.Client(timeout=60.0)
        self.base_url = "https://openrouter.ai/api/v1"
    
    def chat(self, message: str, system_prompt: Optional[str] = None,
             temperature: float = 0.7, max_tokens: int = 1024) -> ModelResponse:
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        
        start_time = time.time()
        response = self.http_client.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": "https://hafagpt.com",  # Optional, for ranking
                "X-Title": "HafaGPT Model Comparison",
            },
            json={
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        )
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")
        
        data = response.json()
        
        # Extract token usage
        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        
        return ModelResponse(
            content=data["choices"][0]["message"]["content"],
            model=self.model,
            provider="openrouter",
            response_time=response_time,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_estimate=self.estimate_cost(input_tokens, output_tokens)
        )
    
    def get_provider_name(self) -> str:
        return "OpenRouter"
    
    def get_cost_per_1m_tokens(self) -> tuple[float, float]:
        return self.PRICING.get(self.model, (0.50, 1.50))


# =============================================================================
# Model Registry and Factory
# =============================================================================

# Available models for comparison - December 2025
# All models accessible via OpenRouter with a single API key!
AVAILABLE_MODELS = {
    # =========================================================================
    # OpenAI (direct API - requires OPENAI_API_KEY)
    # =========================================================================
    "gpt-4o-mini": ("openai", "gpt-4o-mini"),
    "gpt-4o": ("openai", "gpt-4o"),
    "gpt-4.1": ("openrouter", "openai/gpt-4.1"),
    "gpt-4.1-mini": ("openrouter", "openai/gpt-4.1-mini"),
    "o1": ("openrouter", "openai/o1"),
    "o1-mini": ("openrouter", "openai/o1-mini"),
    "o3-mini": ("openrouter", "openai/o3-mini"),
    
    # =========================================================================
    # Anthropic Claude (via OpenRouter) - December 2025
    # =========================================================================
    # Claude 4.5 Series (LATEST!)
    "claude-opus-4.5": ("openrouter", "anthropic/claude-opus-4.5"),
    "claude-sonnet-4.5": ("openrouter", "anthropic/claude-sonnet-4.5"),
    "claude-haiku-4.5": ("openrouter", "anthropic/claude-haiku-4.5"),
    # Claude 4 Series
    "claude-opus-4": ("openrouter", "anthropic/claude-opus-4"),
    "claude-opus-4.1": ("openrouter", "anthropic/claude-opus-4.1"),
    "claude-sonnet-4": ("openrouter", "anthropic/claude-sonnet-4"),
    # Claude 3.7 Series
    "claude-3.7-sonnet": ("openrouter", "anthropic/claude-3.7-sonnet"),
    "claude-3.7-sonnet-thinking": ("openrouter", "anthropic/claude-3.7-sonnet:thinking"),
    # Legacy
    "claude-3.5-sonnet": ("openrouter", "anthropic/claude-3.5-sonnet"),
    "claude-3.5-haiku": ("openrouter", "anthropic/claude-3.5-haiku"),
    
    # =========================================================================
    # Google Gemini (via OpenRouter) - December 2025
    # =========================================================================
    # Gemini 3 Series (LATEST!)
    "gemini-3-pro": ("openrouter", "google/gemini-3-pro-preview"),
    # Gemini 2.5 Series
    "gemini-2.5-flash": ("openrouter", "google/gemini-2.5-flash-preview-09-2025"),
    "gemini-2.5-flash-lite": ("openrouter", "google/gemini-2.5-flash-lite-preview-09-2025"),
    # Gemini 2.0 Series
    "gemini-2.0-flash": ("openrouter", "google/gemini-2.0-flash-exp:free"),
    "gemini-2.0-flash-thinking": ("openrouter", "google/gemini-2.0-flash-thinking-exp:free"),
    # Gemini 1.5 Series
    "gemini-1.5-flash": ("openrouter", "google/gemini-flash-1.5"),
    "gemini-1.5-pro": ("openrouter", "google/gemini-pro-1.5"),
    
    # =========================================================================
    # DeepSeek (via OpenRouter) - EXCELLENT performance, very cheap!
    # =========================================================================
    "deepseek-v3": ("openrouter", "deepseek/deepseek-chat"),
    "deepseek-r1": ("openrouter", "deepseek/deepseek-r1"),
    "deepseek-r1-distill-llama-70b": ("openrouter", "deepseek/deepseek-r1-distill-llama-70b"),
    
    # =========================================================================
    # Qwen (Alibaba) - December 2025
    # =========================================================================
    # Qwen3 Series (LATEST!)
    "qwen3-235b-thinking": ("openrouter", "qwen/qwen3-vl-235b-a22b-thinking"),
    "qwen3-235b": ("openrouter", "qwen/qwen3-vl-235b-a22b-instruct"),
    "qwen3-30b-thinking": ("openrouter", "qwen/qwen3-vl-30b-a3b-thinking"),
    "qwen3-30b": ("openrouter", "qwen/qwen3-vl-30b-a3b-instruct"),
    "qwen3-8b-thinking": ("openrouter", "qwen/qwen3-vl-8b-thinking"),
    "qwen3-8b": ("openrouter", "qwen/qwen3-vl-8b-instruct"),
    # Qwen 2.5 Series
    "qwen-2.5-72b": ("openrouter", "qwen/qwen-2.5-72b-instruct"),
    "qwen-qwq-32b": ("openrouter", "qwen/qwq-32b-preview"),
    
    # =========================================================================
    # Mistral (via OpenRouter) - December 2025
    # =========================================================================
    "magistral-medium": ("openrouter", "mistralai/magistral-medium-2506"),  # Thinking model
    "mistral-large": ("openrouter", "mistralai/mistral-large-latest"),
    "mistral-small": ("openrouter", "mistralai/mistral-small-latest"),
    "mixtral-8x22b": ("openrouter", "mistralai/mixtral-8x22b-instruct"),
    "mixtral-8x7b": ("openrouter", "mistralai/mixtral-8x7b-instruct"),
    "ministral-8b": ("openrouter", "mistralai/ministral-8b"),
    "ministral-3b": ("openrouter", "mistralai/ministral-3b"),
    
    # =========================================================================
    # Meta Llama (via OpenRouter) - December 2025
    # =========================================================================
    # Llama 4 Series (LATEST!)
    "llama-4-maverick": ("openrouter", "meta-llama/llama-4-maverick"),
    "llama-4-scout": ("openrouter", "meta-llama/llama-4-scout"),
    # Llama 3.3 Series
    "llama-3.3-70b": ("openrouter", "meta-llama/llama-3.3-70b-instruct"),
    "llama-3.3-70b-free": ("openrouter", "meta-llama/llama-3.3-70b-instruct:free"),  # FREE!
    # Llama 3.2 Series
    "llama-3.2-3b": ("openrouter", "meta-llama/llama-3.2-3b-instruct"),
    "llama-3.2-3b-free": ("openrouter", "meta-llama/llama-3.2-3b-instruct:free"),  # FREE!
    # Llama 3.1 Series
    "llama-3.1-405b": ("openrouter", "meta-llama/llama-3.1-405b-instruct"),
    "llama-3.1-70b": ("openrouter", "meta-llama/llama-3.1-70b-instruct"),
    
    # =========================================================================
    # Other Notable Models
    # =========================================================================
    "command-r-plus": ("openrouter", "cohere/command-r-plus"),
    "yi-large": ("openrouter", "01-ai/yi-large"),
    "gemma-2-27b": ("openrouter", "google/gemma-2-27b-it"),
    "phi-4": ("openrouter", "microsoft/phi-4"),
}


def get_provider(model_name: str) -> ModelProvider:
    """
    Get a model provider by model name.
    
    Args:
        model_name: Short name from AVAILABLE_MODELS (e.g., "gpt-4o-mini", "claude-3.5-sonnet")
    
    Returns:
        ModelProvider instance
    
    Example:
        provider = get_provider("claude-3.5-sonnet")
        response = provider.chat("What is 'hello' in Chamorro?")
    """
    if model_name not in AVAILABLE_MODELS:
        available = ", ".join(AVAILABLE_MODELS.keys())
        raise ValueError(f"Unknown model: {model_name}. Available: {available}")
    
    provider_type, actual_model = AVAILABLE_MODELS[model_name]
    
    if provider_type == "openai":
        return OpenAIProvider(model=actual_model)
    elif provider_type == "anthropic":
        return AnthropicProvider(model=actual_model)
    elif provider_type == "google":
        return GeminiProvider(model=actual_model)
    elif provider_type == "openrouter":
        return OpenRouterProvider(model=actual_model)
    else:
        raise ValueError(f"Unknown provider type: {provider_type}")


def list_available_models() -> Dict[str, Dict[str, Any]]:
    """List all available models with their details."""
    models = {}
    
    for name, (provider_type, actual_model) in AVAILABLE_MODELS.items():
        # Get pricing
        if provider_type == "openai":
            pricing = OpenAIProvider.PRICING.get(actual_model, (0.15, 0.60))
        elif provider_type == "anthropic":
            pricing = AnthropicProvider.PRICING.get(actual_model, (3.00, 15.00))
        elif provider_type == "google":
            pricing = GeminiProvider.PRICING.get(actual_model, (0.0, 0.0))
        elif provider_type == "openrouter":
            pricing = OpenRouterProvider.PRICING.get(actual_model, (0.50, 1.50))
        else:
            pricing = (0.0, 0.0)
        
        models[name] = {
            "provider": provider_type,
            "model_id": actual_model,
            "cost_per_1m_input": pricing[0],
            "cost_per_1m_output": pricing[1],
        }
    
    return models


if __name__ == "__main__":
    # Quick test
    print("Available models:")
    print("-" * 60)
    for name, info in list_available_models().items():
        print(f"  {name:20} | {info['provider']:12} | ${info['cost_per_1m_input']:.2f}/${info['cost_per_1m_output']:.2f} per 1M")
    print("-" * 60)
    print("\nTo test a model:")
    print("  provider = get_provider('gpt-4o-mini')")
    print("  response = provider.chat('What is hello in Chamorro?')")

