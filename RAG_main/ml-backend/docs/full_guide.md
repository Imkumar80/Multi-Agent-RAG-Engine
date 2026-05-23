FLOW 1: User Searches Papers
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND sends: GET /api/papers/search?query=machine+learning│
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓
         ┌─────────────────────────────┐
         │ routes.py (API entry point) │
         │ @app.get("/papers/search")  │
         └────────────┬────────────────┘
                      │
                      ↓
    ┌─────────────────────────────────────────┐
    │ research_paper_api.py                   │
    │ (KEEPS PAPERS FROM APIs)                │
    ├─────────────────────────────────────────┤
    │ search_arxiv("machine learning")        │
    │  Returns: [paper1, paper2, ...]        │
    │           with title, abstract, authors │
    │                                         │
    │ search_semantic_scholar(...)            │
    │ search_crossref(...)                    │
    │ search_springer(...)                    │
    │                                         │
    │ Combines all: [paper1-15]              │
    └────────────┬────────────────────────────┘
                 │ (Raw papers from APIs)
                 ↓
    ┌──────────────────────────────────────────┐
    │ paper_service.py                         │
    │ (PROCESS & STORE PAPERS)                 │
    ├──────────────────────────────────────────┤
    │ For each paper:                          │
    │                                          │
    │ Step 1: Get abstract/content             │
    │         abstract = "This paper..."       │
    │                                          │
    │ Step 2: Call embeddings.py               │
    │         embedding = embed(abstract)      │
    │                                          │
    │ Step 3: Save to database                 │
    │         database.save_paper(             │
    │           title=...,                     │
    │           abstract=...,                  │
    │           embedding=[...]  ← Vector!     │
    │         )                                │
    │                                          │
    │ Returns: [paper1-15 with IDs]           │
    └────────────┬─────────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────────┐
    │ database.py (PostgreSQL)                 │
    │                                          │
    │ research_papers table:                   │
    │ ├─ id | title | abstract | embedding    │
    │ ├─ 1  | "ML"  | "This..." | [0.23...]  │
    │ ├─ 2  | "DL"  | "Deep..." | [0.45...]  │
    │ └─ ...                                   │
    └────────────┬─────────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────────┐
    │ routes.py                                │
    │ Return to frontend:                      │
    │ {                                        │
    │   "papers": [                            │
    │     {                                    │
    │       "id": 1,                           │
    │       "title": "Machine Learning",       │
    │       "authors": [...],                  │
    │       "url": "..."                       │
    │     }, ...                               │
    │   ]                                      │
    │ }                                        │
    └────────────┬─────────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────────┐
    │ FRONTEND displays papers list            │
    └──────────────────────────────────────────┘

    FLOW 2: User Creates Chat Session with a Paper
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND sends: POST /api/chat/sessions                     │
│ Body: { user_id: "user_123", paper_id: 1 }                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
         ┌─────────────────────────────┐
         │ routes.py                   │
         │ @app.post("/chat/sessions") │
         └────────────┬────────────────┘
                      │
                      ↓
    ┌─────────────────────────────────────────┐
    │ chat_service.py                         │
    │ (CREATE CHAT SESSION)                   │
    ├─────────────────────────────────────────┤
    │ 1. Generate unique session_id            │
    │    session_id = "chat_sess_abc123"      │
    │                                         │
    │ 2. Save to database                     │
    │    database.create_session(              │
    │      session_id=...,                    │
    │      user_id=...,                       │
    │      paper_id=...                       │
    │    )                                    │
    │                                         │
    │ 3. Return session info                  │
    └────────────┬────────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────────┐
    │ database.py (PostgreSQL)                 │
    │                                          │
    │ chat_sessions table:                     │
    │ ├─ session_id | user_id | paper_id      │
    │ ├─ "sess_123" | "user_1"| 1             │
    │ └─ ...                                   │
    └──────────────────────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────────┐
    │ routes.py returns:                       │
    │ {                                        │
    │   "session_id": "chat_sess_abc123",     │
    │   "paper_id": 1,                         │
    │   "status": "ready"                      │
    │ }                                        │
    └────────────┬─────────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────────┐
    │ FRONTEND opens chat interface            │
    │ (Chat on left, paper on right)           │
    └──────────────────────────────────────────┘
    FLOW 3: User Asks Question in Chat
        ┌────────────────────────────────────────────────────────────┐
    │ FRONTEND sends: POST /api/chat/message                     │
    │ Body: {                                                    │
    │   session_id: "chat_sess_abc123",                         │
    │   paper_id: 1,                                            │
    │   message: "What tech stack is used?"                     │
    │ }                                                          │
    └──────────────────────┬─────────────────────────────────────┘
                           │
                           ↓
             ┌─────────────────────────────┐
             │ routes.py                   │
             │ @app.post("/chat/message")  │
             └────────────┬────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────────┐
        │ chat_service.py                         │
        │ (MANAGE CHAT)                           │
        ├─────────────────────────────────────────┤
        │ Step 1: Save user message to DB         │
        │         database.save_message(          │
        │           session_id=...,               │
        │           role="user",                  │
        │           content="What tech stack..."  │
        │         )                               │
        │                                         │
        │ Step 2: Call rag_service.py             │
        │         response = rag_service.         │
        │           generate_response(            │
        │             question=...,               │
        │             paper_id=...                │
        │           )                             │
        └────────────┬────────────────────────────┘
                     │
                     ↓
        ┌──────────────────────────────────────────┐
        │ rag_service.py (THE MAGIC HAPPENS HERE)  │
        │ (RETRIEVAL AUGMENTED GENERATION)         │
        ├──────────────────────────────────────────┤
        │                                          │
        │ INPUT: Question = "What tech stack?"    │
        │        Paper ID = 1                     │
        │                                          │
        │ STEP 1: Convert question to vector      │
        │         ────────────────────────────    │
        │         Call embeddings.py:             │
        │                                          │
        │         question_vector =                │
        │           embeddings.get_embedding(     │
        │             "What tech stack?"          │
        │           )                             │
        │         Result: [0.234, 0.567, ...]    │
        │                                          │
        │ STEP 2: Search paper chunks in DB       │
        │         ────────────────────────────    │
        │         Call database:                  │
        │                                          │
        │         similar_chunks =                 │
        │           database.search_chunks(       │
        │             vector=question_vector,     │
        │             paper_id=1,                 │
        │             limit=3  (top 3 chunks)    │
        │           )                             │
        │                                          │
        │         Returns:                         │
        │         [                                │
        │           {                              │
        │             "chunk": "Architecture:     │
        │              We use PyTorch 2.0,        │
        │              CUDA, Python 3.10...",    │
        │             "similarity": 0.95          │
        │           },                            │
        │           {                              │
        │             "chunk": "Implementation:   │
        │              Built with PyTorch 2.0,   │
        │              HuggingFace...",          │
        │             "similarity": 0.92          │
        │           },                            │
        │           ...                           │
        │         ]                                │
        │                                          │
        │ STEP 3: Build LLM prompt                │
        │         ────────────────────────────    │
        │         prompt = f"""                   │
        │         Based on this paper, answer     │
        │         the question.                   │
        │                                          │
        │         QUESTION: What tech stack?     │
        │                                          │
        │         RELEVANT SECTIONS FROM PAPER:   │
        │         1. Architecture: We use         │
        │            PyTorch 2.0, CUDA, Python   │
        │            3.10, HuggingFace...        │
        │                                          │
        │         2. Implementation: Built        │
        │            with PyTorch 2.0, CUDA...   │
        │                                          │
        │         ANSWER:                          │
        │         """                              │
        │                                          │
        │ STEP 4: Send to OpenAI/LLM              │
        │         ────────────────────────────    │
        │         response = openai.ChatCompletion│
        │           .create(                      │
        │             model="gpt-3.5-turbo",     │
        │             messages=[                  │
        │               {                          │
        │                 "role": "user",         │
        │                 "content": prompt       │
        │               }                          │
        │             ]                           │
        │           )                             │
        │                                          │
        │         Result: "Based on the paper,   │
        │         the tech stack includes:       │
        │         - PyTorch 2.0                  │
        │         - CUDA                          │
        │         - Python 3.10                  │
        │         - HuggingFace Transformers"   │
        │                                          │
        │ STEP 5: Return answer + sources        │
        │         ────────────────────────────   │
        │         return {                        │
        │           "response": "Based on...",   │
        │           "sources": [                 │
        │             chunk1, chunk2, ...        │
        │           ]                            │
        │         }                              │
        └────────────┬──────────────────────────┘
                     │ (Response with answer + sources)
                     ↓
        ┌─────────────────────────────────────────┐
        │ chat_service.py                         │
        │ (SAVE RESPONSE)                         │
        ├─────────────────────────────────────────┤
        │ Save assistant response to DB:          │
        │                                         │
        │ database.save_message(                  │
        │   session_id=...,                       │
        │   role="assistant",                     │
        │   content=response,                     │
        │   sources=[...]                         │
        │ )                                       │
        └────────────┬────────────────────────────┘
                     │
                     ↓
        ┌─────────────────────────────────────────┐
        │ database.py (PostgreSQL)                │
        │                                         │
        │ chat_messages table:                    │
        │ ├─ msg_id | session_id | role | content
        │ ├─ 1     | "sess_123"  | user | "What..
        │ ├─ 2     | "sess_123"  | asst | "Based
        │ └─ ...                                  │
        └─────────────────────────────────────────┘
                     │
                     ↓
        ┌─────────────────────────────────────────┐
        │ routes.py returns:                      │
        │ {                                       │
        │   "response": "Based on the paper,    │
        │      the tech stack includes...",      │
        │   "sources": [                          │
        │     {                                   │
        │       "chunk": "Architecture: We...",  │
        │       "similarity": 0.95                │
        │     },                                  │
        │     ...                                 │
        │   ],                                    │
        │   "session_id": "chat_sess_abc123"     │
        │ }                                       │
        └────────────┬────────────────────────────┘
                     │
                     ↓
        ┌─────────────────────────────────────────┐
        │ FRONTEND displays:                      │
        │                                         │
        │ LEFT (Chat):                            │
        │ User: "What tech stack?"               │
        │ Assistant: "Based on the paper,       │
        │            the tech stack includes..."│
        │ [Source 1] [Source 2]                  │
        │                                         │
        │ RIGHT (Paper):                          │
        │ Paper PDF/text with highlighted        │
        │ sections from sources                  │
        └─────────────────────────────────────────┘

      2. DEPENDENCY CHAIN
              Who calls whom:
        
        routes.py (MAIN ENTRY POINT)
          ├─ calls: research_paper_api.search_all()
          │          └─ Returns: raw papers from APIs
          │
          ├─ calls: paper_service.save_papers(papers)
          │          ├─ calls: embeddings.get_embedding(abstract)
          │          │          └─ Returns: vector [0.234, ...]
          │          └─ calls: database.save_paper(paper + embedding)
          │                     └─ Stores in PostgreSQL
          │
          ├─ calls: chat_service.create_session(user_id, paper_id)
          │          └─ calls: database.save_session(...)
          │                     └─ Stores in PostgreSQL
          │
          └─ calls: chat_service.send_message(session_id, message)
                     ├─ calls: database.save_message(...) [user msg]
                     │
                     ├─ calls: rag_service.generate_response(question, paper_id)
                     │          ├─ calls: embeddings.get_embedding(question)
                     │          │          └─ Returns: question_vector
                     │          │
                     │          ├─ calls: database.search_chunks(
                     │          │            vector, paper_id)
                     │          │          └─ Returns: relevant chunks
                     │          │
                     │          ├─ builds prompt with chunks
                     │          │
                     │          └─ calls: OpenAI API
                     │                     └─ Returns: answer
                     │
                     └─ calls: database.save_message(...) [asst response]
                                └─ Stores in PostgreSQL  

3.DATABASE SCHEMA OVERVIEW
PostgreSQL Tables:

TABLE: research_papers
├─ id (PK)
├─ source (arxiv, semantic_scholar, etc)
├─ title
├─ authors (JSON array)
├─ abstract
├─ content (full text)
├─ chunks (text split into sections)
├─ url
├─ pdf_url
├─ doi
├─ embedding (pgvector - 384 dimensions)
├─ published_date
├─ citation_count
└─ created_at

TABLE: chat_sessions
├─ session_id (PK)
├─ user_id (FK)
├─ paper_id (FK to research_papers)
├─ created_at
└─ updated_at

TABLE: chat_messages
├─ message_id (PK)
├─ session_id (FK to chat_sessions)
├─ role (user/assistant)
├─ content (message text)
├─ sources (JSON - referenced chunks)
└─ timestamp

4. API ENDPOINTS OVERVIEW
PAPER SEARCH:
  GET /api/papers/search?query=...
  └─ Returns: List of papers

  GET /api/papers/{paper_id}
  └─ Returns: Paper details + chunks

CHAT:
  POST /api/chat/sessions
  └─ Input: { user_id, paper_id }
  └─ Returns: { session_id }

  POST /api/chat/message
  └─ Input: { session_id, paper_id, message }
  └─ Returns: { response, sources }

  GET /api/chat/sessions/{session_id}
  └─ Returns: Conversation history

HEALTH:
  GET /health
  └─ Returns: System status