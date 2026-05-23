"""
Research Paper API Integration Module

Integrates with various research paper databases:
- ArXiv API (free, no key needed)
- Semantic Scholar API (free, optional key)
- CrossRef API (free, no key needed)
- Springer API (requires API key)
"""

import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class ResearchPaperAPI:
    """Base class for research paper API integrations."""
    
    def __init__(self):
        self.arxiv_base_url = "https://export.arxiv.org/api/query"
        self.semantic_scholar_base_url = "https://api.semanticscholar.org/graph/v1"
        self.crossref_base_url = "https://api.crossref.org/v1"
        self.springer_base_url = "https://api.springer.com/metadata/json"
        
        # API Keys from environment variables
        self.semantic_scholar_api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
        self.springer_api_key = os.getenv("SPRINGER_API_KEY")
        self.scopus_api_key = os.getenv("SCOPUS_API_KEY")
        
    async def search_arxiv(
        self,
        query: str,
        max_results: int = 10,
        sort_by: str = "relevance",
        sort_order: str = "descending"
    ) -> List[Dict]:
        """
        Search ArXiv for research papers.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            sort_by: 'relevance' or 'lastUpdatedDate' or 'submittedDate'
            sort_order: 'ascending' or 'descending'
            
        Returns:
            List of paper metadata
        """
        try:
            params = {
                "search_query": f"all:{query}",
                "start": 0,
                "max_results": max_results,
                "sortBy": sort_by,
                "sortOrder": sort_order,
            }
            
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(
                    self.arxiv_base_url,
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()
                
            # Parse XML response
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.content)
            
            papers = []
            namespace = {
                'atom': 'http://www.w3.org/2005/Atom',
                'arxiv': 'http://arxiv.org/schemas/atom'
            }
            
            for entry in root.findall('atom:entry', namespace):
                paper = {
                    'source': 'arXiv',
                    'id': entry.find('atom:id', namespace).text.split('/abs/')[-1],
                    'title': entry.find('atom:title', namespace).text.strip(),
                    'authors': [
                        author.find('atom:name', namespace).text
                        for author in entry.findall('atom:author', namespace)
                    ],
                    'published': entry.find('atom:published', namespace).text,
                    'summary': entry.find('atom:summary', namespace).text.strip(),
                    'url': entry.find('atom:id', namespace).text.replace('abs', 'pdf') + '.pdf',
                    'pdf_url': entry.find('atom:id', namespace).text.replace('abs', 'pdf') + '.pdf',
                }
                papers.append(paper)
            
            logger.info(f"Found {len(papers)} papers from arXiv")
            return papers
            
        except Exception as e:
            logger.error(f"Error searching arXiv: {str(e)}")
            return []
    
    async def search_semantic_scholar(
        self,
        query: str,
        max_results: int = 10,
        fields: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Search Semantic Scholar for research papers.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            fields: Additional fields to return
            
        Returns:
            List of paper metadata
        """
        try:
            if fields is None:
                fields = [
                    "paperId", "title", "authors", "year", "abstract",
                    "citationCount", "url", "openAccessPdf"
                ]
            
            params = {
                "query": query,
                "limit": max_results,
                "fields": ",".join(fields)
            }
            
            headers = {}
            if self.semantic_scholar_api_key:
                headers["x-api-key"] = self.semantic_scholar_api_key
            
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(
                    f"{self.semantic_scholar_base_url}/paper/search",
                    params=params,
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
            
            data = response.json()
            papers = []
            
            for paper in data.get('data', []):
                paper_info = {
                    'source': 'Semantic Scholar',
                    'id': paper.get('paperId'),
                    'title': paper.get('title'),
                    'authors': [
                        author.get('name') for author in paper.get('authors', [])
                    ],
                    'year': paper.get('year'),
                    'abstract': paper.get('abstract'),
                    'citation_count': paper.get('citationCount', 0),
                    'url': paper.get('url'),
                    'pdf_url': paper.get('openAccessPdf', {}).get('url') if paper.get('openAccessPdf') else None,
                }
                papers.append(paper_info)
            
            logger.info(f"Found {len(papers)} papers from Semantic Scholar")
            return papers
            
        except Exception as e:
            logger.error(f"Error searching Semantic Scholar: {str(e)}")
            return []
    
    async def search_crossref(
        self,
        query: str,
        max_results: int = 10,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Search CrossRef for research papers.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            filters: Optional filters (e.g., published dates, types)
            
        Returns:
            List of paper metadata
        """
        try:
            params = {
                "query": query,
                "rows": max_results,
                "select": "title,author,published-online,DOI,abstract,URL"
            }
            
            if filters:
                params.update(filters)
            
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(
                    self.crossref_base_url + "/works",
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()
            
            data = response.json()
            papers = []
            
            for item in data.get('message', {}).get('items', []):
                paper_info = {
                    'source': 'CrossRef',
                    'id': item.get('DOI'),
                    'title': item.get('title', [''])[0] if item.get('title') else '',
                    'authors': [
                        f"{author.get('given', '')} {author.get('family', '')}".strip()
                        for author in item.get('author', [])
                    ],
                    'published': item.get('published-online', {}).get('date-parts', [[None]])[0][0],
                    'abstract': item.get('abstract'),
                    'url': item.get('URL'),
                    'doi': item.get('DOI'),
                }
                papers.append(paper_info)
            
            logger.info(f"Found {len(papers)} papers from CrossRef")
            return papers
            
        except Exception as e:
            logger.error(f"Error searching CrossRef: {str(e)}")
            return []
    
    async def search_springer(
        self,
        query: str,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Search Springer API for research papers.
        Requires SPRINGER_API_KEY environment variable.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of paper metadata
        """
        if not self.springer_api_key:
            logger.warning("Springer API key not found. Set SPRINGER_API_KEY environment variable.")
            return []
        
        try:
            params = {
                "query": query,
                "api_key": self.springer_api_key,
                "p": max_results,
            }
            
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(
                    self.springer_base_url,
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()
            
            data = response.json()
            papers = []
            
            for record in data.get('records', []):
                paper_info = {
                    'source': 'Springer',
                    'id': record.get('doi'),
                    'title': record.get('title'),
                    'authors': [
                        author.get('name') for author in record.get('creators', [])
                    ],
                    'published': record.get('publicationDate'),
                    'abstract': record.get('abstract'),
                    'url': record.get('url')[0] if record.get('url') else None,
                    'doi': record.get('doi'),
                }
                papers.append(paper_info)
            
            logger.info(f"Found {len(papers)} papers from Springer")
            return papers
            
        except Exception as e:
            logger.error(f"Error searching Springer: {str(e)}")
            return []
    
    async def search_all(
        self,
        query: str,
        max_results_per_source: int = 5,
        sources: Optional[List[str]] = None
    ) -> Dict[str, List[Dict]]:
        """
        Search across multiple paper sources simultaneously.
        
        Args:
            query: Search query
            max_results_per_source: Max results from each source
            sources: List of sources to search ('arxiv', 'semantic_scholar', 'crossref', 'springer')
            
        Returns:
            Dictionary with results from each source
        """
        if sources is None:
            sources = ['arxiv', 'semantic_scholar', 'crossref']
        
        results = {}
        
        if 'arxiv' in sources:
            results['arxiv'] = await self.search_arxiv(query, max_results_per_source)
        
        if 'semantic_scholar' in sources:
            results['semantic_scholar'] = await self.search_semantic_scholar(query, max_results_per_source)
        
        if 'crossref' in sources:
            results['crossref'] = await self.search_crossref(query, max_results_per_source)
        
        if 'springer' in sources:
            results['springer'] = await self.search_springer(query, max_results_per_source)
        
        return results


# Singleton instance
_research_paper_api = None

def get_research_paper_api() -> ResearchPaperAPI:
    """Get the research paper API singleton."""
    global _research_paper_api
    if _research_paper_api is None:
        _research_paper_api = ResearchPaperAPI()
    return _research_paper_api
