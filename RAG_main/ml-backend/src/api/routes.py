"""
API Routes for Research Paper Search and Chat

Endpoints:
- Paper Search: /research (multi-source search)
- Individual Source: /research/{source}
- Chat: /chat/sessions, /chat/messages
"""

from fastapi import APIRouter, Query, HTTPException, Body
from typing import List, Optional, Dict, Any
import logging

from src.models.schemas import (
    SearchPapersRequest,
    PapersListResponse,
    CreateChatSessionRequest,
    ChatSessionResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatAnswerResponse,
    ConversationResponse,
    GetConversationRequest,
)
from src.services.research_paper_api import get_research_paper_api
from src.services.paper_services import (
    save_paper_to_qdrant,
    get_paper_by_id_service,
    search_papers_in_qdrant,
    get_all_papers_in_qdrant,
)
from src.services.chat_services import (
    create_chat_session,
    add_message_to_session,
    get_conversation_history,
    get_session_info,
)
from src.services.rag_services import get_context_for_question, rank_papers_by_relevance
from src.services.ai_response_service import (
    generate_response,
    analyze_paper_systematically,
    extract_technology_stack,
    analyze_future_scope,
    assess_research_depth,
    answer_question,
)

from src.utils.logger import logger
from datetime import datetime

router = APIRouter()
research_api = get_research_paper_api()


# PAPER SEARCH ENDPOINTS


@router.post("/research/search", tags=["Research"])
async def search_papers(request: SearchPapersRequest):
    """
    Search papers and automatically save them to database with paper_id.

    Request body:
    {
        "query": "deep learning",
        "source": "arxiv",  // optional: arxiv, semantic_scholar, crossref, springer
        "limit": 10,
        "offset": 0
    }

    Returns papers with paper_id - use paper_id to create chat sessions!

    Example response:
    {
        "papers": [
            {
                "paper_id": 1,                    // ← USE THIS FOR CHAT
                "title": "...",
                "authors": [...],
                "source": "arxiv",
                "url": "..."
            }
        ],
        "total": 3,
        "source": "arxiv"
    }
    """
    try:
        if request.source == "arxiv":
            results = await research_api.search_arxiv(
                query=request.query, max_results=request.limit
            )
        elif request.source == "semantic_scholar":
            results = await research_api.search_semantic_scholar(
                query=request.query, max_results=request.limit
            )
        elif request.source == "crossref":
            results = await research_api.search_crossref(
                query=request.query, max_results=request.limit
            )
        elif request.source == "springer":
            results = await research_api.search_springer(
                query=request.query, max_results=request.limit
            )
        else:
            # Default: search ArXiv
            results = await research_api.search_arxiv(
                query=request.query, max_results=request.limit
            )

        # Save papers to database and get paper_ids
        papers_with_ids = []
        for paper in results:
            try:
                # Get abstract/summary as content for RAG
                abstract = paper.get("summary") or paper.get("abstract", "")

                saved_paper = save_paper_to_qdrant(
                    title=paper.get("title", "Unknown"),
                    authors=paper.get("authors", []),
                    abstract=abstract,
                    url=paper.get("link") or paper.get("url", ""),
                    source=request.source or "arxiv",
                    published_date=paper.get("published")
                    or paper.get("published_date"),
                    content=abstract,  # Use abstract as content for RAG to work with
                )

                if saved_paper:
                    papers_with_ids.append(
                        {
                            "paper_id": saved_paper.id,
                            "title": paper.get("title", "Unknown"),
                            "authors": paper.get("authors", []),
                            "abstract": abstract,
                            "source": request.source or "arxiv",
                            "url": paper.get("link") or paper.get("url", ""),
                        }
                    )
            except Exception as e:
                logger.warning(f"Failed to save paper: {str(e)}")
                continue

        return {
            "papers": papers_with_ids,
            "total": len(papers_with_ids),
            "source": request.source or "arxiv",
            "message": "Papers saved! Use 'paper_id' to create chat sessions",
        }
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# CHAT ENDPOINTS


@router.post("/chat/sessions", response_model=ChatSessionResponse, tags=["Chat"])
async def create_session(request: CreateChatSessionRequest):
    """
    Create a new chat session for discussing a paper.

    Request body:
    {
        "paper_id": 1,
        "user_id": "user123",
        "session_title": "Discussing Deep Learning"
    }

    Returns:
    {
        "session_id": "12345",
        "user_id": "user123",
        "paper_id": 1,
        "created_at": "2026-02-17T13:00:00Z",
        "status": "ready"
    }
    """
    try:
        session = create_chat_session(
            paper_id=request.paper_id,
            user_id=request.user_id,
            session_title=request.session_title,
        )

        if not session:
            raise HTTPException(status_code=404, detail="Paper not found")

        return ChatSessionResponse(
            session_id=str(session.id),
            user_id=session.user_id,
            paper_id=session.paper_id,
            created_at=session.created_at,
            status="ready",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create session failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/messages", response_model=ChatMessageResponse, tags=["Chat"])
async def add_message(request: ChatMessageRequest):
    """
    Add message to chat explicitly processing via RAG pipeline.
    
    Response statuses:
    - "approved": Query safe, answer generated
    """
    try:
        start_time = datetime.utcnow()
        logger.info(f"[CHAT] Processing user query: {request.content[:100]}...")

        # 1. Save user message to Redis
        user_message = add_message_to_session(
            session_id=request.session_id,
            message_text=request.content,
            role="user",
            metadata=request.metadata,
        )

        if not user_message:
            raise HTTPException(status_code=404, detail="Session not found")

        # 2. Get paper ID from session context
        session_info = get_session_info(request.session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="Session not found")

        paper_id = session_info["session"].paper_id

        # 3. Get recent conversation history for RAG context
        history_data = get_conversation_history(request.session_id, limit=10)
        conversation_history = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in history_data["messages"]
        ]

        # 4. Generate AI response via Vector Search
        logger.info(f"[RAG] Generating answer for session {request.session_id}...")
        ai_response = generate_response(
            question=request.content,
            paper_id=paper_id,
            conversation_history=conversation_history,
        )

        # 5. Save AI message to Redis
        ai_message = add_message_to_session(
            session_id=request.session_id,
            message_text=ai_response or "Unable to generate response",
            role="assistant",
            metadata={"generated_by": "openai"},
        )

        execution_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"[SUCCESS] Query processed in {execution_time_ms:.0f}ms")

        return ChatMessageResponse(
            message_id=ai_message.id,
            session_id=str(ai_message.session_id),
            role=ai_message.role,
            content=ai_message.content,
            timestamp=ai_message.created_at,
            status="approved"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/chat/sessions/{session_id}/messages", tags=["Chat"])
async def get_messages(
    session_id: int, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)
):
    """Get all messages in a chat session"""
    try:
        result = get_conversation_history(
            session_id=session_id, limit=limit, offset=offset
        )

        return {
            "session_id": str(session_id),
            "messages": result["messages"],
            "total": result["total"],
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Get messages failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/sessions/{session_id}", tags=["Chat"])
async def get_session(session_id: int):
    """Get chat session info with paper details"""
    try:
        result = get_session_info(session_id=session_id)

        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": result["session"].id,
            "paper": result["paper"],
            "message_count": result["message_count"],
            "first_message_at": result["first_message_at"],
            "last_message_at": result["last_message_at"],
            "session_duration_minutes": result["session_duration_minutes"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ PAPER ANALYSIS ENDPOINTS ============

# Note: Analysis endpoints removed
# All paper analysis now goes through chat endpoint:
# - Ask "Analyze this paper"
# - Ask "What is the tech stack?"
# - Ask "What is the future scope?"
# - Ask "How deep is the research?"
# This provides better context and natural conversation flow


# ============ MULTI-AGENT RESEARCH ENDPOINTS ============


@router.post("/research/workflow", tags=["Multi-Agent"])
async def start_research_workflow(request):
    """
    Start multi-agent research workflow for comprehensive analysis.

    Orchestrates specialized agents:
    - Researcher: Searches and collects papers
    - Analyzer: Extracts insights from papers
    - Writer: Synthesizes into comprehensive report
    - Reviewer: Validates accuracy and quality

    Example request:
    {
        "query": "attention mechanisms in transformers",
        "session_id": "session_123",
        "sources": ["arxiv", "semantic_scholar"],
        "analysis_depth": "comprehensive",
        "report_style": "technical"
    }

    Returns workflow tracking ID and status.
    """
    try:
        from src.models.schemas import ResearchWorkflowRequest
        from src.services.agent_manager import get_agent_manager

        workflow_request = ResearchWorkflowRequest(**request.dict())
        agent_manager = get_agent_manager()

        logger.info(
            f"[Multi-Agent] Starting workflow for query: {workflow_request.query}"
        )

        # Execute workflow
        workflow = await agent_manager.execute_research_workflow(
            query=workflow_request.query,
            session_id=workflow_request.session_id,
            sources=workflow_request.sources,
            analysis_depth=workflow_request.analysis_depth,
            report_style=workflow_request.report_style,
            metadata=workflow_request.metadata,
        )

        # Save workflow to chat session
        await add_message_to_session(
            session_id=int(workflow_request.session_id),
            role="assistant",
            content=f"Started research workflow: {workflow.workflow_id}",
            metadata={"workflow_id": workflow.workflow_id},
        )

        return {
            "workflow_id": workflow.workflow_id,
            "session_id": workflow.session_id,
            "status": workflow.status,
            "progress": workflow.progress,
            "query": workflow.query,
            "created_at": workflow.created_at.isoformat(),
        }

    except Exception as e:
        logger.error(f"[Multi-Agent] Workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research/workflow/{workflow_id}", tags=["Multi-Agent"])
async def get_workflow_status(workflow_id: str):
    """Get status and results of a research workflow"""
    try:
        from src.services.agent_manager import get_agent_manager

        agent_manager = get_agent_manager()
        workflow = await agent_manager.get_workflow_status(workflow_id)

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        return {
            "workflow_id": workflow.workflow_id,
            "status": workflow.status,
            "progress": workflow.progress,
            "query": workflow.query,
            "created_at": workflow.created_at.isoformat(),
            "started_at": workflow.started_at.isoformat()
            if workflow.started_at
            else None,
            "completed_at": workflow.completed_at.isoformat()
            if workflow.completed_at
            else None,
            "duration": workflow.duration,
            "task_count": len(workflow.tasks),
            "errors": workflow.errors,
            "final_output": workflow.final_output,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Multi-Agent] Error getting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/status", tags=["Multi-Agent"])
async def get_agents_status():
    """Get status of all agents"""
    try:
        from src.services.agent_manager import get_agent_manager

        agent_manager = get_agent_manager()
        status = agent_manager.get_all_agents_status()

        return {"agents": status, "timestamp": datetime.utcnow().isoformat()}

    except Exception as e:
        logger.error(f"[Multi-Agent] Error getting agent status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_role}/status", tags=["Multi-Agent"])
async def get_agent_status(agent_role: str):
    """Get status of specific agent"""
    try:
        from src.services.agent_manager import get_agent_manager

        agent_manager = get_agent_manager()
        status = agent_manager.get_agent_status(agent_role)

        if not status:
            raise HTTPException(status_code=404, detail=f"Agent {agent_role} not found")

        return status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Multi-Agent] Error getting agent status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/communicate", tags=["Multi-Agent"])
async def send_agent_message(request):
    """Send message between agents"""
    try:
        from src.models.schemas import AgentMessageRequest
        from src.services.agent_communication import (
            AgentMessage,
            MessageType,
            MessagePriority,
            get_communication_bus,
        )

        msg_request = AgentMessageRequest(**request.dict())
        comm_bus = get_communication_bus()

        message = AgentMessage(
            sender_id="api_user",
            receiver_id=msg_request.receiver_agent,
            message_type=MessageType(msg_request.message_type),
            priority=MessagePriority(msg_request.priority),
            subject=msg_request.subject,
            content=msg_request.content,
            task_id=msg_request.task_id,
        )

        success = await comm_bus.send_message(message)

        return {
            "message_id": message.id,
            "delivered": success,
            "receiver": msg_request.receiver_agent,
            "created_at": message.created_at.isoformat(),
        }

    except Exception as e:
        logger.error(f"[Multi-Agent] Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/inbox", tags=["Multi-Agent"])
async def get_agent_inbox(agent_id: str, limit: int = 50):
    """Get messages for agent"""
    try:
        from src.services.agent_communication import get_communication_bus

        comm_bus = get_communication_bus()
        messages = await comm_bus.get_inbox(agent_id, limit)
        unread_count = await comm_bus.get_unread_count(agent_id)

        return {
            "agent_id": agent_id,
            "unread_count": unread_count,
            "messages": [msg.to_dict() for msg in messages],
            "total": len(messages),
        }

    except Exception as e:
        logger.error(f"[Multi-Agent] Error getting inbox: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/multi-agent", tags=["Multi-Agent"])
async def multi_agent_chat(request):
    """
    Chat with multi-agent assistance.

    Leverages the research team to provide comprehensive answers.

    Example:
    {
        "session_id": 1,
        "content": "What are the latest advances in attention mechanisms?",
        "use_agents": true,
        "preferred_agents": ["researcher", "analyzer"]
    }
    """
    try:
        from src.models.schemas import MultiAgentChatRequest
        from src.services.agent_manager import get_agent_manager

        chat_request = MultiAgentChatRequest(**request.dict())

        # Add user message
        msg = await add_message_to_session(
            session_id=chat_request.session_id,
            role="user",
            content=chat_request.content,
            metadata=chat_request.metadata,
        )

        if not chat_request.use_agents:
            # Regular RAG response
            context = await get_context_for_question(chat_request.content)
            response = await answer_question(
                question=chat_request.content, context=context
            )
        else:
            # Multi-agent assisted response
            agent_manager = get_agent_manager()
            workflow = await agent_manager.execute_research_workflow(
                query=chat_request.content,
                session_id=str(chat_request.session_id),
                analysis_depth="focused",
                report_style="conversational",
            )

            response = workflow.final_output.get("report", {}).get("report", "")

            # Add assistant response
            msg = await add_message_to_session(
                session_id=chat_request.session_id,
                role="assistant",
                content=response,
                metadata={
                    "workflow_id": workflow.workflow_id,
                    "agents_involved": workflow.task_order,
                },
            )

            return {
                "message_id": msg.get("id"),
                "session_id": chat_request.session_id,
                "role": "assistant",
                "content": response,
                "agents_involved": list(
                    set([t.split("_")[1] for t in workflow.task_order if "_" in t])
                ),
                "workflow_id": workflow.workflow_id,
                "timestamp": datetime.utcnow().isoformat(),
            }

        # Regular response
        msg = await add_message_to_session(
            session_id=chat_request.session_id,
            role="assistant",
            content=response,
            metadata={"workflow_id": None},
        )

        return {
            "message_id": msg.get("id"),
            "session_id": chat_request.session_id,
            "role": "assistant",
            "content": response,
            "agents_involved": [],
            "workflow_id": None,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"[Multi-Agent] Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# HEALTH CHECK


@router.get("/health", tags=["Health"])
async def health_check():
    """System health check"""
    return {"status": "healthy", "message": "API is running"}


# ============ PAPER SELECTION ENDPOINTS ============

# ============ PAPER SELECTION ENDPOINTS ============
# REMOVED: /research/select endpoint (redundant with /research/search)
# All paper search endpoints now automatically save papers to Qdrant
# Use /research/search instead for unified paper ingestion
