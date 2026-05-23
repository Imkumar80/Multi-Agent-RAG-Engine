"""
FastAPI Application Setup

Initializes the FastAPI app with:
- CORS middleware
- Database connection
- API routes
- Error handling
- Health checks
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from src.utils.config import CORS_ORIGINS, ENVIRONMENT, DEBUG
from src.utils.logger import logger
from src.utils.redis_client import initialize_redis
from src.services.vector_store import initialize_qdrant
from src.api.routes import router
from src.api.ingestion_routes import ingestion_router


# ============ LIFESPAN EVENTS ============


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events for FastAPI application.
    """
    # STARTUP
    logger.info("Initializing application...")

    try:
        # Initialize Qdrant (no PostgreSQL needed)
        logger.info("Initializing Qdrant vector database...")
        initialize_qdrant()
        logger.info("[+] Qdrant initialized successfully")
    except Exception as e:
        logger.warning(f"[-] Qdrant initialization warning: {str(e)}")
        # Don't fail startup if Qdrant has issues

    try:
        # Initialize Redis for chat persistence
        logger.info("Initializing Redis cache/database...")
        initialize_redis()
        logger.info("[+] Redis initialized successfully")
    except Exception as e:
        logger.warning(f"[-] Redis initialization warning: {str(e)}")
        # Don't fail startup if Redis has issues

    try:
        # Initialize multi-agent research team
        logger.info("Initializing multi-agent research team...")
        from src.services.agent_manager import get_agent_manager
        from src.services.agent_communication import get_communication_bus

        agent_manager = get_agent_manager()
        comm_bus = get_communication_bus()
        logger.info("[+] Multi-agent system initialized")
        logger.info(
            f"    └─ Researcher agent: {agent_manager.agents['researcher'].agent_id}"
        )
        logger.info(
            f"    └─ Analyzer agent: {agent_manager.agents['analyzer'].agent_id}"
        )
        logger.info(f"    └─ Writer agent: {agent_manager.agents['writer'].agent_id}")
        logger.info(
            f"    └─ Reviewer agent: {agent_manager.agents['reviewer'].agent_id}"
        )
    except Exception as e:
        logger.warning(f"[-] Multi-agent system initialization warning: {str(e)}")
        # Don't fail startup if multi-agent system has issues

    logger.info("[+] Application startup complete")
    yield

    # SHUTDOWN
    logger.info("Shutting down application...")
    logger.info("[+] Application shutdown complete")


# ============ CREATE FASTAPI APP ============

app = FastAPI(
    title="Research Paper Search Engine API",
    description="AI-powered semantic search and chat interface for research papers",
    version="1.0.0",
    lifespan=lifespan,
)


# ============ CORS MIDDLEWARE ============

# Parse CORS origins from config (string to list)
cors_origins_list = [origin.strip() for origin in CORS_ORIGINS.split(",")]

# In development, also allow all origins for testing
if ENVIRONMENT == "development":
    cors_origins_list.append("*")  # Allow all origins in development

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=True if ENVIRONMENT != "development" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ INCLUDE ROUTES ============

app.include_router(router, prefix="/api", tags=["Research Papers & Chat"])
app.include_router(ingestion_router, prefix="/api", tags=["Data Ingestion"])


# ============ ROOT ENDPOINT ============


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Research Paper Search Engine API",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "API is running",
        "environment": ENVIRONMENT,
    }


# ============ ERROR HANDLERS ============


@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {
        "error": "Not Found",
        "message": "The requested endpoint does not exist",
        "path": request.url.path,
    }


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "error": "Internal Server Error",
        "message": str(exc) if DEBUG else "An error occurred",
    }
