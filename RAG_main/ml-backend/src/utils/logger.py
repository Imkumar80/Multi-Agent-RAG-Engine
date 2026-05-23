import logging
import sys
from pathlib import Path 
from logging.handlers import RotatingFileHandler
from typing import Optional

try:
    from src.utils.config import LOG_LEVEL, ENVIRONMENT , DEBUG
except ImportError:

    #fallback if config is not available 
    LOG_LEVEL="INFO"
    ENVIRONMENT="development"
    DEBUG=True

logs_dir=Path(__file__).resolve().parent.parent.parent/ "logs"
logs_dir.mkdir(exist_ok=True)
logs_file=logs_dir/ "app.log"

logger=logging.getLogger("resonav")
logger.setLevel(LOG_LEVEL)
logger.propagate=False

#formatting 
log_format = "%(asctime)s | %(levelname)-8s | %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"
formatter = logging.Formatter(log_format, datefmt=date_format)

#console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(LOG_LEVEL)
console_handler.setFormatter(formatter)

#file handler
file_handler = RotatingFileHandler(
    filename=logs_file,
    maxBytes=5 * 1024 * 1024,  # 5MB
    backupCount=5,              # Keep 5 old files
)
file_handler.setLevel(LOG_LEVEL)
file_handler.setFormatter(formatter)

# Remove any existing handlers (prevent duplicates)
logger.handlers = []

# Add both handlers
logger.addHandler(console_handler)
logger.addHandler(file_handler)

#log initialization
# Log that logger is initialized
logger.info(f"Logger initialized")
logger.info(f"Environment: {ENVIRONMENT}")
logger.info(f"Log Level: {LOG_LEVEL}")
logger.info(f"Log file: {logs_file}")
logger.debug(f"Debug mode: {DEBUG}")