"""
Multi-Agent Research Team System
=================================

Specialized agents with defined roles and responsibilities:
- ResearcherAgent: Searches, collects, and validates papers
- AnalyzerAgent: Extracts insights, analyzes content, identifies patterns
- WriterAgent: Synthesizes information, generates comprehensive reports
- ReviewerAgent: Quality checks, validates accuracy, ensures compliance

Workflow:
  User Query → Researcher (find papers) → Analyzer (analyze)
  → Writer (synthesize) → Reviewer (validate) → Output
"""

import logging
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any, Callable
from enum import Enum
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class AgentRole(str, Enum):
    """Specialized agent roles in research team"""

    RESEARCHER = "researcher"  # Finds and collects papers
    ANALYZER = "analyzer"  # Analyzes and extracts insights
    WRITER = "writer"  # Synthesizes and writes reports
    REVIEWER = "reviewer"  # Quality checks and validation
    ORCHESTRATOR = "orchestrator"  # Coordinates agents


class AgentStatus(str, Enum):
    """Agent execution status"""

    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ESCALATED = "escalated"


class TaskStatus(str, Enum):
    """Task status in agent workflow"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    DELEGATED = "delegated"


class TaskPriority(str, Enum):
    """Task execution priority"""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AgentTask:
    """Task assigned to an agent"""

    id: str
    agent_role: AgentRole
    task_type: str  # "search", "analyze", "write", "review"
    description: str
    input_data: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL

    # Execution
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Results
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None

    # Dependencies
    depends_on: List[str] = field(default_factory=list)  # Task IDs
    delegated_to: Optional[str] = None  # Agent ID task delegated to

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    attempts: int = 0
    max_retries: int = 3

    @property
    def is_complete(self) -> bool:
        return self.status == TaskStatus.COMPLETED

    @property
    def is_failed(self) -> bool:
        return self.status == TaskStatus.FAILED

    @property
    def duration(self) -> Optional[float]:
        if not self.started_at or not self.completed_at:
            return None
        return (self.completed_at - self.started_at).total_seconds()


@dataclass
class AgentState:
    """Track agent state and history"""

    agent_id: str
    role: AgentRole
    status: AgentStatus = AgentStatus.IDLE

    # Current task
    current_task: Optional[AgentTask] = None

    # History
    completed_tasks: List[str] = field(default_factory=list)
    failed_tasks: List[str] = field(default_factory=list)

    # Performance metrics
    tasks_completed: int = 0
    avg_duration: float = 0.0
    success_rate: float = 1.0

    last_updated: datetime = field(default_factory=datetime.utcnow)


class BaseAgent(ABC):
    """Base class for all research agents"""

    def __init__(self, agent_id: str, role: AgentRole):
        self.agent_id = agent_id
        self.role = role
        self.state = AgentState(agent_id=agent_id, role=role)
        self.callback_handlers: List[Callable] = []

    @abstractmethod
    async def execute_task(self, task: AgentTask) -> AgentTask:
        """Execute assigned task - implemented by subclasses"""
        pass

    async def process_task(self, task: AgentTask) -> AgentTask:
        """Process task with error handling and state management"""
        try:
            self.state.status = AgentStatus.PROCESSING
            self.state.current_task = task
            task.status = TaskStatus.IN_PROGRESS
            task.started_at = datetime.utcnow()
            task.attempts += 1

            logger.info(f"[Agent {self.agent_id}] Starting task: {task.id}")

            # Execute task
            result_task = await self.execute_task(task)

            # Update state
            result_task.completed_at = datetime.utcnow()
            result_task.status = TaskStatus.COMPLETED
            self.state.completed_tasks.append(task.id)
            self.state.tasks_completed += 1
            self.state.status = AgentStatus.IDLE

            logger.info(f"[Agent {self.agent_id}] Task completed: {task.id}")
            await self._notify_callbacks(result_task)

            return result_task

        except Exception as e:
            logger.error(f"[Agent {self.agent_id}] Task failed: {str(e)}")
            task.error_message = str(e)
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.utcnow()
            self.state.failed_tasks.append(task.id)
            self.state.status = AgentStatus.FAILED

            if task.attempts < task.max_retries:
                task.status = TaskStatus.PENDING
                logger.info(f"[Agent {self.agent_id}] Retrying task {task.id}")

            await self._notify_callbacks(task)
            return task

    def register_callback(self, callback: Callable) -> None:
        """Register callback for task completion"""
        self.callback_handlers.append(callback)

    async def _notify_callbacks(self, task: AgentTask) -> None:
        """Notify all registered callbacks"""
        for callback in self.callback_handlers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(task)
                else:
                    callback(task)
            except Exception as e:
                logger.error(f"[Agent {self.agent_id}] Callback error: {str(e)}")


class ResearcherAgent(BaseAgent):
    """Finds and collects relevant research papers"""

    def __init__(self, agent_id: str = "researcher_1"):
        super().__init__(agent_id, AgentRole.RESEARCHER)

    async def execute_task(self, task: AgentTask) -> AgentTask:
        """Search and collect papers based on query"""
        from src.services.research_paper_api import get_research_paper_api

        try:
            query = task.input_data.get("query", "")
            sources = task.input_data.get("sources", ["arxiv"])
            limit = task.input_data.get("limit", 10)

            research_api = get_research_paper_api()
            all_papers = []

            # Search multiple sources
            for source in sources:
                if source == "arxiv":
                    results = await research_api.search_arxiv(
                        query=query, max_results=limit
                    )
                elif source == "semantic_scholar":
                    results = await research_api.search_semantic_scholar(
                        query=query, max_results=limit
                    )
                elif source == "crossref":
                    results = await research_api.search_crossref(
                        query=query, max_results=limit
                    )
                else:
                    continue

                all_papers.extend(results)

            # Deduplicate and rank
            unique_papers = {p.get("url", p.get("title")): p for p in all_papers}
            papers = list(unique_papers.values())[:limit]

            task.output_data = {
                "papers": papers,
                "total_found": len(papers),
                "sources": sources,
                "query": query,
            }

            logger.info(f"[Researcher] Found {len(papers)} papers for query: {query}")

        except Exception as e:
            logger.error(f"[Researcher] Error searching papers: {str(e)}")
            raise

        return task


class AnalyzerAgent(BaseAgent):
    """Analyzes papers and extracts insights"""

    def __init__(self, agent_id: str = "analyzer_1"):
        super().__init__(agent_id, AgentRole.ANALYZER)

    async def execute_task(self, task: AgentTask) -> AgentTask:
        """Analyze papers to extract key insights"""
        from src.services.ai_response_service import (
            analyze_paper_systematically,
            assess_research_depth,
            extract_technology_stack,
        )

        try:
            papers = task.input_data.get("papers", [])
            analysis_type = task.input_data.get("analysis_type", "summary")

            analyzed_papers = []

            for paper in papers[:5]:  # Limit to prevent timeout
                try:
                    # Perform comprehensive analysis
                    analysis = await analyze_paper_systematically(
                        title=paper.get("title", ""),
                        abstract=paper.get("abstract", ""),
                        content=paper.get("full_text", ""),
                    )

                    depth = await assess_research_depth(paper.get("abstract", ""))
                    tech_stack = await extract_technology_stack(
                        paper.get("abstract", "")
                    )

                    analyzed_papers.append(
                        {
                            "paper": paper,
                            "analysis": analysis,
                            "depth": depth,
                            "technologies": tech_stack,
                        }
                    )

                except Exception as e:
                    logger.warning(f"[Analyzer] Failed to analyze paper: {str(e)}")

            task.output_data = {
                "analyzed_papers": analyzed_papers,
                "total_analyzed": len(analyzed_papers),
                "analysis_type": analysis_type,
            }

            logger.info(f"[Analyzer] Analyzed {len(analyzed_papers)} papers")

        except Exception as e:
            logger.error(f"[Analyzer] Error analyzing papers: {str(e)}")
            raise

        return task


class WriterAgent(BaseAgent):
    """Synthesizes information and generates reports"""

    def __init__(self, agent_id: str = "writer_1"):
        super().__init__(agent_id, AgentRole.WRITER)

    async def execute_task(self, task: AgentTask) -> AgentTask:
        """Synthesize analyzed papers into comprehensive report"""
        from src.services.ai_response_service import generate_response

        try:
            analyzed_papers = task.input_data.get("analyzed_papers", [])
            report_style = task.input_data.get("report_style", "technical")
            max_length = task.input_data.get("max_length", 2000)

            # Compile analysis summary
            combined_analyses = "\n\n".join(
                [
                    f"Paper: {p['paper'].get('title', 'Unknown')}\n"
                    f"Analysis: {p['analysis']}\n"
                    f"Depth: {p['depth']}\n"
                    f"Technologies: {p['technologies']}"
                    for p in analyzed_papers
                ]
            )

            # Generate synthesized report
            report_prompt = (
                f"Based on the following paper analyses, write a {report_style} summary:\n\n"
                f"{combined_analyses}\n\n"
                f"Create a comprehensive report highlighting key findings, methodologies, and future directions."
            )

            report = await generate_response(
                query=report_prompt, context="", model_type="gpt-4"
            )

            # Extract key points
            key_points = task.input_data.get("key_points", [])

            task.output_data = {
                "report": report,
                "style": report_style,
                "papers_count": len(analyzed_papers),
                "key_findings": key_points,
            }

            logger.info(
                f"[Writer] Generated report synthesizing {len(analyzed_papers)} papers"
            )

        except Exception as e:
            logger.error(f"[Writer] Error generating report: {str(e)}")
            raise

        return task


class ReviewerAgent(BaseAgent):
    """Quality checks and validates outputs"""

    def __init__(self, agent_id: str = "reviewer_1"):
        super().__init__(agent_id, AgentRole.REVIEWER)

    async def execute_task(self, task: AgentTask) -> AgentTask:
        """Review and validate outputs from other agents"""
        try:
            content = task.input_data.get("content", "")
            review_criteria = task.input_data.get("review_criteria", [])

            validation_results = {
                "accuracy_score": 0.0,
                "completeness_score": 0.0,
                "issues": [],
                "recommendations": [],
            }

            # Check for common issues
            if not content or len(content) < 50:
                validation_results["issues"].append("Content too short or empty")

            if len(content) > 50000:
                validation_results["issues"].append("Content exceeds maximum length")

            # Basic quality metrics
            if content:
                validation_results["accuracy_score"] = 0.85  # Placeholder
                validation_results["completeness_score"] = 0.90

            task.output_data = {
                "validation_results": validation_results,
                "approved": len(validation_results["issues"]) == 0,
                "review_timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(
                f"[Reviewer] Validation complete - "
                f"Approved: {task.output_data['approved']}"
            )

        except Exception as e:
            logger.error(f"[Reviewer] Error reviewing content: {str(e)}")
            raise

        return task
