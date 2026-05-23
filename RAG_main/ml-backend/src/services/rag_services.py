"""
RAG Services Module (Retrieval Augmented Generation)

Handles semantic search and context retrieval:
- chunk_text() → Split paper into chunks
- find_relevant_chunks() → Search chunks by embedding similarity
- get_context_for_question() → Build AI context from chunks
- rank_papers_by_relevance() → Rank papers by similarity score
"""

from typing import List, Optional, Dict, Any, Tuple
import re

from src.models.database import ResearchPaper
from src.services.embeddings import get_embedding
from src.services.vector_store import get_paper_by_id, get_all_papers, search_similar
from src.utils.logger import logger

# FUNCTION 1: CHUNK TEXT
def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 100
) -> List[str]:
    """
    Split text into overlapping chunks for semantic search.
    
    Args:
        text: Full text to chunk (paper content)
        chunk_size: Characters per chunk (default 500)
        overlap: Overlapping characters between chunks (default 100)
    
    Returns:
        List of text chunks
    
    Example:
        text = "This is a long paper... [1000 words]"
        chunks = chunk_text(text, chunk_size=500, overlap=100)
        # Returns: ["This is a long...", "...long paper...", ...]
    """
    try:
        if not text or len(text) == 0:
            logger.warning("Empty text provided for chunking")
            return []
        
        chunks = []
        start = 0
        
        # Calculate step size (chunk_size - overlap)
        step = chunk_size - overlap
        
        # Split text into chunks
        while start < len(text):
            # Get chunk from start to chunk_size
            end = min(start + chunk_size, len(text))
            chunk = text[start:end]
            
            # Clean chunk (remove extra whitespace, incomplete sentences)
            chunk = chunk.strip()
            
            if chunk:  # Only add non-empty chunks
                chunks.append(chunk)
            
            # Move start position forward
            start += step
        
        logger.info(f"Split text into {len(chunks)} chunks (size: {chunk_size}, overlap: {overlap})")
        return chunks
        
    except Exception as e:
        logger.error(f" Error chunking text: {str(e)}")
        raise


# FUNCTION 2: FIND RELEVANT CHUNKS
def find_relevant_chunks(
    question: str,
    chunks: List[str],
    top_k: int = 5,
    similarity_threshold: float = 0.3
) -> List[Tuple[str, float]]:
    """
    Find chunks most relevant to a question using semantic similarity.
    
    Args:
        question: User's question
        chunks: List of text chunks from paper
        top_k: Return top K most relevant chunks (default 5)
        similarity_threshold: Min similarity score to include (0-1, default 0.3)
    
    Returns:
        List of (chunk_text, similarity_score) tuples, sorted by relevance
    
    Example:
        chunks = ["Deep learning uses...", "Neural networks are...", ...]
        results = find_relevant_chunks(
            question="What is deep learning?",
            chunks=chunks,
            top_k=3
        )
        # Returns: [
        #   ("Deep learning uses neural networks...", 0.92),
        #   ("Neural networks are composed of...", 0.87),
        #   ("Training deep models requires...", 0.76)
        # ]
    """
    try:
        if not chunks:
            logger.warning("No chunks provided for relevance search")
            return []
        
        # Convert question to embedding
        logger.info(f"Computing embedding for question: '{question[:50]}...'")
        question_embedding = get_embedding(question)
        
        if question_embedding is None:
            logger.error("Failed to compute question embedding")
            return []
        
        # Calculate similarity for each chunk
        similarities = []
        
        for i, chunk in enumerate(chunks):
            try:
                # Get embedding for chunk
                chunk_embedding = get_embedding(chunk)
                
                if chunk_embedding is None:
                    logger.warning(f"Failed to compute embedding for chunk {i}")
                    continue
                
                # Calculate cosine similarity
                similarity = cosine_similarity(question_embedding, chunk_embedding)
                
                # Only include if above threshold
                if similarity >= similarity_threshold:
                    similarities.append((chunk, similarity))
                    
            except Exception as e:
                logger.warning(f"Error processing chunk {i}: {str(e)}")
                continue
        
        # Sort by similarity (highest first)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Return top K
        top_chunks = similarities[:top_k]
        
        logger.info(f"Found {len(top_chunks)} relevant chunks (top {top_k})")
        return top_chunks
        
    except Exception as e:
        logger.error(f"Error finding relevant chunks: {str(e)}")
        raise


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Args:
        vec1: First vector (embedding)
        vec2: Second vector (embedding)
    
    Returns:
        Similarity score (0-1, where 1 = identical)
    
    Formula: (A · B) / (||A|| * ||B||)
    """
    try:
        # Dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # Magnitudes
        mag1 = sum(a ** 2 for a in vec1) ** 0.5
        mag2 = sum(b ** 2 for b in vec2) ** 0.5
        
        # Avoid division by zero
        if mag1 == 0 or mag2 == 0:
            return 0.0
        
        # Cosine similarity
        similarity = dot_product / (mag1 * mag2)
        
        # Clamp to 0-1
        return max(0.0, min(1.0, similarity))
        
    except Exception as e:
        logger.error(f"Error calculating similarity: {str(e)}")
        return 0.0


# FUNCTION 3: GET CONTEXT FOR QUESTION
def get_context_for_question(
    question: str,
    paper_id: int,
    top_k: int = 5,
    include_paper_metadata: bool = True
) -> Dict[str, Any]:
    """
    Build complete context for AI to answer a question about a paper.
    Attempts to use pre-computed chunks from Qdrant vector search first.
    If unavailable, falls back to dynamic chunking of the paper content.
    """
    try:
        # Get paper from Qdrant
        paper_data = get_paper_by_id(paper_id)
        
        if not paper_data:
            logger.warning(f"Paper {paper_id} not found")
            return {
                "context": "",
                "relevant_chunks": [],
                "paper_metadata": None,
                "chunk_count": 0
            }
        
        # Convert payload to ResearchPaper
        paper = ResearchPaper(
            id=paper_data.get("id"),
            title=paper_data.get("title"),
            authors=paper_data.get("authors", []),
            abstract=paper_data.get("abstract"),
            content=paper_data.get("content"),
            url=paper_data.get("url"),
            source=paper_data.get("source"),
            published_date=paper_data.get("published_date"),
            metadata=paper_data.get("metadata", {})
        )
        
        relevant_chunks = []
        chunk_count = 0
        
        # Strategy A: Use Qdrant Vector Search (Fast, Pre-computed)
        logger.info(f"Querying Qdrant for semantic chunks for paper {paper_id}")
        question_embedding = get_embedding(question)
        
        if question_embedding:
            filters = {
                "must": [
                    {"key": "type", "match": {"value": "paper_chunk"}},
                    {"key": "paper_id", "match": {"value": paper_id}}
                ]
            }
            
            chunk_results = search_similar(
                query_embedding=question_embedding,
                top_k=top_k,
                filters=filters
            )
            
            if chunk_results:
                # Successfully found ingested chunks!
                for result in chunk_results:
                    chunk_content = result["payload"].get("content", "")
                    score = result["score"]
                    relevant_chunks.append((chunk_content, score))
                chunk_count = len(chunk_results)
                logger.info(f"Retrieved {chunk_count} chunks from Qdrant vector search.")
        
        # Strategy B: Fallback to Dynamic Chunking (if paper wasn't fully ingested)
        if not relevant_chunks:
            logger.warning(f"No pre-computed chunks found in Qdrant for paper {paper_id}. Falling back to dynamic chunking.")
            
            # Check if paper has content
            if not paper.content:
                logger.warning(f"Paper {paper_id} has no content to search")
                return {
                    "context": "Paper content not available",
                    "relevant_chunks": [],
                    "paper_metadata": {
                        "title": paper.title,
                        "authors": paper.authors,
                        "abstract": paper.abstract
                    },
                    "chunk_count": 0
                }
            
            # Chunk the paper content
            logger.info(f"Dynamically chunking paper {paper_id} for question: '{question[:50]}...'")
            chunks = chunk_text(paper.content, chunk_size=500, overlap=100)
            
            if not chunks:
                logger.warning(f"No chunks created dynamically for paper {paper_id}")
                return {
                    "context": "",
                    "relevant_chunks": [],
                    "paper_metadata": {
                        "title": paper.title,
                        "authors": paper.authors,
                        "abstract": paper.abstract
                    },
                    "chunk_count": 0
                }
                
            relevant_chunks = find_relevant_chunks(
                question=question,
                chunks=chunks,
                top_k=top_k,
                similarity_threshold=0.3
            )
            chunk_count = len(chunks)
            logger.info(f"Dynamically fetched {len(relevant_chunks)} relevant chunks out of {chunk_count} total chunks.")

        # Step 3: Format context string
        context_parts = []
        
        # Add paper metadata if requested
        if include_paper_metadata:
            context_parts.append(f"PAPER: {paper.title}")
            if paper.authors:
                authors_str = ", ".join(paper.authors)
                context_parts.append(f"AUTHORS: {authors_str}")
            if paper.abstract:
                context_parts.append(f"ABSTRACT: {paper.abstract}")
            context_parts.append("-" * 80)
        
        # Add relevant chunks with source labels
        context_parts.append("\nRELEVANT SECTIONS:")
        for i, (chunk, score) in enumerate(relevant_chunks, 1):
            confidence = f"(Relevance: {score:.0%})"
            context_parts.append(f"\n[Section {i}] {confidence}")
            context_parts.append(chunk)
            context_parts.append("-" * 40)
        
        # Combine all parts
        context = "\n".join(context_parts)
        
        logger.info(f"[+] Built context with {len(relevant_chunks)} chunks for AI")
        
        return {
            "context": context,
            "relevant_chunks": relevant_chunks,
            "paper_metadata": {
                "title": paper.title,
                "authors": paper.authors,
                "abstract": paper.abstract,
                "url": paper.url,
                "source": paper.source
            },
            "chunk_count": chunk_count
        }
        
    except Exception as e:
        logger.error(f"[-] Error building context: {str(e)}")
        raise


# FUNCTION 4: RANK PAPERS BY RELEVANCE
def rank_papers_by_relevance(
    query: str,
    source: Optional[str] = None,
    top_k: int = 10,
    min_similarity: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Rank papers by relevance to a search query using vector similarity search.
    
    Args:
        query: Search query (e.g., "deep learning neural networks")
        source: Filter by source (arxiv, semantic_scholar, etc) - optional
        top_k: Return top K papers (default 10)
        min_similarity: Min similarity score to include (0-1, default 0.5)
    
    Returns:
        List of dicts with:
        - "paper": ResearchPaper object
        - "relevance_score": Similarity score (0-1)
        - "title": Paper title
        - "authors": Paper authors
        - "source": Paper source
    
    Example:
        results = rank_papers_by_relevance(
            query="machine learning",
            top_k=5
        )
        # Returns: [
        #   {
        #     "paper": <Paper object>,
        #     "relevance_score": 0.92,
        #     "title": "Deep Learning Fundamentals",
        #     ...
        #   },
        #   ...
        # ]
    """
    try:
        logger.info(f"[+] Ranking papers for query: '{query}' using vector search")
        
        # Compute query embedding
        query_embedding = get_embedding(query)
        
        if query_embedding is None:
            logger.error("[-] Failed to compute query embedding")
            return []
        
        # Create filters for source if provided
        filters = None
        if source:
            filters = {
                "must": [
                    {"key": "source", "match": {"value": source}}
                ]
            }
        
        # Use vector search to find similar papers
        search_results = search_similar(
            query_embedding=query_embedding,
            top_k=top_k * 2,  # Get more results to filter by min_similarity
            filters=filters
        )
        
        if not search_results:
            logger.warning(f"[-] No similar papers found in vector search")
            return []
        
        # Convert results to expected format
        ranked_papers = []
        
        for result in search_results:
            try:
                payload = result["payload"]
                score = result["score"]
                
                # Filter by minimum similarity
                if score < min_similarity:
                    continue
                
                # Create ResearchPaper object from payload
                paper = ResearchPaper(
                    id=result["id"],
                    title=payload.get("title"),
                    authors=payload.get("authors", []),
                    abstract=payload.get("abstract"),
                    content=payload.get("content"),
                    url=payload.get("url"),
                    source=payload.get("source"),
                    published_date=payload.get("published_date"),
                    metadata=payload.get("metadata", {})
                )
                
                ranked_papers.append({
                    "paper": paper,
                    "relevance_score": score,
                    "title": paper.title,
                    "authors": paper.authors,
                    "source": paper.source,
                    "abstract": paper.abstract[:200] if paper.abstract else None
                })
                
            except Exception as e:
                logger.warning(f"[-] Error processing search result: {str(e)}")
                continue
        
        # Sort by relevance score (highest first) - should already be sorted by Qdrant
        ranked_papers.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        # Return top K
        top_papers = ranked_papers[:top_k]
        
        logger.info(f"[+] Ranked {len(top_papers)} papers (top {top_k}) with scores {min_similarity:.2f}+")
        
        return top_papers
        
    except Exception as e:
        logger.error(f"[-] Error ranking papers: {str(e)}")
        raise


