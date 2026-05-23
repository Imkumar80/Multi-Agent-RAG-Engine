import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import Field, ConfigDict
from pydantic_settings import BaseSettings
from typing import Optional

# Load .env file
# config.py is in: ml-backend/src/utils/config.py
# We need: ml-backend/.env
# So we go up: utils -> src -> ml-backend
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
print(f"Loading .env from: {env_path}")
print(f".env exists: {env_path.exists()}")
load_dotenv(env_path)


class Settings(BaseSettings):
    """
    Application settings from environment variables

    Validates all variables are present and correct type
    Raises error if required variables missing
    """

    # OPENAI API KEY (REQUIRED - will be replaced by SLM in future)
    openai_api_key: str = Field(default=..., description="OpenAI API key for LLM")

    # LLM CONFIGURATION (OPTIONAL - has defaults)
    llm_provider: str = Field(
        default="openai", description="LLM provider (openai or slm)"
    )
    llm_model: str = Field(default="gpt-3.5-turbo", description="LLM model name")

    # EMBEDDINGS (OPTIONAL - has defaults)
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2", description="HuggingFace embedding model"
    )
    embedding_dimension: int = Field(
        default=384, description="Embedding vector dimension"
    )
    sentence_transformers_home: str = Field(
        default="./models", description="Where to cache embedding models"
    )

    # SERVER CONFIGURATION (OPTIONAL - has defaults)
    environment: str = Field(
        default="development", description="Environment (development or production)"
    )
    log_level: str = Field(default="INFO", description="Logging level")
    debug: bool = Field(default=True, description="Debug mode")

    # CORS CONFIGURATION (OPTIONAL - has defaults)
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:8080",
        description="Comma-separated CORS origins",
    )

    # OPTIONAL API KEYS (OPTIONAL - empty by default)
    semantic_scholar_api_key: str = Field(
        default="", description="Semantic Scholar API key (optional)"
    )
    springer_api_key: str = Field(default="", description="Springer API key (optional)")
    scopus_api_key: str = Field(default="", description="Scopus API key (optional)")

    # QDRANT VECTOR DATABASE (REQUIRED)
    qdrant_url: str = Field(
        default="http://localhost:6333", description="Qdrant URL (local or cloud)"
    )
    qdrant_api_key: str = Field(
        default="", description="Qdrant API key (required for cloud)"
    )
    qdrant_collection: str = Field(
        default="resonav-papers", description="Qdrant collection name"
    )

    # REDIS DATABASE CONFIGURATION
    redis_url: str = Field(
        default="redis://localhost:6379/0", description="Redis connection URL"
    )
    redis_password: Optional[str] = Field(
        default="", description="Redis password (optional)"
    )
    redis_db: int = Field(default=0, description="Redis database index")

    # PYDANTIC V2 CONFIGURATION
    model_config = ConfigDict(
        env_file=str(env_path), case_sensitive=False, extra="ignore"
    )


# Create settings instance (loads from .env)
settings = Settings()

# EXPORT individual variables so others can use:
# from utils.config import OPENAI_API_KEY
OPENAI_API_KEY = settings.openai_api_key
LLM_PROVIDER = settings.llm_provider
LLM_MODEL = settings.llm_model

EMBEDDING_MODEL = settings.embedding_model
EMBEDDING_DIMENSION = settings.embedding_dimension
SENTENCE_TRANSFORMERS_HOME = settings.sentence_transformers_home

ENVIRONMENT = settings.environment
LOG_LEVEL = settings.log_level
DEBUG = settings.debug

CORS_ORIGINS = settings.cors_origins

SEMANTIC_SCHOLAR_API_KEY = settings.semantic_scholar_api_key
SPRINGER_API_KEY = settings.springer_api_key
SCOPUS_API_KEY = settings.scopus_api_key

# Qdrant Vector Database
QDRANT_URL = settings.qdrant_url
QDRANT_API_KEY = settings.qdrant_api_key
QDRANT_COLLECTION = settings.qdrant_collection

REDIS_URL = settings.redis_url
REDIS_PASSWORD = settings.redis_password
REDIS_DB = settings.redis_db


# Function to get all settings
def get_settings() -> Settings:
    """
    Get settings instance

    Usage:
        from utils.config import get_settings
        config = get_settings()
        print(config.database_url)
    """
    return settings


# Function to get settings as dictionary
def get_settings_dict() -> dict:
    """
    Get all settings as dictionary
    Useful for logging/debugging
    """
    return settings.model_dump()
