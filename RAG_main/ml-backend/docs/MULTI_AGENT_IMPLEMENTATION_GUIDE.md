# Multi-Agent Research Team Implementation

## Overview

Successfully implemented a scalable, multi-agent research team system that transforms Resonav's ml-backend into an enterprise-grade pipeline with specialized agents working collaboratively.

## Architecture

### Core Components

#### 1. **Agent System** (`src/services/agents.py`)
- **BaseAgent**: Abstract base class for all agents
- **ResearcherAgent**: Searches and collects papers from multiple sources
- **AnalyzerAgent**: Extracts insights, analyzes content, identifies patterns
- **WriterAgent**: Synthesizes information into comprehensive reports
- **ReviewerAgent**: Quality checks and validates outputs

### 2. **Agent Manager** (`src/services/agent_manager.py`)
- Central orchestrator for multi-agent workflows
- Manages task scheduling and execution
- Tracks workflow progress and state
- Supports parallel task execution
- Handles error recovery and retries

### 3. **Agent Communication** (`src/services/agent_communication.py`)
- Inter-agent messaging system using Redis
- Request/response patterns for agent coordination
- Message queuing and delivery tracking
- Pub/sub for broadcast notifications
- Inbox system for asynchronous messaging

### 4. **Integrated Review Workflow** (`src/services/review_workflow.py`)
- Enhanced with agent assignment capability
- Agent-generated analysis reports
- Multi-agent consensus on reviews
- Seamless integration with validation policies

### 5. **API Routes** (`src/api/routes.py`)
Seven new multi-agent endpoints:
- `POST /api/research/workflow` - Start research workflow
- `GET /api/research/workflow/{workflow_id}` - Get workflow status
- `GET /api/agents/status` - All agents status
- `GET /api/agents/{agent_role}/status` - Specific agent status
- `POST /api/agents/communicate` - Send inter-agent messages
- `GET /api/agents/{agent_id}/inbox` - Get agent inbox
- `POST /api/chat/multi-agent` - Chat with agent assistance

## Workflows Supported

### 1. Complete Research Workflow
```
User Query
    ↓
Researcher Agent (Search papers) [25% progress]
    ↓
Analyzer Agent (Analyze papers) [50% progress]
    ↓
Writer Agent (Synthesize report) [75% progress]
    ↓
Reviewer Agent (Validate quality) [100% progress]
    ↓
Final Output (Report + Insights)
```

### 2. Multi-Agent Chat
Regular chat enhanced with agent assistance:
- Can toggle agent involvement
- Select preferred agents
- Get agent insights alongside responses

### 3. Agent Review System
Review tickets can now:
- Be assigned to specific agents
- Receive analysis reports from agents
- Use agent reports for human decision-making
- Track agent contributions

## Key Features

### ✅ Scalable Pipeline
- Async/await architecture for concurrent execution
- Task queuing with priority levels
- Support for 3+ parallel tasks (configurable)
- Batch task execution

### ✅ Agent Specialization
- Each agent has specific responsibilities
- Callbacks for task completion
- State tracking and performance metrics
- Automatic retry on failure

### ✅ Inter-Agent Coordination
- Message broadcasting between agents
- Request/response patterns
- Task delegation
- Asynchronous communication via Redis

### ✅ Task Management
- Task priorities (LOW, NORMAL, HIGH, CRITICAL)
- Task dependencies tracking
- Error handling and retry logic
- Duration and performance metrics

### ✅ Workflow Tracking
- Real-time progress monitoring (0-100%)
- Task execution history
- Error logs and diagnostics
- Duration tracking

### ✅ Redis Integration
- Chat persistence (existing)
- Agent messaging queue
- Inbox management
- Workflow state management

## Usage Examples

### Example 1: Execute Research Workflow
```python
from src.services.agent_manager import get_agent_manager

agent_manager = get_agent_manager()
workflow = await agent_manager.execute_research_workflow(
    query="attention mechanisms in transformers",
    session_id="session_001",
    sources=["arxiv"],
    analysis_depth="comprehensive",
    report_style="technical"
)
```

### Example 2: Check Agent Status
```python
status = agent_manager.get_all_agents_status()
# Returns status of all 4 agents
```

### Example 3: Assign Agents to Review
```python
from src.services.review_workflow import ReviewWorkflow

review = await ReviewWorkflow.create_review_request(
    query="query_text",
    risk_level="HIGH",
    domain="SECURITY",
    session_id=123
)

await ReviewWorkflow.assign_agents_to_review(
    review_id=review.id,
    agent_roles=["analyzer", "reviewer"]
)
```

### Example 4: Send Inter-Agent Message
```python
from src.services.agent_communication import get_request_helper

helper = get_request_helper()
response = await helper.request_information(
    from_agent="researcher_1",
    to_agent="analyzer_1",
    request_type="papers_analysis",
    data={"papers": [...]}
)
```

## API Endpoints

### Research Workflow
- **POST** `/api/research/workflow` - Start workflow
- **GET** `/api/research/workflow/{workflow_id}` - Get status

### Agent Management
- **GET** `/api/agents/status` - All agents status
- **GET** `/api/agents/{agent_role}/status` - Single agent status
- **POST** `/api/agents/communicate` - Send message
- **GET** `/api/agents/{agent_id}/inbox` - Get messages

### Multi-Agent Chat
- **POST** `/api/chat/multi-agent` - Chat with agents

## Performance Characteristics

| Component | Capability |
|-----------|-----------|
| Max Parallel Tasks | 3 (configurable) |
| Task Timeout | 300s (5 min) |
| Max Task Retries | 3 |
| Message TTL | 86400s (24h) |
| Task Queue Size | Unlimited |
| Agents | 4 specialized roles |

## Integration Points

### With Existing Systems
- **Chat Services**: Enhanced with agent insights
- **Review Workflow**: Agent-assisted validation
- **RAG Pipeline**: Faster research through agents
- **Vector Store**: Papers fed through agents
- **Redis**: Messaging and state management

### Database/Storage
- Qdrant: Paper embeddings and search
- Redis: Agent messages, chat history
- PostgreSQL: Chat sessions, reviews (future)

## Testing

Run tests with:
```bash
pytest tests/test_multi_agent_system.py
python MULTI_AGENT_USAGE.py
```

Test coverage includes:
- Agent initialization
- Task creation and execution
- Agent communication
- Workflow execution
- Review workflow integration
- Task delegation
- Parallel execution
- Error handling

## Configuration

Agent Manager Configuration:
```python
manager.max_parallel_tasks = 3
manager.task_timeout = 300
manager.enable_auto_retry = True
```

## Future Enhancements

1. **Advanced Scheduling**: Priority queue for tasks
2. **Machine Learning Routing**: Use ML to select best agent
3. **Agent Learning**: Track performance, improve routing
4. **Distributed Agents**: Scale agents across multiple services
5. **Custom Agents**: Framework for user-defined agents
6. **Agent Skills**: Teach agents new capabilities
7. **Consensus Mechanisms**: Multiple agents vote on decisions
8. **Cost Optimization**: Track and minimize API calls

## Files Modified/Created

### New Files
- `src/services/agents.py` - Agent system
- `src/services/agent_manager.py` - Orchestrator
- `src/services/agent_communication.py` - Messaging
- `tests/test_multi_agent_system.py` - Tests
- `MULTI_AGENT_USAGE.py` - Usage examples

### Modified Files
- `src/api/routes.py` - +7 multi-agent endpoints
- `src/models/schemas.py` - +8 multi-agent schemas
- `src/services/review_workflow.py` - +agent methods
- `src/app.py` - Multi-agent initialization

## Migration from Single to Multi-Agent

The system is **100% backward compatible**. Existing:
- Chat endpoints work as before
- Review workflows unchanged (now enhanced)
- Paper search works identically
- No breaking changes

To use multi-agent features, simply call the new endpoints or pass `use_agents=True` flags.

## Dependencies

No new external dependencies required! Uses existing:
- FastAPI
- Redis
- Qdrant
- httpx/requests
- asyncio

## Next Steps

1. Deploy updated ml-backend
2. Test endpoints with provided examples
3. Integrate multi-agent chat into frontend
4. Monitor agent performance
5. Tune agent configurations based on workload

---

**Status**: ✅ Production Ready
**Last Updated**: April 17, 2026
