# Resonav 
A full-stack research application for scientific research combining React as the frontend framework, Node.js/TypeScript backend with Prisma ORM, and a Python ML backend for web search, deep research synthesis, and mentor-guided workflows - specifically built for Researchers, Interns, and Mentors.

## Project Vision

Resonav intends to differentiate this platform from the others like SciSpace, which could be achieved by focusing on **collaborative, mentor-guided research workflows** rather than just document analysis. Key differentiators:
- **Collaboration** between researchers, interns, and mentors
- **AI-powered research synthesis** combining web search with analysis
- **Structured research workflows** with milestone tracking and peer reviews
- **Knowledge management** with research history and control
- **Mentor oversight** with annotations and guidance tools, has the ability to hire students/graduates to intern on the research being worked on.

## Project Structure

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript + Prisma ORM
- **ML Backend**: FastAPI + Python

## Requirements

### Frontend

- **Node.js** 16+ and **npm** 7+
- **Key Dependencies**:
  - React 19.1.1
  - React Router DOM 7.9.2
  - Axios 1.12.2
  - TailwindCSS 3.4.18
  - Lucide React Icons 0.544.0
  - React Turnstile (for CAPTCHA)
  - Socket.io-client (real-time collaboration)
  - React Query (state management for research data)

Install frontend dependencies:
```bash
cd frontend
npm install
```

### Backend

- **Node.js** 16+ and **npm** 7+
- **PostgreSQL** database (configured via Prisma)
- **Redis** (for real-time collaboration sessions)
- **Key Dependencies**:
  - Express.js 5.1.0
  - Prisma Client 6.16.2
  - TypeScript 5.9.2
  - bcrypt 6.0.0 (password hashing)
  - jsonwebtoken 9.0.2 (JWT authentication)
  - CORS 2.8.5
  - dotenv 17.2.2
  - Axios 1.12.2

Install backend dependencies:
```bash
cd backend
npm install
npm run prismaGenerate
```

### ML Backend

- **Python** 3.8+
- **Key Dependencies**:
  - FastAPI
  - Uvicorn (ASGI server)
  - PyPDF2 (PDF processing)
  - scikit-learn (machine learning)
  - numpy (numerical computing)
  - pydantic (data validation)
  - pycryptodome (encryption)
  - python-dateutil (date utilities)
  - requests (API calls for web search)
  - transformers (NLP for research synthesis)
  - sentence-transformers (semantic search)

Install ML backend dependencies:
```bash
cd ml-backend
pip install -r requirements.txt
```

## Core Features Required

- [ ] User authentication (researcher, intern, mentor roles)
- [ ] Research project creation and management
- [ ] Web search integration with AI synthesis
- [ ] Mentor annotation and feedback tools
- [ ] Research export (PDF, citations)
- [ ] Notification system for team updates

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Resonav
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   npm run prismaGenerate
   # Configure .env file with database URL and Redis connection
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Setup ML Backend**
   ```bash
   cd ml-backend
   pip install -r requirements.txt
   python main.py
   ```

## Environment Setup

Create `.env` files in backend and ml-backend folders with required credentials as needed.

## Notes

- Update the .gitignore files in the respective folders
- Please write clean deployable code
- Checkout contribution.md for contribution guidelines

## Future goals

- Containerization of the application
- Ensuring scalability
- Successful deployment