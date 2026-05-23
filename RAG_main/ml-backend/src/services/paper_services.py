"""
Paper Services - Qdrant Backend

Handles all paper operations using Qdrant Cloud.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from src.models.database import ResearchPaper
from src.services.vector_store import (
    store_paper_embedding,
    get_paper_by_id,
    get_all_papers,
    search_similar,
    search_by_source
)
from src.services.embeddings import get_embedding
from src.utils.logger import logger


# FUNCTION 1: SAVE PAPER TO QDRANT (Called when user selects a paper)
def save_paper_to_qdrant(
    title: str,
    authors: List[str],
    abstract: str,
    url: str,
    source: str,
    content: Optional[str] = None,
    published_date: Optional[str] = None,
    metadata: Optional[Dict] = None,
    paper_id: Optional[int] = None
) -> Optional[ResearchPaper]:
    """
    Save paper with embedding to Qdrant.
    
    CALLED WHEN: User selects a paper from search results
    
    Args:
        title: Paper title
        authors: List of author names
        abstract: Paper abstract
        url: Paper URL
        source: Source (arxiv, semantic_scholar, etc)
        content: Full paper content (if available)
        published_date: Publication date
        metadata: Custom metadata
        paper_id: Optional custom ID
    
    Returns:
        ResearchPaper object or None
    """
    try:
        # Create paper object
        paper = ResearchPaper(
            id=paper_id,
            title=title,
            authors=authors,
            abstract=abstract,
            content=content,
            url=url,
            source=source,
            published_date=published_date,
            metadata=metadata or {}
        )
        
        # Generate embedding from abstract + content
        text_to_embed = content or abstract
        logger.info(f"[+] Generating embedding for selected paper: {title[:50]}...")
        embedding = get_embedding(text_to_embed)
        
        if not embedding:
            logger.error("[-] Failed to generate embedding")
            return None
        
        # Store in Qdrant (NOW paper is in Qdrant)
        point_id = store_paper_embedding(paper, embedding, paper_id)
        paper.id = point_id
        
        logger.info(f"[+] Paper saved to Qdrant with ID {point_id}")
        logger.info(f"[+] Qdrant now has paper ready for chat & RAG search")
        return paper
        
    except Exception as e:
        logger.error(f"[-] Error saving paper to Qdrant: {str(e)}")
        raise


# FUNCTION 2: GET PAPER BY ID (Get details of selected paper)
def get_paper_by_id_service(paper_id: int) -> Optional[ResearchPaper]:
    """
    Get paper details from Qdrant.
    
    CALLED WHEN: User opens a paper
    
    Args:
        paper_id: Paper ID in Qdrant
    
    Returns:
        ResearchPaper object or None
    """
    try:
        paper_data = get_paper_by_id(paper_id)
        
        if not paper_data:
            logger.warning(f"[-] Paper {paper_id} not found in Qdrant")
            return None
        
        # Convert payload to ResearchPaper
        paper = ResearchPaper(
            id=paper_data.get("paper_id"),
            title=paper_data.get("title"),
            authors=paper_data.get("authors", []),
            abstract=paper_data.get("abstract"),
            content=paper_data.get("content"),
            url=paper_data.get("url"),
            source=paper_data.get("source"),
            published_date=paper_data.get("published_date"),
            metadata=paper_data.get("metadata", {})
        )
        
        logger.info(f"[+] Retrieved paper {paper_id} from Qdrant")
        return paper
        
    except Exception as e:
        logger.error(f"[-] Error getting paper: {str(e)}")
        return None


# FUNCTION 3: SEARCH PAPERS IN QDRANT (Only papers user selected)
def search_papers_in_qdrant(
    query: str,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search ONLY papers stored in Qdrant (papers user selected).
    
    CALLED WHEN: User searches within selected papers
    
    Args:
        query: Search query
        limit: Results limit
    
    Returns:
        Dictionary with papers found in Qdrant
    """
    try:
        logger.info(f"[+] Searching Qdrant for: {query}")
        
        # Generate embedding for query
        query_embedding = get_embedding(query)
        
        if not query_embedding:
            logger.error("[-] Failed to generate query embedding")
            return {
                "papers": [],
                "total": 0,
                "limit": limit,
                "source": "qdrant"
            }
        
        # Search in Qdrant
        results = search_similar(query_embedding, limit)
        
        # Convert to ResearchPaper objects
        papers = []
        for result in results:
            payload = result.get("payload", {})
            paper = ResearchPaper(
                id=payload.get("paper_id"),
                title=payload.get("title"),
                authors=payload.get("authors", []),
                abstract=payload.get("abstract"),
                content=None,
                url=payload.get("url"),
                source=payload.get("source"),
                published_date=payload.get("published_date"),
                metadata=payload.get("metadata", {})
            )
            papers.append(paper)
        
        logger.info(f"[+] Found {len(papers)} papers in Qdrant")
        return {
            "papers": papers,
            "total": len(papers),
            "limit": limit,
            "source": "qdrant"
        }
        
    except Exception as e:
        logger.error(f"[-] Error searching Qdrant: {str(e)}")
        raise


# FUNCTION 4: GET ALL PAPERS IN QDRANT (User's selected papers)
def get_all_papers_in_qdrant() -> List[ResearchPaper]:
    """
    Get all papers user has selected (stored in Qdrant).
    
    CALLED WHEN: User wants to see their library
    
    Returns:
        List of ResearchPaper objects
    """
    try:
        papers_data = get_all_papers()
        
        papers = []
        for paper_data in papers_data:
            paper = ResearchPaper(
                id=paper_data.get("paper_id"),
                title=paper_data.get("title"),
                authors=paper_data.get("authors", []),
                abstract=paper_data.get("abstract"),
                content=None,
                url=paper_data.get("url"),
                source=paper_data.get("source"),
                published_date=paper_data.get("published_date"),
                metadata=paper_data.get("metadata", {})
            )
            papers.append(paper)
        
        logger.info(f"[+] Retrieved {len(papers)} papers from Qdrant")
        return papers
        
    except Exception as e:
        logger.error(f"[-] Error getting papers: {str(e)}")
        return []