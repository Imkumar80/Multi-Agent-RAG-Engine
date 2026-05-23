# Quick Start Guide - Research Paper API Integration

## What Changed?

✅ **Removed**: Local `Docs/` folder with hardcoded PDFs  
✅ **Added**: Research paper API integration with ArXiv, Semantic Scholar, CrossRef, and Springer  
✅ **Added**: Comprehensive API documentation  
✅ **Updated**: Dependencies and configuration system  

## Getting Started (3 Steps)

### 1️⃣ Install Dependencies
```bash
cd ml-backend
pip install -r requirements.txt
```

### 2️⃣ Set Up API Keys (Optional)
```bash
# Copy config template
cp .env.example .env

# Edit .env and add your API keys if you have them
# (ArXiv and CrossRef work without keys!)
```

### 3️⃣ Start the Server
```bash
python main.py
```

Server will run at: **http://localhost:8001**

## Quick Examples

### Search ArXiv Papers
```bash
curl "http://localhost:8001/research/arxiv?q=neural%20networks&max_results=5"
```

### Search Semantic Scholar
```bash
curl "http://localhost:8001/research/semantic-scholar?q=transformer&max_results=5"
```

### Search All Sources
```bash
curl "http://localhost:8001/research?query=machine%20learning&max_results=5"
```

### View API Documentation
Open in browser: **http://localhost:8001/docs**

## Available APIs

| API | Free? | Key Required? | Coverage | Link |
|-----|-------|---------------|----------|------|
| **ArXiv** | ✅ Yes | ❌ No | Physics, Math, CS | https://arxiv.org |
| **Semantic Scholar** | ✅ Yes | ℹ️ Optional | General Academic | https://www.semanticscholar.org/product/api |
| **CrossRef** | ✅ Yes | ❌ No | 150M+ Articles | https://www.crossref.org/services/metadata-retrieval/ |
| **Springer** | ❌ No | ✅ Yes | Springer Content | https://dev.springernature.com/ |

## API Endpoints

```
🔍 SEARCH
  POST   /research
  GET    /research/arxiv
  GET    /research/semantic-scholar
  GET    /research/crossref
  GET    /research/springer

📄 LOCAL DOCUMENTS (Still supported)
  POST   /search
  GET    /documents
  GET    /documents/{id}
  GET    /documents/{id}/pdf

🏥 SYSTEM
  GET    /health
  GET    /stats
  POST   /rebuild-index
```

## File Structure
```
ml-backend/
├── src/
│   ├── api.py                      # Main API (UPDATED)
│   ├── research_paper_api.py        # NEW: Research APIs
│   ├── search_engine.py             # UPDATED: Flexible paths
│   ├── models.py
│   ├── document_processor.py
│   └── indexer.py
├── data/                           # Local cached data
├── main.py                         # Entry point (UPDATED)
├── requirements.txt                # Dependencies (UPDATED)
├── .env.example                    # API Key template (NEW)
├── RESEARCH_API_README.md          # Full documentation (NEW)
└── INTEGRATION_SUMMARY.md          # Change summary (NEW)
```

## API Response Example
```json
{
  "query": "machine learning",
  "source": "arXiv",
  "results": [
    {
      "source": "arXiv",
      "id": "2301.12345",
      "title": "Paper Title",
      "authors": ["Author 1", "Author 2"],
      "summary": "Abstract...",
      "pdf_url": "https://arxiv.org/pdf/2301.12345.pdf",
      "published": "2023-01-15"
    }
  ],
  "total_results": 1
}
```

## Common Issues & Fixes

### Q: "No results from ArXiv"
**A:** Try simpler keywords. Check: https://arxiv.org/help/prep for syntax

### Q: "Springer returns empty"
**A:** Make sure SPRINGER_API_KEY is set in .env. Get one at https://dev.springernature.com/

### Q: "Connection timeout"
**A:** Check internet connection. APIs have rate limits - wait a few seconds before retry

### Q: Can I still search local PDFs?
**A:** Yes! Use `/search` endpoint. Put PDFs in `data/extracted_text/`

## Environment Variables
```bash
# .env file
SEMANTIC_SCHOLAR_API_KEY=      # Optional
SPRINGER_API_KEY=              # Optional (Springer only)
SCOPUS_API_KEY=                # Optional (future)
LOG_LEVEL=INFO
DOCS_PATH=data/extracted_text
```

## Next Integration Steps

For frontend integration:
1. Add research search to UI
2. Show results from multiple sources
3. Add filter by source (ArXiv, Semantic Scholar, etc)
4. Add sort options (relevance, date, citations)

## Performance Notes
- Multi-source search: ~4-5 seconds
- Single source: ~2-3 seconds
- Cached results available via `/stats`

## Need Help?
- Full docs: See `RESEARCH_API_README.md`
- API specs: Visit http://localhost:8001/docs
- Changes made: See `INTEGRATION_SUMMARY.md`

---
**Status**: ✅ Ready to use. No API keys required to start!
