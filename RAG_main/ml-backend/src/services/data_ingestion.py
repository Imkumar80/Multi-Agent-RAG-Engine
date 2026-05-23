from typing import Optional, Dict, Any, List
from datetime import datetime

from src.services.document_processor import (
    chunk_document,
    extract_metadata,
)
from src.services.embeddings import get_embedding
from src.services.vector_store import store_paper_embedding
from src.utils.logger import logger


def ingest_paper(
    paper_id: int,
    title: str,
    authors: List[str],
    abstract: str,
    content: str,
    url: str,
    source: str,
    published_date: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    try:
        logger.info(f"[START] Ingesting paper {paper_id}: {title[:50]}...")

        # STEP 1: Process and Chunk
        chunks = chunk_document(
            text=content,
            chunk_size=1000,
            chunk_overlap=200,
            strategy="semantic"
        )
        logger.info(f"  [SUCCESS] {len(chunks)} chunks created.")

        paper_metadata = extract_metadata(content)

        # STEP 2: Embed and Store Chunks
        stored_chunks_count = 0
        for i, chunk in enumerate(chunks):
            chunk_embedding = get_embedding(chunk.text)
            
            chunk_metadata = {
                "paper_id": paper_id,
                "title": title,
                "type": "paper_chunk",
                "chunk_index": i,
                "text": chunk.text,
                "token_count": chunk.token_count
            }
            
            success = store_paper_embedding(
                paper_id=f"{paper_id}_chunk_{i}",
                embedding=chunk_embedding,
                metadata=chunk_metadata
            )
            if success:
                stored_chunks_count += 1

        logger.info(f"  [SUCCESS] {stored_chunks_count} embeddings stored in Vector DB.")

        # Return success with basic details
        return {
            "success": True,
            "paper_id": paper_id,
            "chunks_created": len(chunks),
            "chunks_stored": stored_chunks_count,
            "metadata_extracted": {
                "keywords": getattr(paper_metadata, "keywords", []),
                "summary": getattr(paper_metadata, "summary", "")[:100] + "..." if getattr(paper_metadata, "summary", "") else "",
                "extracted_entities": getattr(paper_metadata, "extracted_entities", {})
            },
            "embedding_status": "success",
            "db_status": "bypassed" # Legacy
        }

    except Exception as e:
        logger.error(f"[FAILED] Ingestion failed for paper {paper_id}: {str(e)}")
        return {
            "success": False,
            "paper_id": paper_id,
            "error": str(e)
        }
