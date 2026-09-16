"""AI 提供商网关。等价于原 TS providers/*：
统一接口 AIProvider，OpenAI 兼容实现（默认，走百炼 DashScope）+ Anthropic 实现。
用 httpx 直接打 HTTP，带超时与对 429/502/503/504 的有限重试。
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass
from typing import AsyncGenerator, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .errors import AIConfigError, AIError

T = TypeVar("T", bound=BaseModel)


@dataclass
class AIConfig:
    provider: str
    api_key: str
    timeout: int  # 毫秒
    max_retries: int
    base_url: str | None = None
    model: str | None = None
    temperature: float | None = None


@dataclass
class ProviderInfo:
    id: str
    name: str
    model: str
    configured: bool


@dataclass
class AIUsage:
    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass
class AICompletion:
    data: object
    usage: AIUsage
    provider: str
    model: str
    duration_ms: int


ChatMessage = dict  # {"role": "system|user|assistant", "content": str}


@dataclass
class ChatRequest:
    messages: list[ChatMessage]
    system_prompt: str | None = None
    max_tokens: int | None = None
    temperature: float | None = None


def _extract_json(text: str) -> object:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


class AIProvider:
    """接口占位。"""

    async def initialize(self) -> None: ...
    async def generate_structured(self, model_cls: Type[T], system_prompt: str, user_prompt: str, max_tokens: int, signal: object = None) -> AICompletion: ...
    def chat(self, request: ChatRequest) -> AsyncGenerator[str, None]: ...
    async def chat_complete(self, request: ChatRequest) -> str: ...
    async def check_health(self) -> bool: ...
    def get_provider_info(self) -> ProviderInfo: ...


class OpenAICompatProvider(AIProvider):
    default_model = "deepseek-v4-flash"
    default_base_url = "https://api.deepseek.com"

    def __init__(self, config: AIConfig) -> None:
        self.config = config

    async def initialize(self) -> None:
        if not self.config.api_key:
            raise AIConfigError("API key is required for OpenAI-compatible provider", "openai-compat")

    @property
    def base_url(self) -> str:
        return self.config.base_url or self.default_base_url

    @property
    def model(self) -> str:
        return self.config.model or self.default_model

    async def generate_structured(self, model_cls: Type[T], system_prompt: str, user_prompt: str, max_tokens: int, signal: object = None) -> AICompletion:
        started = time.time()
        response = await self._fetch_completion({
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": self.config.temperature if self.config.temperature is not None else 0.7,
            "response_format": {"type": "json_object"},
        })
        text = (((response.get("choices") or [{}])[0]).get("message") or {}).get("content")
        if not text:
            raise AIError("INVALID_RESPONSE", "No content in response", "openai-compat")
        try:
            data = model_cls.model_validate(_extract_json(text))
        except (ValidationError, ValueError, json.JSONDecodeError) as error:
            raise AIError("INVALID_RESPONSE", "Structured response failed validation", "openai-compat", error)
        usage = response.get("usage") or {}
        return AICompletion(
            data=data,
            usage=AIUsage(input_tokens=usage.get("prompt_tokens"), output_tokens=usage.get("completion_tokens")),
            provider="openai-compat",
            model=self.model,
            duration_ms=int((time.time() - started) * 1000),
        )

    async def chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        body = {
            "model": self.model,
            "messages": self._build_messages(request),
            "stream": True,
            "max_tokens": request.max_tokens or 1000,
            "temperature": request.temperature if request.temperature is not None else (self.config.temperature if self.config.temperature is not None else 0.7),
        }
        async for chunk in self._stream_with_retry(body):
            yield chunk

    async def chat_complete(self, request: ChatRequest) -> str:
        response = await self._fetch_completion({
            "messages": self._build_messages(request),
            "max_tokens": request.max_tokens or 1000,
            "temperature": request.temperature if request.temperature is not None else (self.config.temperature if self.config.temperature is not None else 0.7),
        })
        text = (((response.get("choices") or [{}])[0]).get("message") or {}).get("content")
        if not text:
            raise AIError("INVALID_RESPONSE", "No content in response", "openai-compat")
        return text

    async def check_health(self) -> bool:
        return bool(self.config.api_key)

    def get_provider_info(self) -> ProviderInfo:
        return ProviderInfo(id="openai-compat", name="OpenAI-compatible", model=self.model, configured=bool(self.config.api_key))

    def _build_messages(self, request: ChatRequest) -> list[ChatMessage]:
        if request.system_prompt:
            return [{"role": "system", "content": request.system_prompt}, *request.messages]
        return list(request.messages)

    async def _fetch_completion(self, params: dict) -> dict:
        body = {"model": self.model, **params}
        timeout = httpx.Timeout(self.config.timeout / 1000)
        headers = {"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"}
        for attempt in range(self.config.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(f"{self.base_url}/chat/completions", json=body, headers=headers)
                if response.status_code == 200:
                    return response.json()
                if response.status_code in (429, 502, 503, 504) and attempt < self.config.max_retries:
                    await asyncio.sleep(0.05 * (attempt + 1))
                    continue
                self._raise_for_response(response)
            except httpx.TimeoutException as error:
                raise AIError("TIMEOUT", "AI request timed out or was cancelled", "openai-compat", error)
            except httpx.HTTPError as error:
                if attempt >= self.config.max_retries:
                    raise AIError("NETWORK_ERROR", "AI network request failed", "openai-compat", error)
        raise AIError("NETWORK_ERROR", "AI request failed after retries", "openai-compat")

    async def _stream_with_retry(self, body: dict) -> AsyncGenerator[str, None]:
        timeout = httpx.Timeout(self.config.timeout / 1000)
        headers = {"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"}
        for attempt in range(self.config.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    async with client.stream("POST", f"{self.base_url}/chat/completions", json=body, headers=headers) as response:
                        if response.status_code != 200:
                            await response.aread()
                            if response.status_code in (429, 502, 503, 504) and attempt < self.config.max_retries:
                                await asyncio.sleep(0.05 * (attempt + 1))
                                continue
                            self._raise_for_response(response)
                        async for line in response.aiter_lines():
                            trimmed = line.strip()
                            if not trimmed.startswith("data: ") or trimmed == "data: [DONE]":
                                continue
                            try:
                                data = json.loads(trimmed[6:])
                                chunk = (((data.get("choices") or [{}])[0]).get("delta") or {}).get("content")
                                if isinstance(chunk, str) and chunk:
                                    yield chunk
                            except json.JSONDecodeError:
                                pass  # 忽略单个畸形上游帧
                        return
            except httpx.TimeoutException as error:
                raise AIError("TIMEOUT", "AI request timed out or was cancelled", "openai-compat", error)
            except httpx.HTTPError as error:
                if attempt >= self.config.max_retries:
                    raise AIError("NETWORK_ERROR", "AI network request failed", "openai-compat", error)

    def _raise_for_response(self, response: httpx.Response) -> None:
        message = response.reason_phrase
        try:
            payload = response.json()
            message = (payload.get("error") or {}).get("message") or message
        except Exception:
            pass
        status = response.status_code
        if status == 401:
            raise AIError("INVALID_API_KEY", f"Invalid API key: {message}", "openai-compat")
        if status == 429:
            raise AIError("RATE_LIMIT_EXCEEDED", f"Rate limit exceeded: {message}", "openai-compat")
        if status in (400, 413):
            raise AIError("CONTEXT_OVERFLOW", f"Invalid context: {message}", "openai-compat")
        if status in (502, 503, 504):
            raise AIError("SERVICE_UNAVAILABLE", f"Service unavailable: {message}", "openai-compat")
        raise AIError("NETWORK_ERROR", f"HTTP {status}: {message}", "openai-compat")


class AnthropicProvider(AIProvider):
    default_model = "claude-3-7-sonnet-20250219"
    default_base_url = "https://api.anthropic.com"

    def __init__(self, config: AIConfig) -> None:
        self.config = config
        self._ready = False

    @property
    def base_url(self) -> str:
        return self.config.base_url or self.default_base_url

    @property
    def model(self) -> str:
        return self.config.model or self.default_model

    async def initialize(self) -> None:
        if not self.config.api_key:
            raise AIConfigError("API key is required for Anthropic provider", "anthropic")
        self._ready = True

    def _headers(self) -> dict:
        return {
            "x-api-key": self.config.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

    def _split_system(self, request: ChatRequest) -> tuple[str, list[ChatMessage]]:
        system_content = request.system_prompt or ""
        user_messages: list[ChatMessage] = []
        for msg in request.messages:
            if msg["role"] == "system":
                if system_content:
                    system_content += "\n\n"
                system_content += msg["content"]
            else:
                user_messages.append(msg)
        return system_content, user_messages

    async def generate_structured(self, model_cls: Type[T], system_prompt: str, user_prompt: str, max_tokens: int, signal: object = None) -> AICompletion:
        started = time.time()
        body = {
            "model": self.model,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": max_tokens,
            "temperature": self.config.temperature if self.config.temperature is not None else 0.7,
        }
        response = await self._post(body)
        text = self._first_text(response)
        try:
            data = model_cls.model_validate(_extract_json(text))
        except (ValidationError, ValueError, json.JSONDecodeError) as error:
            raise AIError("INVALID_RESPONSE", "Structured response failed validation", "anthropic", error)
        usage = response.get("usage") or {}
        return AICompletion(
            data=data,
            usage=AIUsage(input_tokens=usage.get("input_tokens"), output_tokens=usage.get("output_tokens")),
            provider="anthropic",
            model=self.model,
            duration_ms=int((time.time() - started) * 1000),
        )

    async def chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        system_content, user_messages = self._split_system(request)
        body = {
            "model": self.model,
            "system": system_content,
            "messages": user_messages,
            "max_tokens": request.max_tokens or 1000,
            "temperature": request.temperature if request.temperature is not None else (self.config.temperature if self.config.temperature is not None else 0.7),
            "stream": True,
        }
        timeout = httpx.Timeout(self.config.timeout / 1000)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", f"{self.base_url}/v1/messages", json=body, headers=self._headers()) as response:
                    if response.status_code != 200:
                        await response.aread()
                        self._raise_for_response(response)
                    async for line in response.aiter_lines():
                        trimmed = line.strip()
                        if not trimmed.startswith("data: "):
                            continue
                        try:
                            data = json.loads(trimmed[6:])
                        except json.JSONDecodeError:
                            continue
                        if data.get("type") == "content_block_delta" and (data.get("delta") or {}).get("type") == "text_delta":
                            yield data["delta"]["text"]
        except httpx.TimeoutException as error:
            raise AIError("TIMEOUT", "AI request timed out or was cancelled", "anthropic", error)
        except httpx.HTTPError as error:
            raise AIError("NETWORK_ERROR", "AI network request failed", "anthropic", error)

    async def chat_complete(self, request: ChatRequest) -> str:
        system_content, user_messages = self._split_system(request)
        body = {
            "model": self.model,
            "system": system_content,
            "messages": user_messages,
            "max_tokens": request.max_tokens or 1000,
            "temperature": request.temperature if request.temperature is not None else (self.config.temperature if self.config.temperature is not None else 0.7),
        }
        response = await self._post(body)
        return self._first_text(response)

    async def check_health(self) -> bool:
        return self._ready

    def get_provider_info(self) -> ProviderInfo:
        return ProviderInfo(id="anthropic", name="Anthropic Claude", model=self.model, configured=self._ready)

    def _first_text(self, response: dict) -> str:
        content = response.get("content") or []
        if content and content[0].get("type") == "text":
            return content[0]["text"]
        raise AIError("INVALID_RESPONSE", "No text content in response", "anthropic")

    async def _post(self, body: dict) -> dict:
        timeout = httpx.Timeout(self.config.timeout / 1000)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(f"{self.base_url}/v1/messages", json=body, headers=self._headers())
            if response.status_code != 200:
                self._raise_for_response(response)
            return response.json()
        except httpx.TimeoutException as error:
            raise AIError("TIMEOUT", "AI request timed out or was cancelled", "anthropic", error)
        except httpx.HTTPError as error:
            raise AIError("NETWORK_ERROR", "AI network request failed", "anthropic", error)

    def _raise_for_response(self, response: httpx.Response) -> None:
        status = response.status_code
        if status == 401:
            raise AIError("INVALID_API_KEY", "Invalid API key", "anthropic")
        if status == 429:
            raise AIError("RATE_LIMIT_EXCEEDED", "Rate limit exceeded", "anthropic")
        if status == 503:
            raise AIError("SERVICE_UNAVAILABLE", "Service unavailable", "anthropic")
        raise AIError("NETWORK_ERROR", f"HTTP {status}", "anthropic")


def create_provider(config: AIConfig) -> AIProvider:
    if config.provider == "anthropic":
        return AnthropicProvider(config)
    if config.provider == "openai-compat":
        return OpenAICompatProvider(config)
    raise AIConfigError(f"Unsupported AI provider: {config.provider}", config.provider)
