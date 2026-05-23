#!/usr/bin/env python3
"""
Research Paper Search Engine - Main Entry Point
"""

import uvicorn
import logging
import os
from src.utils.config import ENVIRONMENT

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    logger.info(f"Starting Research Paper Search Engine in {ENVIRONMENT} mode...")
    
    is_dev = ENVIRONMENT == "development"
    
    try:
        uvicorn.run(
            "src.app:app",
            host="0.0.0.0",
            port=8001,
            reload=is_dev,
            workers=1 if is_dev else 4,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise

if __name__ == "__main__":
    main()
