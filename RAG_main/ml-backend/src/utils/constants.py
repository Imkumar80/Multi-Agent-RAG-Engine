"""
Application Constants

Centralized constants used across the entire application
Includes API endpoints, paper sources, batch sizes, timeouts, etc.
"""

# ============================================================================
# PAPER SOURCES
# ============================================================================

PAPER_SOURCES = {
    "arxiv": "ArXiv",
    "semantic_scholar": "Semantic Scholar",
    "crossref": "CrossRef",
    "springer": "Springer"
}

DEFAULT_PAPER_SOURCES = ["arxiv", "semantic_scholar", "crossref"]

# ============================================================================
# EMBEDDING CONFIGURATION
# ============================================================================

EMBEDDING_BATCH_SIZE = 32  # Process embeddings in batches of 32
EMBEDDING_DIMENSION = 384  # all-MiniLM-L6-v2 uses 384 dimensions
MAX_TEXT_LENGTH = 8000  # Max characters per embedding (avoid memory issues)
SIMILARITY_THRESHOLD = 0.5  # Minimum similarity score (0-1)

# ============================================================================
# CHAT CONFIGURATION
# ============================================================================

MAX_CHAT_HISTORY = 50  # Maximum messages in a chat session
MAX_MESSAGE_LENGTH = 5000  # Maximum characters per message
DEFAULT_CONTEXT_CHUNKS = 5  # Number of relevant chunks to include in context
CHUNK_OVERLAP_SIZE = 100  # Characters to overlap between chunks

# ============================================================================
# SEARCH CONFIGURATION
# ============================================================================

DEFAULT_SEARCH_LIMIT = 10  # Default papers returned in search
MAX_SEARCH_LIMIT = 50  # Maximum papers allowed in search
MIN_SEARCH_LIMIT = 1  # Minimum papers allowed

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Timeouts (in seconds)
API_TIMEOUT = 30  # External API timeout
DATABASE_TIMEOUT = 10  # Database query timeout
LLM_TIMEOUT = 60  # LLM response timeout

# ============================================================================
# TEXT PROCESSING
# ============================================================================

# Paper chunking
PAPER_CHUNK_SIZE = 512  # Characters per chunk
PAPER_CHUNK_OVERLAP = 50  # Overlap between chunks
MIN_CHUNK_LENGTH = 100  # Minimum characters for a valid chunk

# ============================================================================
# RAG (RETRIEVAL-AUGMENTED GENERATION) CONFIG
# ============================================================================

RAG_TOP_K = 5  # Number of relevant chunks to retrieve
RAG_RERANKER_ENABLED = True  # Use reranker for better relevance
RAG_SCORE_THRESHOLD = 0.3  # Minimum relevance score

# ============================================================================
# LLM CONFIGURATION
# ============================================================================

LLM_TEMPERATURE = 0.7  # Creativity level (0=deterministic, 1=creative)
LLM_MAX_TOKENS = 1000  # Maximum response length
LLM_MODEL = "gpt-3.5-turbo"  # Default model (will be configurable)

# System prompts
SYSTEM_PROMPT = """You are an expert research assistant. Your role is to help users understand 
and analyze research papers. Provide accurate, cite-aware responses based on the provided context. 
When referencing information from papers, always mention the source."""

CHAT_SYSTEM_PROMPT = """You are analyzing a research paper to answer user questions. 
Use the provided paper content and context chunks to formulate accurate answers. 
Cite specific sections when relevant. Be concise but thorough."""

# ============================================================================
# API ENDPOINTS (Routes)
# ============================================================================

API_PREFIX = "/api"

# Paper endpoints
PAPER_ROUTES = {
    "search": f"{API_PREFIX}/papers/search",  # GET - Search papers
    "get": f"{API_PREFIX}/papers/{{paper_id}}",  # GET - Get paper details
    "upload": f"{API_PREFIX}/papers/upload",  # POST - Upload paper
}

# Chat endpoints
CHAT_ROUTES = {
    "create_session": f"{API_PREFIX}/chat/sessions",  # POST - Create session
    "get_session": f"{API_PREFIX}/chat/sessions/{{session_id}}",  # GET - Get session
    "send_message": f"{API_PREFIX}/chat/sessions/{{session_id}}/messages",  # POST - Send message
    "get_messages": f"{API_PREFIX}/chat/sessions/{{session_id}}/messages",  # GET - Get history
    "delete_session": f"{API_PREFIX}/chat/sessions/{{session_id}}",  # DELETE - Delete session
}

# Health endpoints
HEALTH_ROUTES = {
    "health": "/health",  # GET - System health
    "ready": "/ready",  # GET - Readiness check
}

# ============================================================================
# HTTP STATUS MESSAGES
# ============================================================================

HTTP_MESSAGES = {
    200: "Success",
    201: "Created",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    500: "Internal Server Error",
    503: "Service Unavailable",
}

# ============================================================================
# ERROR MESSAGES
# ============================================================================

ERROR_MESSAGES = {
    "invalid_query": "Search query is required and must not be empty",
    "invalid_paper_id": "Invalid paper ID format",
    "invalid_session_id": "Invalid chat session ID",
    "paper_not_found": "Paper not found in database",
    "session_not_found": "Chat session not found",
    "no_results": "No papers found matching your search",
    "api_error": "Error communicating with external API",
    "database_error": "Database operation failed",
    "embedding_error": "Failed to generate embeddings",
    "llm_error": "Error generating response from language model",
    "rate_limited": "Rate limit exceeded. Please try again later",
    "invalid_content": "Content is invalid or empty",
}

# ============================================================================
# SUCCESS MESSAGES
# ============================================================================

SUCCESS_MESSAGES = {
    "papers_found": "Papers retrieved successfully",
    "session_created": "Chat session created successfully",
    "message_sent": "Message processed successfully",
    "paper_uploaded": "Paper uploaded and processed successfully",
}

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================

CACHE_TTL = 3600  # Cache time-to-live in seconds (1 hour)
CACHE_MAX_SIZE = 1000  # Maximum cached items
CACHE_ENABLED = True  # Enable caching globally

# ============================================================================
# LOGGING
# ============================================================================

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ============================================================================
# DATABASE
# ============================================================================

# Table names
TABLES = {
    "papers": "research_papers",
    "sessions": "chat_sessions",
    "messages": "chat_messages",
}

# Index names (for PostgreSQL)
INDEXES = {
    "papers_embedding": "idx_papers_embedding",
    "papers_source": "idx_papers_source",
    "messages_session": "idx_messages_session",
}

# ============================================================================
# VALIDATION RULES
# ============================================================================

# String length constraints
MIN_QUERY_LENGTH = 1
MAX_QUERY_LENGTH = 500

MIN_TITLE_LENGTH = 5
MAX_TITLE_LENGTH = 500

MIN_ABSTRACT_LENGTH = 10
MAX_ABSTRACT_LENGTH = 5000

# Numeric constraints
MIN_MAX_RESULTS = 1
MAX_MAX_RESULTS = 100

# ============================================================================
# FEATURE FLAGS
# ============================================================================

FEATURES = {
    "enable_semantic_search": True,
    "enable_reranking": True,
    "enable_caching": True,
    "enable_rate_limiting": True,
    "enable_detailed_logging": False,
}

# ============================================================================
# PAGINATION
# ============================================================================

PAGINATION = {
    "default_page": 1,
    "default_page_size": 20,
    "max_page_size": 100,
}

# ============================================================================
# CORS & SECURITY
# ============================================================================

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["*"]

# ============================================================================
# VECTOR SEARCH
# ============================================================================

# pgvector distance operators
VECTOR_DISTANCE_OPERATORS = {
    "cosine": "<=>",  # Cosine distance
    "euclidean": "<->",  # Euclidean distance
    "inner_product": "<#>",  # Inner product distance
}

DEFAULT_VECTOR_OPERATOR = "cosine"

# ============================================================================
# BATCH PROCESSING
# ============================================================================

BATCH_SIZE_EMBEDDINGS = 32  # Embeddings batch size
BATCH_SIZE_DATABASE = 100  # Database insert batch size
BATCH_SIZE_API = 10  # API request batch size

# ============================================================================
# TIMESTAMPS
# ============================================================================

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"
DATETIME_FORMAT_ISO = "%Y-%m-%dT%H:%M:%SZ"

# ============================================================================
# EXAMPLE/TESTING CONSTANTS
# ============================================================================

EXAMPLE_QUERIES = [
    "machine learning",
    "deep learning neural networks",
    "natural language processing",
    "computer vision",
    "transformer models",
]

EXAMPLE_PAPER_TITLE = "A Survey on Neural Networks"
EXAMPLE_PAPER_AUTHORS = ["John Doe", "Jane Smith"]
