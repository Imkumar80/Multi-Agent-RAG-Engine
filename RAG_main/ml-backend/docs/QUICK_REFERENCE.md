# Quick Reference Guide

## API Endpoints Summary

### 🔍 Search Papers (External APIs)
```
GET /research/arxiv?query=deep%20learning
GET /research/semantic-scholar?query=deep%20learning
GET /research/crossref?query=deep%20learning
GET /research/springer?query=deep%20learning
POST /research/search
```
**Returns:** Papers from external sources (NOT from Qdrant)

---

### 📌 Select Paper (Add to Qdrant)
```
POST /research/select
Body: {
  "title": "...",
  "authors": [...],
  "abstract": "...",
  "url": "...",
  "source": "arxiv|semantic_scholar|crossref|springer",
  "content": "..." (optional),
  "published_date": "..." (optional)
}
```
**Returns:** Paper added to Qdrant with ID

---

### 💬 Chat Endpoints (Uses Qdrant)
```
POST /chat/sessions
Body: {
  "user_id": "user123",
  "paper_id": 1,
  "session_title": "Discussing Deep Learning"
}

POST /chat/messages
Body: {
  "session_id": 101,
  "content": "What is the tech stack?",
  "metadata": {}
}

GET /chat/sessions/{session_id}/messages?limit=50&offset=0
GET /chat/sessions/{session_id}
```
**Uses:** Qdrant to search paper content and generate context

---

### 🎓 Analysis Endpoints (Uses Qdrant + OpenAI)
```
GET /research/{paper_id}/analyze
GET /research/{paper_id}/tech-stack
GET /research/{paper_id}/future-scope
GET /research/{paper_id}/research-depth
POST /research/{paper_id}/ask?question=...
```
**Returns:** AI-generated analysis using paper from Qdrant

---

### ❤️ Health Check
```
GET /health
```
**Returns:** API status

---

## Data Flow

```
┌─────────────────────────────────────────────┐
│ STEP 1: User Searches Papers                │
│ GET /research/arxiv?query=...               │
│                                             │
│ External API ← ArXiv, Semantic Scholar, etc │
│ Qdrant: NOT USED (empty)                    │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│ STEP 2: User Selects One Paper              │
│ POST /research/select                       │
│ Body: {title, authors, abstract, url, ...} │
│                                             │
│ Qdrant: STORES paper with embedding ✅     │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│ STEP 3: User Creates Chat Session           │
│ POST /chat/sessions                         │
│ Body: {user_id, paper_id, session_title}   │
│                                             │
│ Qdrant: VERIFIES paper exists ✅            │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│ STEP 4: User Asks Question in Chat          │
│ POST /chat/messages                         │
│ Body: {session_id, content, metadata}      │
│                                             │
│ Qdrant: SEARCHES for similar chunks ✅      │
│ OpenAI: GENERATES answer with context ✅    │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│ STEP 5: User Analyzes Paper                 │
│ GET /research/{paper_id}/analyze            │
│ GET /research/{paper_id}/tech-stack         │
│ GET /research/{paper_id}/future-scope       │
│                                             │
│ Qdrant: PROVIDES paper content ✅           │
│ OpenAI: GENERATES analysis ✅               │
└─────────────────────────────────────────────┘
```

---

## Key Differences: What Changed

| Before ❌ | After ✅ |
|-----------|----------|
| `/research/arxiv` searched Qdrant (empty) | `/research/arxiv` searches ArXiv API |
| Returned empty results `[]` | Returns papers from external source |
| User confused, nothing in Qdrant | User sees papers from web |
| Qdrant used immediately | Qdrant used AFTER selection |

---

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-proj-...
QDRANT_URL=https://...
QDRANT_API_KEY=eyJ...
QDRANT_COLLECTION=resonav-papers

# Optional
SEMANTIC_SCHOLAR_API_KEY=...
SPRINGER_API_KEY=...
SCOPUS_API_KEY=...

# Server
ENVIRONMENT=development
LOG_LEVEL=INFO
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

---

## Status Code Reference

| Code | Meaning |
|------|---------|
| 200 | ✅ Success |
| 400 | ❌ Bad request |
| 404 | ❌ Not found |
| 500 | ❌ Server error |

---

## Example Test Sequence

### 1. Check Health
```bash
curl http://localhost:8001/health
```
Response:
```json
{"status": "healthy", "message": "API is running"}
```

### 2. Search ArXiv
```bash
curl "http://localhost:8001/api/research/arxiv?query=deep%20learning&limit=5"
```
Response:
```json
{
  "papers": [
    {"title": "...", "authors": [...], "abstract": "...", "url": "..."},
    ...
  ],
  "total": 5,
  "source": "arxiv",
  "message": "Select a paper with /research/select to add to your library"
}
```

### 3. Select Paper
```bash
curl -X POST http://localhost:8001/api/research/select \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Attention is All You Need",
    "authors": ["Ashish Vaswani"],
    "abstract": "...",
    "url": "https://arxiv.org/abs/...",
    "source": "arxiv",
    "published_date": "2017-06-12"
  }'
```
Response:
```json
{
  "status": "success",
  "message": "Paper 'Attention is All You Need' added to your library",
  "paper_id": 1,
  "title": "Attention is All You Need",
  "source": "arxiv",
  "next_step": "Create a chat session or analyze the paper"
}
```

### 4. Create Chat Session
```bash
curl -X POST http://localhost:8001/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "paper_id": 1,
    "session_title": "Discussing Deep Learning"
  }'
```
Response:
```json
{
  "id": 101,
  "paper_id": 1,
  "title": "Discussing Deep Learning",
  "created_at": "2026-01-10T17:00:00Z"
}
```

### 5. Chat Message
```bash
curl -X POST http://localhost:8001/api/chat/messages \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 101,
    "content": "What is the main contribution?",
    "metadata": {}
  }'
```
Response:
```json
{
  "id": 501,
  "session_id": 101,
  "role": "user",
  "content": "What is the main contribution?",
  "created_at": "2026-01-10T17:05:00Z"
}
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `ARCHITECTURE_FLOW.md` | Complete system architecture |
| `VERIFICATION_CHECKLIST.md` | Verification checklist |
| `FINAL_CHANGES_SUMMARY.md` | Summary of all changes |
| `QUICK_REFERENCE.md` | This file |

---

## Troubleshooting

### "Paper not found in Qdrant"
**Cause:** Trying to chat about a paper that wasn't selected via `/research/select`
**Fix:** Select paper first using `/research/select` endpoint

### "Empty search results"
**Cause:** Searching in Qdrant instead of external APIs
**Fix:** Use correct endpoint: `/research/arxiv`, not `/research/search` directly

### "Unicode encode error"
**Cause:** Emoji logging on Windows
**Fix:** Already fixed! All emojis → text labels

### Server won't start
**Cause:** Missing environment variables
**Fix:** Check `.env` file has OPENAI_API_KEY and QDRANT credentials

---

## Version Info

- **FastAPI:** 0.119.0
- **Qdrant:** Cloud (managed service)
- **Embeddings:** all-MiniLM-L6-v2 (384 dimensions)
- **LLM:** OpenAI gpt-3.5-turbo
- **Database:** Qdrant Cloud (no PostgreSQL)

---

**Ready to go! 🚀**
