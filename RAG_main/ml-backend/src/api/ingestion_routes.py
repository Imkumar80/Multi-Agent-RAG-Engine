from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from src.services.data_ingestion import ingest_paper
from src.utils.logger import logger

ingestion_router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

@ingestion_router.post("/paper")
async def ingest_paper_endpoint(
    paper_id: int,
    title: str,
    authors: List[str],
    abstract: str,
    content: str,
    url: str,
    source: str,
    published_date: Optional[str] = None,
):
    try:
        logger.info(f"API: Received ingestion request for paper {paper_id}: {title}")

        result = ingest_paper(
            paper_id=paper_id,
            title=title,
            authors=authors,
            abstract=abstract,
            content=content,
            url=url,
            source=source,
            published_date=published_date,
            metadata=None
        )

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))

        return {
            "message": "Paper successfully ingested into vector store",
            "paper_id": paper_id,
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API Error ingesting paper: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
