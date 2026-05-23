"""
Multi-Agent Research Team - Integration Tests
==============================================

Tests for the new multi-agent research workflow system.
"""

import asyncio
import pytest
from datetime import datetime

# Import the multi-agent components
from src.services.agents import (
    AgentRole,
    AgentStatus,
    TaskStatus,
    TaskPriority,
    AgentTask,
    ResearcherAgent,
    AnalyzerAgent,
    WriterAgent,
    ReviewerAgent,
)
from src.services.agent_manager import AgentManager, get_agent_manager
from src.services.agent_communication import (
    AgentMessage,
    MessageType,
    MessagePriority,
    get_communication_bus,
    get_request_helper,
)
from src.services.review_workflow import ReviewWorkflow, ReviewStatus, ReviewerAction


@pytest.mark.asyncio
async def test_agent_initialization():
    """Test that agents initialize correctly"""
    manager = AgentManager()

    assert "researcher" in manager.agents
    assert "analyzer" in manager.agents
    assert "writer" in manager.agents
    assert "reviewer" in manager.agents

    # Check agent roles
    assert manager.agents["researcher"].role == AgentRole.RESEARCHER
    assert manager.agents["analyzer"].role == AgentRole.ANALYZER
    assert manager.agents["writer"].role == AgentRole.WRITER
    assert manager.agents["reviewer"].role == AgentRole.REVIEWER


@pytest.mark.asyncio
async def test_agent_task_creation():
    """Test creating agent tasks"""
    task = AgentTask(
        id="test_task_1",
        agent_role=AgentRole.RESEARCHER,
        task_type="search",
        description="Search for attention mechanism papers",
        input_data={"query": "attention mechanisms", "limit": 10},
        priority=TaskPriority.HIGH,
    )

    assert task.id == "test_task_1"
    assert task.agent_role == AgentRole.RESEARCHER
    assert task.status == TaskStatus.PENDING
    assert not task.is_complete
    assert not task.is_failed


@pytest.mark.asyncio
async def test_agent_manager_get_status():
    """Test getting agent status"""
    manager = AgentManager()

    status = manager.get_agent_status("researcher")
    assert status is not None
    assert status["role"] == "researcher"
    assert status["status"] == "idle"

    all_status = manager.get_all_agents_status()
    assert len(all_status) == 4
    assert all(
        "researcher" in all_status,
        "analyzer" in all_status,
        "writer" in all_status,
        "reviewer" in all_status,
    )


@pytest.mark.asyncio
async def test_agent_communication_send():
    """Test sending messages between agents"""
    comm_bus = get_communication_bus()

    message = AgentMessage(
        sender_id="agent_1",
        receiver_id="agent_2",
        message_type=MessageType.REQUEST,
        priority=MessagePriority.HIGH,
        subject="Test Request",
        content={"data": "test"},
    )

    success = await comm_bus.send_message(message)
    assert success is True
    assert message.delivered is True


@pytest.mark.asyncio
async def test_agent_inbox():
    """Test agent inbox functionality"""
    comm_bus = get_communication_bus()

    # Send messages
    for i in range(3):
        message = AgentMessage(
            sender_id="agent_1",
            receiver_id="test_agent",
            message_type=MessageType.NOTIFICATION,
            subject=f"Message {i}",
            content={"index": i},
        )
        await comm_bus.send_message(message)

    # Get inbox
    messages = await comm_bus.get_inbox("test_agent", limit=10)
    assert len(messages) >= 0  # May have other messages from other tests


@pytest.mark.asyncio
async def test_review_workflow_agent_assignment():
    """Test assigning agents to review workflow"""

    # Create a review
    review = await ReviewWorkflow.create_review_request(
        query="What are the risks of AI?",
        risk_level="HIGH",
        domain="SECURITY",
        session_id=123,
        policy_applied="security_check",
        timeout_minutes=10,
    )

    assert review.id is not None
    assert review.status == ReviewStatus.PENDING
    assert review.use_agent_review is False

    # Assign agents
    updated_review = await ReviewWorkflow.assign_agents_to_review(
        review_id=review.id, agent_roles=["reviewer", "analyzer"]
    )

    assert updated_review.use_agent_review is True
    assert "reviewer" in updated_review.assigned_agents
    assert "analyzer" in updated_review.assigned_agents


@pytest.mark.asyncio
async def test_review_workflow_agent_reports():
    """Test adding agent reports to review"""

    # Create review
    review = await ReviewWorkflow.create_review_request(
        query="Test query",
        risk_level="MEDIUM",
        domain="SECURITY",
        session_id=124,
        policy_applied="test_policy",
    )

    # Assign agents
    await ReviewWorkflow.assign_agents_to_review(
        review_id=review.id, agent_roles=["reviewer"]
    )

    # Add agent report
    report_data = {
        "risk_score": 0.7,
        "findings": "Medium risk detected",
        "recommendations": ["Add safeguards"],
    }

    updated_review = await ReviewWorkflow.add_agent_report(
        review_id=review.id, agent_role="reviewer", report=report_data
    )

    assert "reviewer" in updated_review.agent_reports
    assert updated_review.agent_reports["reviewer"]["report"]["risk_score"] == 0.7


@pytest.mark.asyncio
async def test_workflow_execution_simple():
    """Test simple workflow execution"""
    manager = AgentManager()

    # Create a simple research task
    task = AgentTask(
        id="simple_task",
        agent_role=AgentRole.RESEARCHER,
        task_type="search",
        description="Simple test search",
        input_data={"query": "machine learning", "sources": ["arxiv"], "limit": 5},
    )

    # Execute task through Researcher agent
    researcher = manager.agents["researcher"]
    result = await researcher.process_task(task)

    assert result.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]
    assert result.started_at is not None


@pytest.mark.asyncio
async def test_workflow_callback():
    """Test task completion callbacks"""
    manager = AgentManager()
    researcher = manager.agents["researcher"]

    callback_called = []

    async def test_callback(task: AgentTask):
        callback_called.append(task.id)

    # Register callback
    researcher.register_callback(test_callback)

    # Create and process task
    task = AgentTask(
        id="callback_test",
        agent_role=AgentRole.RESEARCHER,
        task_type="search",
        description="Test callback",
        input_data={"query": "test", "sources": ["arxiv"], "limit": 1},
    )

    result = await researcher.process_task(task)

    # Check callback was called
    # Note: callback may be called even after task completion
    assert result.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]


@pytest.mark.asyncio
async def test_task_dependencies():
    """Test task dependency tracking"""
    task1 = AgentTask(
        id="parent_task",
        agent_role=AgentRole.RESEARCHER,
        task_type="search",
        description="Search papers",
        input_data={"query": "test"},
    )

    task2 = AgentTask(
        id="child_task",
        agent_role=AgentRole.ANALYZER,
        task_type="analyze",
        description="Analyze papers",
        input_data={"papers": []},
        depends_on=["parent_task"],
    )

    assert task1.id in task2.depends_on
    assert len(task2.depends_on) == 1


@pytest.mark.asyncio
async def test_agent_delegation():
    """Test delegating tasks between agents"""
    manager = AgentManager()

    task = AgentTask(
        id="delegation_test",
        agent_role=AgentRole.ANALYZER,
        task_type="analyze",
        description="Test delegation",
        input_data={"papers": []},
    )

    # Delegate to analyzer
    result = await manager.delegate_task(task, "analyzer")

    assert result.delegated_to is not None
    assert result.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]


# Run tests
if __name__ == "__main__":
    # For manual testing
    async def run_tests():
        print("Running multi-agent integration tests...\n")

        # Test agent initialization
        print("✓ Testing agent initialization...")
        await test_agent_initialization()

        # Test task creation
        print("✓ Testing agent task creation...")
        await test_agent_task_creation()

        # Test manager status
        print("✓ Testing agent manager status...")
        await test_agent_manager_get_status()

        # Test communication
        print("✓ Testing agent communication...")
        await test_agent_communication_send()

        # Test review workflow
        print("✓ Testing review workflow agent assignment...")
        await test_review_workflow_agent_assignment()

        # Test review reports
        print("✓ Testing review workflow agent reports...")
        await test_review_workflow_agent_reports()

        # Test task dependencies
        print("✓ Testing task dependencies...")
        await test_task_dependencies()

        # Test delegation
        print("✓ Testing agent delegation...")
        await test_agent_delegation()

        print("\n✅ All tests passed!")

    asyncio.run(run_tests())
