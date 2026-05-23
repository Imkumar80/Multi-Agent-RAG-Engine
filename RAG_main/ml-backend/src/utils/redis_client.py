"""
Redis client utility for chat persistence.
"""

from redis import Redis
from redis.exceptions import RedisError

from src.utils.config import REDIS_URL, REDIS_DB, REDIS_PASSWORD
from src.utils.logger import logger

# Initialize Redis client with response decoding enabled
redis_client = Redis.from_url(
    REDIS_URL,
    db=REDIS_DB,
    password=REDIS_PASSWORD or None,
    decode_responses=True,
    socket_timeout=5,
    socket_connect_timeout=5,
)


def initialize_redis() -> None:
    """Ping Redis and validate the connection."""
    try:
        logger.info("Initializing Redis connection...")
        redis_client.ping()
        logger.info("[+] Redis connection established")
    except RedisError as exc:
        logger.error(f"[-] Redis initialization failed: {exc}")
        raise


def get_redis_client() -> Redis:
    """Get the shared Redis client."""
    return redis_client
