# Research Paper Search Engine

Integrated search engine supporting both local documents and research paper APIs.

## Features

### Integrated Research Paper APIs
- **ArXiv** - Free access to 2+ million physics, math, and computer science papers
- **Semantic Scholar** - Free API with citation analysis and author information
- **CrossRef** - Free access to 150+ million scholarly articles
- **Springer** - Premium access (requires API key)

### Local Document Search
- Full-text search of locally stored PDFs
- TF-IDF and keyword-based search
- Hybrid search combining multiple algorithms

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure API Keys
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

#### Free APIs (No Key Required)
- **ArXiv**: Completely free, no authentication needed
- **CrossRef**: Completely free, no authentication needed

#### Optional/Premium APIs
- **Semantic Scholar**: Free API available, but can register for API key at https://www.semanticscholar.org/product/api
- **Springer**: Requires API key from https://dev.springernature.com/

### 3. Run the Server
```bash
python main.py
```

The API will be available at `http://localhost:8001`

## API Endpoints

### Multi-Source Search
```
POST /research
```
Query: `query` (required), `max_results` (optional, default=5), `sources` (optional)
```bash
curl "http://localhost:8001/research?query=machine%20learning&max_results=10&sources=arxiv&sources=semantic_scholar"
```

### Individual Source Searches

#### ArXiv
```
GET /research/arxiv
```
Parameters: `q` (query), `max_results`, `sort_by`, `sort_order`
```bash
curl "http://localhost:8001/research/arxiv?q=neural%20networks&max_results=5"
```

#### Semantic Scholar
```
GET /research/semantic-scholar
```
Parameters: `q` (query), `max_results`
```bash
curl "http://localhost:8001/research/semantic-scholar?q=deep%20learning&max_results=5"
```

#### CrossRef
```
GET /research/crossref
```
Parameters: `q` (query), `max_results`
```bash
curl "http://localhost:8001/research/crossref?q=climate%20change&max_results=5"
```

#### Springer
```
GET /research/springer
```
Parameters: `q` (query), `max_results`
```bash
curl "http://localhost:8001/research/springer?q=quantum%20computing&max_results=5"
```

### Local Document Search
```
POST /search
```
Query: `query` (required), `limit` (optional, default=10), `type` (optional: tfidf, keyword, hybrid)

### Document Management
```
GET /documents
GET /documents/{doc_id}
GET /documents/{doc_id}/pdf
POST /rebuild-index
```

### System Health
```
GET /health
GET /stats
```

## Response Format

### Research Paper Search Response
```json
{
  "query": "machine learning",
  "results": {
    "arxiv": [
      {
        "source": "arXiv",
        "id": "2301.12345",
        "title": "Paper Title",
        "authors": ["Author 1", "Author 2"],
        "published": "2023-01-15T12:30:45Z",
        "summary": "Abstract text...",
        "pdf_url": "https://arxiv.org/pdf/2301.12345.pdf",
        "url": "https://arxiv.org/abs/2301.12345"
      }
    ],
    "semantic_scholar": [...],
    "crossref": [...]
  },
  "sources": ["arxiv", "semantic_scholar", "crossref"],
  "total_results": 15
}
```

## Example Usage

### Python
```python
import httpx
import asyncio

async def search_papers():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8001/research",
            params={
                "query": "transformer models",
                "max_results": 5,
                "sources": ["arxiv", "semantic_scholar"]
            }
        )
        return response.json()

# Run search
papers = asyncio.run(search_papers())
print(papers)
```

### JavaScript/Fetch
```javascript
async function searchPapers(query) {
    const params = new URLSearchParams({
        q: query,
        max_results: 10
    });
    
    const response = await fetch(
        `http://localhost:8001/research/arxiv?${params}`
    );
    return await response.json();
}

searchPapers('machine learning').then(papers => console.log(papers));
```

## Searching Tips

### ArXiv Search
- Use specific field codes: `ti:` (title), `au:` (author), `abs:` (abstract)
- Example: `ti:transformer abs:attention`
- Best for: Physics, Mathematics, Computer Science papers

### Semantic Scholar
- Supports natural language queries
- Returns citation counts and reference information
- Best for: General academic search with citations

### CrossRef
- Comprehensive coverage of scholarly publications
- Good for journal articles and conference papers
- Best for: Multidisciplinary search

### Springer
- Covers Springer journal and book content
- Requires API key
- Best for: Technical and scientific publications

## Rate Limits

- **ArXiv**: No official rate limit, but recommended ~3 requests per second
- **Semantic Scholar**: Varies by API key status
- **CrossRef**: No rate limit, but be respectful
- **Springer**: Depends on your subscription

## Troubleshooting

### No Results from ArXiv
- Check query syntax - use simple keywords
- ArXiv has indexed content from 1991 onwards
- Some older papers may not be fully searchable

### Springer Returns Empty
- Verify SPRINGER_API_KEY is set in .env
- Check API key is still valid at https://dev.springernature.com/
- Verify query format

### Timeout Errors
- Increase timeout in httpx calls
- Check internet connection
- Retry after a few seconds (respect rate limits)

## API Documentation

Full API documentation available at:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

## Performance

- ArXiv searches: ~1-3 seconds
- Semantic Scholar: ~2-4 seconds
- CrossRef: ~2-5 seconds
- Springer: ~2-4 seconds
- Multi-source parallel search: ~4-5 seconds

## License

This project uses free and open research APIs.
