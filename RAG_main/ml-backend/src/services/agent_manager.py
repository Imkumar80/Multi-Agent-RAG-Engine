"""
Agent Manager - Orchestrates multi-agent research workflows
===========================================================

Coordinates agents through research pipelines:
1. Researcher: Search and collect papers
2. Analyzer: Analyze selected papers
3. Writer: Synthesize findings
4. Reviewer: Validate and approve

Supports parallel execution, task delegation, and error recovery.
"""

import logging
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any, Callable
from dataclasses import dataclass, field

from src.services.agents import (
    BaseAgent,
    AgentTask,
    AgentRole,
    AgentStatus,
    TaskStatus,
    TaskPriority,
    ResearcherAgent,
    AnalyzerAgent,
    WriterAgent,
    ReviewerAgent,
)

logger = logging.getLogger(__name__)


@dataclass
class WorkflowExecution:
    """Tracks a complete workflow execution"""

    workflow_id: str
    session_id: str
    query: str

    # Timeline
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # State
    status: str = "pending"  # pending, running, completed, failed
    progress: float = 0.0  # 0 to 1

    # Tasks
    tasks: Dict[str, AgentTask] = field(default_factory=dict)
    task_order: List[str] = field(default_factory=list)

    # Results
    final_output: Optional[Dict[str, Any]] = None
    errors: List[str] = field(default_factory=list)

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> Optional[float]:
        if not self.started_at or not self.completed_at:
            return None
        return (self.completed_at - self.started_at).total_seconds()


class AgentManager:
    """Central manager for multi-agent research team"""

    def __init__(self):
        # Initialize agents
        self.agents: Dict[str, BaseAgent] = {
            "researcher": ResearcherAgent("researcher_1"),
            "analyzer": AnalyzerAgent("analyzer_1"),
            "writer": WriterAgent("writer_1"),
            "reviewer": ReviewerAgent("reviewer_1"),
        }

        # Track workflows
        self.workflows: Dict[str, WorkflowExecution] = {}
        self.agent_queues: Dict[str, List[AgentTask]] = {
            role: [] for role in ["researcher", "analyzer", "writer", "reviewer"]
        }

        # Configuration
        self.max_parallel_tasks = 3
        self.task_timeout = 300  # 5 minutes
        self.enable_auto_retry = True

        logger.info("[AgentManager] Multi-agent research team initialized")

    async def execute_research_workflow(
        self,
        query: str,
        session_id: str,
        sources: List[str] = None,
        analysis_depth: str = "comprehensive",
        report_style: str = "technical",
        metadata: Dict[str, Any] = None,
    ) -> WorkflowExecution:
        """Execute complete research workflow with all agents"""

        workflow_id = str(uuid.uuid4())
        workflow = WorkflowExecution(
            workflow_id=workflow_id,
            session_id=session_id,
            query=query,
            metadata=metadata or {},
        )

        self.workflows[workflow_id] = workflow
        workflow.status = "running"
        workflow.started_at = datetime.utcnow()

        try:
            # Phase 1: Research
            logger.info(f"[Workflow {workflow_id}] Phase 1: Research")
            search_task = await self._execute_researcher_phase(
                workflow, query, sources or ["arxiv"]
            )

            if search_task.is_failed:
                raise Exception(f"Research phase failed: {search_task.error_message}")

            workflow.progress = 0.25

            # Phase 2: Analysis
            logger.info(f"[Workflow {workflow_id}] Phase 2: Analysis")
            analysis_task = await self._execute_analyzer_phase(
                workflow, search_task.output_data, analysis_depth
            )

            if analysis_task.is_failed:
                raise Exception(f"Analysis phase failed: {analysis_task.error_message}")

            workflow.progress = 0.5

            # Phase 3: Writing
            logger.info(f"[Workflow {workflow_id}] Phase 3: Writing")
            writing_task = await self._execute_writer_phase(
                workflow, analysis_task.output_data, report_style
            )

            if writing_task.is_failed:
                raise Exception(f"Writing phase failed: {writing_task.error_message}")

            workflow.progress = 0.75

            # Phase 4: Review
            logger.info(f"[Workflow {workflow_id}] Phase 4: Review")
            review_task = await self._execute_reviewer_phase(
                workflow, writing_task.output_data
            )

            workflow.progress = 1.0

            # Compile final output
            workflow.final_output = {
                "workflow_id": workflow_id,
                "query": query,
                "research": search_task.output_data,
                "analysis": analysis_task.output_data,
                "report": writing_task.output_data,
                "validation": review_task.output_data,
            }

            workflow.status = "completed"
            workflow.completed_at = datetime.utcnow()

            logger.info(
                f"[Workflow {workflow_id}] COMPLETED in {workflow.duration:.2f}s"
            )

        except Exception as e:
            logger.error(f"[Workflow {workflow_id}] FAILED: {str(e)}")
            workflow.errors.append(str(e))
            workflow.status = "failed"
            workflow.completed_at = datetime.utcnow()
            raise

        return workflow

    async def _execute_researcher_phase(
        self, workflow: WorkflowExecution, query: str, sources: List[str]
    ) -> AgentTask:
        """Execute researcher agent phase"""

        task_id = f"{workflow.workflow_id}_researcher"
        task = AgentTask(
            id=task_id,
            agent_role=AgentRole.RESEARCHER,
            task_type="search",
            description=f"Search for papers on: {query}",
            input_data={"query": query, "sources": sources, "limit": 15},
            priority=TaskPriority.HIGH,
        )

        workflow.tasks[task_id] = task
        workflow.task_order.append(task_id)

        researcher = self.agents["researcher"]
        result_task = await researcher.process_task(task)

        workflow.tasks[task_id] = result_task
        return result_task

    async def _execute_analyzer_phase(
        self,
        workflow: WorkflowExecution,
        research_data: Dict[str, Any],
        analysis_depth: str,
    ) -> AgentTask:
        """Execute analyzer agent phase"""

        task_id = f"{workflow.workflow_id}_analyzer"
        task = AgentTask(
            id=task_id,
            agent_role=AgentRole.ANALYZER,
            task_type="analyze",
            description="Analyze collected papers",
            input_data={
                "papers": research_data.get("papers", []),
                "analysis_type": analysis_depth,
                "depth_level": analysis_depth,
            },
            priority=TaskPriority.HIGH,
            depends_on=[f"{workflow.workflow_id}_researcher"],
        )

        workflow.tasks[task_id] = task
        workflow.task_order.append(task_id)

        analyzer = self.agents["analyzer"]
        result_task = await analyzer.process_task(task)

        workflow.tasks[task_id] = result_task
        return result_task

    async def _execute_writer_phase(
        self,
        workflow: WorkflowExecution,
        analysis_data: Dict[str, Any],
        report_style: str,
    ) -> AgentTask:
        """Execute writer agent phase"""

        task_id = f"{workflow.workflow_id}_writer"
        task = AgentTask(
            id=task_id,
            agent_role=AgentRole.WRITER,
            task_type="write",
            description="Synthesize analysis into report",
            input_data={
                "analyzed_papers": analysis_data.get("analyzed_papers", []),
                "report_style": report_style,
                "max_length": 3000,
            },
            priority=TaskPriority.HIGH,
            depends_on=[f"{workflow.workflow_id}_analyzer"],
        )

        workflow.tasks[task_id] = task
        workflow.task_order.append(task_id)

        writer = self.agents["writer"]
        result_task = await writer.process_task(task)

        workflow.tasks[task_id] = result_task
        return result_task

    async def _execute_reviewer_phase(
        self, workflow: WorkflowExecution, writing_data: Dict[str, Any]
    ) -> AgentTask:
        """Execute reviewer agent phase"""

        task_id = f"{workflow.workflow_id}_reviewer"
        task = AgentTask(
            id=task_id,
            agent_role=AgentRole.REVIEWER,
            task_type="review",
            description="Validate and review report",
            input_data={
                "content": writing_data.get("report", ""),
                "review_criteria": [
                    "accuracy",
                    "completeness",
                    "clarity",
                    "compliance",
                ],
            },
            priority=TaskPriority.HIGH,
            depends_on=[f"{workflow.workflow_id}_writer"],
        )

        workflow.tasks[task_id] = task
        workflow.task_order.append(task_id)

        reviewer = self.agents["reviewer"]
        result_task = await reviewer.process_task(task)

        workflow.tasks[task_id] = result_task
        return result_task

    async def delegate_task(self, task: AgentTask, target_agent_role: str) -> AgentTask:
        """Delegate task to specific agent"""

        if target_agent_role not in self.agents:
            raise ValueError(f"Unknown agent role: {target_agent_role}")

        agent = self.agents[target_agent_role]
        task.delegated_to = agent.agent_id

        logger.info(f"[AgentManager] Delegating task {task.id} to {target_agent_role}")

        return await agent.process_task(task)

    async def get_workflow_status(
        self, workflow_id: str
    ) -> Optional[WorkflowExecution]:
        """Get status of a workflow"""
        return self.workflows.get(workflow_id)

    def get_agent_status(self, agent_role: str) -> Optional[Dict[str, Any]]:
        """Get status of an agent"""
        if agent_role not in self.agents:
            return None

        agent = self.agents[agent_role]
        return {
            "agent_id": agent.agent_id,
            "role": agent.role.value,
            "status": agent.state.status.value,
            "tasks_completed": agent.state.tasks_completed,
            "success_rate": agent.state.success_rate,
            "current_task": agent.state.current_task.id
            if agent.state.current_task
            else None,
        }

    def get_all_agents_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents"""
        return {role: self.get_agent_status(role) for role in self.agents}

    def clear_workflow(self, workflow_id: str) -> bool:
        """Clear completed workflow"""
        if workflow_id in self.workflows:
            del self.workflows[workflow_id]
            logger.info(f"[AgentManager] Cleared workflow {workflow_id}")
            return True
        return False

    async def batch_execute_tasks(
        self, tasks: List[AgentTask], max_parallel: int = None
    ) -> List[AgentTask]:
        """Execute multiple tasks in parallel"""

        max_parallel = max_parallel or self.max_parallel_tasks
        results = []

        for i in range(0, len(tasks), max_parallel):
            batch = tasks[i : i + max_parallel]

            # Execute batch in parallel
            batch_results = await asyncio.gather(
                *[self.delegate_task(task, task.agent_role.value) for task in batch],
                return_exceptions=True,
            )

            results.extend(batch_results)

        return results

    def register_agent_callback(self, agent_role: str, callback: Callable) -> bool:
        """Register callback for agent task completion"""
        if agent_role not in self.agents:
            return False

        self.agents[agent_role].register_callback(callback)
        logger.info(f"[AgentManager] Registered callback for {agent_role}")
        return True


# Global agent manager instance
_agent_manager: Optional[AgentManager] = None


def get_agent_manager() -> AgentManager:
    """Get or create the global agent manager"""
    global _agent_manager
    if _agent_manager is None:
        _agent_manager = AgentManager()
    return _agent_manager
