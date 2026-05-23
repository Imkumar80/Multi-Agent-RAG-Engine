# ML Backend - AI-Powered Document Search Engine

## 🛠️ Quick Start - Basic (Phase 1 - paper search)

### Prerequisites
- Python 3.8+
- PDF documents in the `Docs/` directory

### 1. Installation

```bash
cd ml-backend
pip install -r requirements.txt
```

### 2. Verify Setup

```bash
# Test the search engine core functionality
python test_search.py
```

### 3. Start the Server

```bash
# Start the FastAPI server
python main.py
```

The API will be available at: **http://localhost:8001**

### 4. Test API Endpoints

```bash
# Test with the server running
python test_search.py --api

# Or test individual endpoints
curl http://localhost:8001/health
curl "http://localhost:8001/search?q=deep learning&limit=5"
```

## 📖 API Documentation

Once running, access the interactive documentation:
- **Swagger UI**: http://localhost:8001/docs

## 🔌 API Endpoints

### Core Endpoints

#### Health Check
```http
GET /health
```
Response:
```json
{
  "status": "healthy",
  "search_engine_initialized": true,
  "total_documents": 12
}
```

#### Search Documents
```http
GET /search?q={query}&limit={limit}&type={type}
POST /search (with JSON body)
```

Parameters:
- `q`: Search query (required)
- `limit`: Maximum results (default: 10)
- `type`: Search type - `tfidf`, `keyword`, or `hybrid` (default: `tfidf`)

Example:
```bash
curl "http://localhost:8001/search?q=machine%20learning&type=hybrid&limit=5"
```

## 🚀 Usage Examples

### Basic Search
```bash
# Search for deep learning papers
curl "http://localhost:8001/search?q=deep%20learning&limit=3"

# Hybrid search for machine learning
curl "http://localhost:8001/search?q=machine%20learning&type=hybrid&limit=5"

# Keyword search for specific terms
curl "http://localhost:8001/search?q=economic%20growth&type=keyword&limit=3"
```

### Frontend Integration
The backend is designed to work with the React frontend:
- **Frontend URL**: http://localhost:5173/search
- **CORS Enabled**: Ready for cross-origin requests
- **JSON API**: Structured responses for easy frontend consumption

### Programmatic Usage
```python
import requests

# Search for documents
response = requests.get("http://localhost:8001/search",
                       params={"q": "deep learning", "type": "tfidf", "limit": 5})
results = response.json()

print(f"Found {results['total_results']} results")
for result in results['results']:
    print(f"- {result['document']['title']} (Score: {result['score']:.3f})")
```

## 🔧 Development

### Project Structure Deep Dive

#### Core Components
- **`search_engine.py`**: Main SearchEngine class coordinating all operations
- **`document_processor.py`**: Handles PDF text extraction and caching
- **`indexer.py`**: Implements TF-IDF indexing and similarity search
- **`api.py`**: FastAPI routes and request handling
- **`models.py`**: Pydantic models for type safety

#### Data Flow
1. **Document Ingestion**: PDFs → Text Extraction → Cleaning → Caching
2. **Index Building**: Tokenization → TF-IDF Calculation → Persistence
3. **Search Processing**: Query → Tokenization → Similarity Scoring → Results


**Ready to search! 🚀**

Start the server with `python main.py` and visit http://localhost:8001/docs for interactive API documentation.

