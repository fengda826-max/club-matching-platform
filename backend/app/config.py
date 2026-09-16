"""应用配置：从环境变量 / .env 读取，等价于原 TS 版本的 src/lib/env.ts。"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=True)

    APP_ENV: str = ""
    NODE_ENV: str = "development"  # 兼容旧部署，APP_ENV 优先
    PORT: int = 3001
    DATABASE_URL: str = "file:./dev.db"
    CORS_ORIGIN: str = "http://localhost:5175"

    AI_PROVIDER: str = "openai-compat"  # anthropic | openai-compat
    AI_API_KEY: str = ""
    AI_BASE_URL: str | None = None
    AI_MODEL: str | None = None
    AI_TIMEOUT: int = 30000  # 毫秒（沿用 TS 语义）
    AI_MAX_RETRIES: int = 2
    AI_TEMPERATURE: float | None = None

    AI_EMBEDDING_MODEL: str = "text-embedding-v3"
    AI_EMBEDDING_DIM: int = 1024
    RAG_ENABLED: bool = True
    RAG_TOP_K: int = 5

    ADMIN_PASSWORD: str = ""
    SESSION_SECRET: str = ""
    COOKIE_SECURE: bool = False
    SEED_DEMO_DATA: bool = False

    @field_validator("RAG_ENABLED", "COOKIE_SECURE", "SEED_DEMO_DATA", mode="before")
    @classmethod
    def _coerce_bool(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() == "true"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGIN.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return (self.APP_ENV or self.NODE_ENV) == "production"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and (not settings.ADMIN_PASSWORD or not settings.SESSION_SECRET):
        raise RuntimeError("ADMIN_PASSWORD and SESSION_SECRET are required in production")
    return settings


settings = get_settings()
