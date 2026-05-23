"""
Vector Store Service - Qdrant Cloud Integration

Handles all vector and metadata storage operations in Qdrant.
"""

from typing import List, Optional, Dict, Any, Tuple
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from datetime import datetime
import uuid

from src.models.database import ResearchPaper, ChatSession, ChatMessage
from src.utils.config import QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION
from src.utils.logger import logger

# Initialize Qdrant client
client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=30
)

# Collection configuration
COLLECTION_NAME = QDRANT_COLLECTION
VECTOR_SIZE = 384  # all-MiniLM-L6-v2 dimension


# ============ COLLECTION MANAGEMENT ============

def initialize_qdrant():
    """
    Initialize Qdrant collection if it doesn't exist.
    Create vector index for embeddings.
    """
    try:
        # Check if collection exists
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if COLLECTION_NAME not in collection_names:
            logger.info(f"Creating Qdrant collection: {COLLECTION_NAME}")
            
            # Create collection with vector config
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE
                )
            )
            logger.info(f"[+] Collection '{COLLECTION_NAME}' created successfully")
        else:
            logger.info(f"[+] Collection '{COLLECTION_NAME}' already exists")
            
    except Exception as e:
        logger.error(f"[-] Error initializing Qdrant: {str(e)}")
        raise


def get_collection_stats():
    """Get collection statistics"""
    try:
        collection_info = client.get_collection(COLLECTION_NAME)
        return {
            "name": COLLECTION_NAME,
            "vectors_count": collection_info.points_count,
            "vector_size": VECTOR_SIZE,
            "distance": "cosine"
        }
    except Exception as e:
        logger.error(f"[-] Error getting collection stats: {str(e)}")
        return None


# ============ PAPER STORAGE ============

def store_paper_embedding(
    paper: ResearchPaper,
    embedding: List[float],
    point_id: Optional[int] = None
) -> int:
    """
    Store paper with embedding in Qdrant.
    
    Args:
        paper: ResearchPaper object
        embedding: Vector embedding (384 dimensions)
        point_id: Optional custom ID (default: auto-generated)
    
    Returns:
        Point ID in Qdrant
    """
    try:
        # Use paper ID or generate new one
        pid = point_id or paper.id or int(uuid.uuid4().int % 1000000)
        
        # Create point with payload
        point = PointStruct(
            id=pid,
            vector=embedding,
            payload={
                "type": "paper",
                "paper_id": paper.id,
                "title": paper.title,
                "authors": paper.authors,
                "abstract": paper.abstract,
                "content": paper.content,  # Store full content for RAG!
                "source": paper.source,
                "url": paper.url,
                "published_date": paper.published_date,
                "created_at": datetime.now().isoformat(),
                "metadata": paper.metadata or {}
            }
        )
        
        # Upload to Qdrant
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=[point]
        )
        
        logger.info(f"[+] Stored paper '{paper.title}' with ID {pid}")
        return pid
        
    except Exception as e:
        logger.error(f"[-] Error storing paper embedding: {str(e)}")
        raise


def batch_store_papers(
    papers: List[Tuple[ResearchPaper, List[float]]]
) -> List[int]:
    """
    Store multiple papers with embeddings in batch.
    
    Args:
        papers: List of (ResearchPaper, embedding) tuples
    
    Returns:
        List of point IDs
    """
    try:
        points = []
        point_ids = []
        
        for i, (paper, embedding) in enumerate(papers):
            pid = paper.id or int(uuid.uuid4().int % 1000000)
            point_ids.append(pid)
            
            point = PointStruct(
                id=pid,
                vector=embedding,
                payload={
                    "type": "paper",
                    "paper_id": paper.id,
                    "title": paper.title,
                    "authors": paper.authors,
                    "abstract": paper.abstract,
                    "source": paper.source,
                    "url": paper.url,
                    "published_date": paper.published_date,
                    "content_preview": paper.content[:500] if paper.content else None,
                    "created_at": datetime.now().isoformat(),
                    "metadata": paper.metadata or {}
                }
            )
            points.append(point)
        
        # Batch upload
        if points:
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=points
            )
            logger.info(f"[+] Stored {len(points)} papers in batch")
        
        return point_ids
        
    except Exception as e:
        logger.error(f"[-] Error batch storing papers: {str(e)}")
        raise


# ============ SEARCH OPERATIONS ============

def search_similar(
    query_embedding: List[float],
    top_k: int = 5,
    filters: Optional[Dict] = None
) -> List[Dict[str, Any]]:
    """
    Search for similar papers using vector similarity.
    
    Args:
        query_embedding: Query vector (384 dimensions)
        top_k: Number of results to return
        filters: Optional payload filters
    
    Returns:
        List of similar papers with scores
    """
    try:
        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=filters
        )
        
        papers = []
        for result in results:
            papers.append({
                "id": result.id,
                "score": result.score,
                "payload": result.payload
            })
        
        logger.info(f"[+] Found {len(papers)} similar papers")
        return papers
        
    except Exception as e:
        logger.error(f"[-] Error searching similar: {str(e)}")
        return []


def search_by_source(
    query_embedding: List[float],
    source: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """Search papers filtered by source"""
    try:
        # Build filter for source
        filters = {
            "must": [
                {
                    "key": "source",
                    "match": {"value": source}
                }
            ]
        }
        
        return search_similar(query_embedding, top_k, filters)
        
    except Exception as e:
        logger.error(f"[-] Error searching by source: {str(e)}")
        return []


# ============ CHAT STORAGE ============

def store_chat_session(session: ChatSession) -> int:
    """
    Store chat session in Qdrant metadata.
    
    Args:
        session: ChatSession object
    
    Returns:
        Session ID
    """
    try:
        sid = session.id or int(uuid.uuid4().int % 1000000)
        
        # Create a dummy vector for chat storage
        dummy_vector = [0.0] * VECTOR_SIZE
        
        point = PointStruct(
            id=sid + 1000000,  # Offset to avoid collision with papers
            vector=dummy_vector,
            payload={
                "type": "chat_session",
                "session_id": sid,
                "paper_id": session.paper_id,
                "user_id": session.user_id,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat() if session.updated_at else None
            }
        )
        
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=[point]
        )
        
        logger.info(f"[+] Stored chat session {sid}")
        return sid
        
    except Exception as e:
        logger.error(f"[-] Error storing chat session: {str(e)}")
        raise


def store_chat_message(message: ChatMessage) -> int:
    """
    Store chat message in Qdrant metadata.
    
    Args:
        message: ChatMessage object
    
    Returns:
        Message ID
    """
    try:
        mid = message.id or int(uuid.uuid4().int % 1000000)
        
        # Create a dummy vector for message storage
        dummy_vector = [0.0] * VECTOR_SIZE
        
        point = PointStruct(
            id=mid + 2000000,  # Different offset for messages
            vector=dummy_vector,
            payload={
                "type": "chat_message",
                "message_id": mid,
                "session_id": message.session_id,
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "metadata": message.metadata or {}
            }
        )
        
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=[point]
        )
        
        logger.info(f"[+] Stored chat message {mid}")
        return mid
        
    except Exception as e:
        logger.error(f"[-] Error storing chat message: {str(e)}")
        raise


# ============ RETRIEVAL OPERATIONS ============

def get_paper_by_id(paper_id: int) -> Optional[Dict[str, Any]]:
    """
    Get paper by ID from Qdrant.
    
    Args:
        paper_id: Paper ID
    
    Returns:
        Paper data or None
    """
    try:
        point = client.retrieve(
            collection_name=COLLECTION_NAME,
            ids=[paper_id],
            with_payload=True,
            with_vectors=False
        )
        
        if point:
            return point[0].payload
        return None
        
    except Exception as e:
        logger.error(f"[-] Error getting paper: {str(e)}")
        return None


def get_chat_session(session_id: int) -> Optional[Dict[str, Any]]:
    """Get chat session from Qdrant"""
    try:
        point = client.retrieve(
            collection_name=COLLECTION_NAME,
            ids=[session_id + 1000000],
            with_payload=True,
            with_vectors=False
        )
        
        if point:
            return point[0].payload
        return None
        
    except Exception as e:
        logger.error(f"[-] Error getting chat session: {str(e)}")
        return None


def get_all_papers() -> List[Dict[str, Any]]:
    """Get all papers from Qdrant"""
    try:
        # Scroll through all points with type=paper
        points, _ = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=1000,
            with_payload=True,
            with_vectors=False
        )
        
        papers = [p.payload for p in points if p.payload.get("type") == "paper"]
        logger.info(f"[+] Retrieved {len(papers)} papers")
        return papers
        
    except Exception as e:
        logger.error(f"[-] Error getting all papers: {str(e)}")
        return []


def delete_paper(paper_id: int) -> bool:
    """Delete paper from Qdrant"""
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector={"points": [paper_id]}
        )
        logger.info(f"[+] Deleted paper {paper_id}")
        return True
        
    except Exception as e:
        logger.error(f"[-] Error deleting paper: {str(e)}")
        return False
