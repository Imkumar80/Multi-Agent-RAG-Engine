# 🌌 Collaborative Multi-Agent RAG Engine for Scientific Research

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-7.2.0-2D3748.svg?style=flat&logo=Prisma&logoColor=white)](https://prisma.io)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-red.svg?style=flat)](https://qdrant.tech)
[![Redis](https://img.shields.io/badge/Redis-7--alpine-red.svg?style=flat&logo=Redis&logoColor=white)](https://redis.io)

This project is an enterprise-grade, full-stack collaborative research platform that combines a **multi-role academic social network** (for Mentors, Researchers, and Interns) with an **autonomous Multi-Agent RAG (Retrieval-Augmented Generation) pipeline**. 

It enables researchers to seamlessly query global academic indexes (ArXiv, Semantic Scholar, CrossRef, Springer), manage collaborative research workflows, run mentor-intern milestones with peer reviews, and deploy specialized AI agents that collaboratively search, analyze, synthesize, and critique scientific papers.

---

## 📋 Table of Contents

1. [🔍 The Real-World Problem](#-the-real-world-problem)
2. [💡 The Solution](#-the-solution)
3. [🏛️ Architecture Overview](#️-architecture-overview)
   - [Service Topology](#service-topology)
   - [Database Schema (Relational)](#database-schema-relational)
   - [Data Flow & Integration Path](#data-flow--integration-path)
4. [🤖 ML & RAG Infrastructure](#-ml--rag-infrastructure)
   - [Embedding Model](#embedding-model)
   - [Vector Database (Qdrant)](#vector-database-qdrant)
   - [The Multi-Agent Research Team](#the-multi-agent-research-team)
   - [Redis Communication Bus](#redis-communication-bus)
5. [⚙️ Setup & Configuration Guide](#️-setup--configuration-guide)
   - [Prerequisites](#prerequisites)
   - [Step 1: Relational Backend (Node/Express/Prisma)](#step-1-relational-backend-nodeexpressprisma)
   - [Step 2: ML & Agentic Backend (Python/FastAPI)](#step-2-ml--agentic-backend-pythonfastapi)
   - [Step 3: Frontend Web Application (React/Vite)](#step-3-frontend-web-application-reactvite)
   - [Alternative Step: Docker Compose Launch](#alternative-step-docker-compose-launch)
6. [🧪 Verification & Testing](#-verification--testing)

---

## 🔍 The Real-World Problem

In the modern academic and scientific research ecosystem, researchers face several distinct friction points:
* **Information Overload & Dispersal:** Relevant literature is scattered across disjointed directories (ArXiv, Springer, CrossRef, Semantic Scholar). Researchers waste hours downloading, reformatting, and manually sorting PDFs.
* **Fragmented Collaboration:** The relationship between **Mentors** (PIs, professors), **Researchers**, and **Interns** is highly disconnected. Feedback, paper annotations, and thesis updates are spread across email, Slack, Google Docs, and offline PDFs, making milestone tracking impossible.
* **Basic RAG Limitations:** Standard QA bots operate on single files, lack historical context, and do not validate findings. They cannot perform deep literature reviews, critique methodology, or draft structured research papers autonomously.
* **Milestone & Quality Isolation:** There is no structural way to link an intern's literature synthesis with a mentor's review, annotation, and approval workflows.

---

## 💡 The Solution

This system addresses these challenges by consolidating paper discovery, group communication, and generative AI research agents into a unified, secure portal:

* **Collaborative Scientific Hub:** Specialized roles for **Mentors**, **Researchers**, and **Interns**. Features follower/following networks, direct messaging, profile pages, and mentor-sponsored internships.
* **Specialized Multi-Agent AI Team:** Instead of a single LLM chat, the platform deploys a team of four specialized agents—**Researcher**, **Analyzer**, **Writer**, and **Reviewer**—collaborating over Redis to output publication-ready reports.
* **Integrated Review & Annotation:** Interns submit literature syntheses to a project board. Mentors review, comment, and place sticky annotations directly onto the documents.
* **Hybrid Search & Vector Pipeline:** Combines online API retrieval (ArXiv, Springer, Semantic Scholar) with local PDF ingestion. Ingested papers are parsed, vectorized using `all-MiniLM-L6-v2`, and indexed in **Qdrant Cloud/Local** for context-rich, semantic RAG.

---

## 🏛️ Architecture Overview

The system uses a decoupled, multi-service topology designed for high availability, low-latency search, and scalable background task processing.

### Service Topology

```
                  ┌────────────────────────────────────────┐
                  │          Vite React Client             │
                  │   - Dashboard, Social feed, ML Chat    │
                  │   - Socket.io (real-time chat)         │
                  └───────────┬──────────────┬─────────────┘
                              │              │
        REST API (Port 3000)  │              │  REST API / SSE (Port 8001)
                              ▼              ▼
  ┌──────────────────────────────────┐    ┌──────────────────────────────────┐
  │      Node.js Express Server      │    │     FastAPI Python ML Server     │
  │  - Auth, Profiles & Social Feed  │    │  - Multi-Agent Orchestrator      │
  │  - DM & Sockets (Socket.io)      │    │  - SentenceTransformers Embedding│
  │  - Internship boards & Metadata  │    │  - Online Search Aggregators     │
  └───────────────┬──────────────────┘    └──────────────┬─────────────┬─────┘
                  │                                      │             │
                  │ Prisma ORM                           │             │
                  ▼                                      ▼             ▼
  ┌──────────────────────────────────┐    ┌─────────────────┐   ┌────────────┐
  │      PostgreSQL Database         │    │  Qdrant Cloud   │   │Redis Cache │
  │  - Relational schemas (Users,    │    │  - Vector DB    │   │- Agent Bus │
  │    Messages, Syntheses, Notes)   │    │  - Cosine Search│   │- Inbox/Pub │
  └──────────────────────────────────┘    └─────────────────┘   └────────────┘
```

### Database Schema (Relational)

Our core business logic and social structure reside in **PostgreSQL**, modeled using **Prisma ORM**:

* **User Type:** Differentiates `Intern`, `Researcher`, and `Mentor`. Includes fields for institution, bio, interests, and profile privacy.
* **Follows:** Self-referencing table supporting follower/following networks.
* **Direct Messaging:** `Conversation`, `ConversationParticipant`, and `Message` tables manage multi-user real-time chats.
* **Internships:** Mentors create internship boards. Interns apply or are hired to work on research projects.
* **ResearchSynthesis:** Connects an internship to the research outputs. Stores user queries, synthesized summaries, and academic citation references.
* **Annotations:** Connects mentors directly to syntheses, allowing line-by-line annotations and validation feedback.

### Data Flow & Integration Path

When a user initiates an agentic search:
1. **Frontend** posts to the ML backend `POST /api/research/workflow`.
2. **ResearcherAgent** pulls academic metadata from APIs (arXiv, etc.).
3. **AnalyzerAgent** chunks, extracts methodology, and retrieves corresponding embeddings from **Qdrant**.
4. **WriterAgent** combines abstract embeddings to draft a summary report.
5. **ReviewerAgent** critiques the drafted report and outputs the final result.
6. The compiled synthesis is sent back to the **Frontend** and stored in the **PostgreSQL** backend for collaborative mentor feedback.

---

## 🤖 ML & RAG Infrastructure

The ML engine runs on python's FastAPI framework and provides a high-performance vector retrieval pipeline.

### Embedding Model
* **Model Name:** `all-MiniLM-L6-v2` (SentenceTransformers)
* **Dimensions:** 384
* **Metrics:** Cosine Similarity
* **Caching:** Embedded models are stored locally (cached in `./models`) to avoid latency and high API cost overheads.

### Vector Database (Qdrant)
The vector store uses a managed **Qdrant Cloud** cluster (with support for local Qdrant for development). 
* Paper metadata remains in PostgreSQL.
* Chunked paragraphs and corresponding 384-dimensional embeddings are indexed in Qdrant collections.
* Supports hybrid search metrics and rapid similarity lookups (`search_similar`).

### The Multi-Agent Research Team

The FastAPI server spins up a collaborative group of four specialized agents (`src/services/agents.py`):

```
       Task Request
            │
            ▼
┌────────────────────────┐
│  Researcher Agent      │ ──► Gathers literature abstracts & PDFs from academic portals.
└───────────┬────────────┘
            │ Message Bus
            ▼
┌────────────────────────┐
│  Analyzer Agent        │ ──► Chunks text, parses methodologies, and scores insights.
└───────────┬────────────┘
            │ Message Bus
            ▼
┌────────────────────────┐
│  Writer Agent          │ ──► Synthesizes structured markdown summaries & citations.
└───────────┬────────────┘
            │ Message Bus
            ▼
┌────────────────────────┐
│  Reviewer Agent        │ ──► Validates references, checks biases, and audits reports.
└───────────┬────────────┘
            │
            ▼
      Final Output
```

### Redis Communication Bus
Inter-agent messages travel via a dedicated **Redis communication protocol** (`src/services/agent_communication.py`):
* **Asynchronous Inbox:** Each agent has a designated queue buffer in Redis.
* **Pub/Sub Broadcasts:** Allows orchestration components to update progress bars (0-100%) in real-time.
* **Execution Priority:** Supports `LOW`, `NORMAL`, `HIGH`, and `CRITICAL` execution tags.

---

## ⚙️ Setup & Configuration Guide

Follow these steps to run the complete search engine locally.

### Prerequisites
* **Node.js** v18+ & **npm**
* **Python** v3.10+ & **pip**
* **PostgreSQL** instance (local or hosted like Neon)
* **Redis** instance (local or cloud)
* **OpenAI API Key** (for RAG text generation)
* **Qdrant Instance** (free cloud tier or local docker image)

---

### Step 1: Relational Backend (Node/Express/Prisma)

1. Navigate to the backend directory:
   ```bash
   cd RAG_main/backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` variables:
   * `PORT`: Port the node server will run on (Default: `3000`).
   * `DATABASE_URL`: Connection string to your PostgreSQL instance.
   * `REDIS_URL`: Connection string for Redis.
   * `JWT_SECRET`: Used for authenticating user tokens.
   * `EMAIL_USER` / `EMAIL_PASS`: Credentials used to send transactional/verification emails.
   * `TURNSTILE_SECRET_KEY`: Turnstile CAPTCHA secret (for signup authentication).
5. Deploy database migrations and generate the client:
   ```bash
   npm run prismaMigrate
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will start on **`http://localhost:3000`**.

---

### Step 2: ML & Agentic Backend (Python/FastAPI)

1. Navigate to the ML backend directory:
   ```bash
   cd RAG_main/ml-backend
   ```
2. Set up a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Create the `.env` configuration file:
   ```bash
   # Create new .env file in ml-backend folder
   touch .env
   ```
5. Populate `.env` with the following variables:
   ```env
   # API Keys
   OPENAI_API_KEY=your-openai-api-key-here
   
   # Core Configurations
   ENVIRONMENT=development
   LOG_LEVEL=INFO
   DEBUG=True
   
   # Vector Storage (Qdrant)
   QDRANT_URL=http://localhost:6333     # Use cluster URL if on Qdrant Cloud
   QDRANT_API_KEY=                      # Required if using Qdrant Cloud
   QDRANT_COLLECTION=research-papers
   
   # Shared Cache (Redis)
   REDIS_URL=redis://localhost:6379/0
   
   # Optional API keys for research search engine
   SEMANTIC_SCHOLAR_API_KEY=
   SPRINGER_API_KEY=
   ```
6. Run the FastAPI development server:
   ```bash
   python main.py
   ```
   The ML Service will be active at **`http://localhost:8001`**. Access interactive API docs at **`http://localhost:8001/docs`**.

---

### Step 3: Frontend Web Application (React/Vite)

1. Navigate to the frontend directory:
   ```bash
   cd RAG_main/frontend
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Verify server endpoints match inside [values.ts](file:///home/stark/Desktop/Multi_agent%20_rag%20_engine/RAG_main/frontend/src/lib/values.ts):
   * `baseURL` should point to the Express backend (`http://localhost:3000`).
   * `mlBaseURL` should point to the FastAPI server (`http://localhost:8001`).
4. Boot up the Vite client:
   ```bash
   npm run dev
   ```
   Open your browser to **`http://localhost:5173`** to access the application UI.

---

### Alternative Step: Docker Compose Launch

If you want to run the ML backend along with pre-configured Qdrant and Redis local instances in containers:

1. Head into the ML directory:
   ```bash
   cd RAG_main/ml-backend
   ```
2. Ensure your `.env` contains the required `OPENAI_API_KEY`.
3. Spin up the containers:
   ```bash
   docker compose up --build
   ```
   This spins up:
   * **API Service** at `http://localhost:8001`
   * **Local Qdrant Database** at `http://localhost:6333`
   * **Local Redis Cache** at `http://localhost:6379`

---

## 🧪 Verification & Testing

Verify that all systems are running correctly by executing these verification suites:

### ML Backend & Agent Tests
Ensure your Python virtual environment is active in `ml-backend/`, then run the tests:
```bash
pytest tests/
```
Specifically, to test the agent message queue and workflow orchestration, run:
```bash
pytest tests/test_multi_agent_system.py
```

### Direct API Diagnostics
Ensure the servers are active and execute these quick curl checks:

1. **Verify FastAPI Health:**
   ```bash
   curl http://localhost:8001/health
   ```
   *Expected Response:* `{"status": "healthy", ...}`

2. **Trigger Academic Search:**
   ```bash
   curl "http://localhost:8001/api/research/arxiv?query=quantum+computing&limit=3"
   ```

3. **Verify Node.js Server:**
   ```bash
   curl http://localhost:3000/api/v1/auth/me
   ```
   *Expected Response:* `401 Unauthorized` (unless cookies are attached), verifying the auth middleware is active.

---

> [!TIP]
> **Performance Recommendation:** If you notice high search delays, make sure to obtain a **Semantic Scholar API Key** and add it to `ml-backend/.env`. It drastically increases request rate-limits and speeds up multi-source queries.
