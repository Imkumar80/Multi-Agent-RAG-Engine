"""
Agent Communication System - Inter-agent messaging and coordination
===================================================================

Enables agents to:
- Send messages to each other
- Request information/assistance
- Coordinate on complex tasks
- Share results and insights
- Handle escalations

Uses Redis for async message queuing and event broadcasting.
"""

import logging
import json
import asyncio
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any, Callable
from enum import Enum
import uuid

from src.utils.redis_client import redis_client

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Types of messages between agents"""

    REQUEST = "request"  # Request information/action
    RESPONSE = "response"  # Response to request
    NOTIFICATION = "notification"  # Broadcast notification
    ESCALATION = "escalation"  # Escalate to higher authority
    ERROR = "error"  # Error notification
    RESULT = "result"  # Task result sharing


class MessagePriority(str, Enum):
    """Message priority"""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AgentMessage:
    """Message between agents"""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str = ""
    receiver_id: Optional[str] = None  # None = broadcast
    message_type: MessageType = MessageType.NOTIFICATION
    priority: MessagePriority = MessagePriority.NORMAL

    # Content
    subject: str = ""
    content: Dict[str, Any] = field(default_factory=dict)

    # Context
    task_id: Optional[str] = None
    in_reply_to: Optional[str] = None

    # Timing
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    # Status
    delivered: bool = False
    read: bool = False
    read_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "message_type": self.message_type.value,
            "priority": self.priority.value,
            "subject": self.subject,
            "content": self.content,
            "task_id": self.task_id,
            "in_reply_to": self.in_reply_to,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "delivered": self.delivered,
            "read": self.read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentMessage":
        """Create from dictionary"""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            sender_id=data.get("sender_id", ""),
            receiver_id=data.get("receiver_id"),
            message_type=MessageType(data.get("message_type", "notification")),
            priority=MessagePriority(data.get("priority", "normal")),
            subject=data.get("subject", ""),
            content=data.get("content", {}),
            task_id=data.get("task_id"),
            in_reply_to=data.get("in_reply_to"),
            created_at=datetime.fromisoformat(data["created_at"])
            if "created_at" in data
            else datetime.utcnow(),
            expires_at=datetime.fromisoformat(data["expires_at"])
            if data.get("expires_at")
            else None,
            delivered=data.get("delivered", False),
            read=data.get("read", False),
            read_at=datetime.fromisoformat(data["read_at"])
            if data.get("read_at")
            else None,
        )

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


class AgentCommunicationBus:
    """Redis-based message bus for agent communication"""

    # Redis keys
    INBOX_TEMPLATE = "agent:inbox:{}"  # agent:inbox:researcher_1
    OUTBOX_TEMPLATE = "agent:outbox:{}"  # agent:outbox:researcher_1
    MESSAGE_TEMPLATE = "agent:message:{}"  # agent:message:{message_id}
    BROADCAST_CHANNEL = "agent:broadcast"  # Pub/sub channel
    DELIVERY_QUEUE = "agent:delivery_queue"  # Failed delivery queue

    def __init__(self, ttl_seconds: int = 86400):  # 24 hours default
        self.ttl_seconds = ttl_seconds
        self.subscribers: Dict[str, List[Callable]] = {}

    async def send_message(self, message: AgentMessage) -> bool:
        """Send message to agent(s)"""
        try:
            # Store message
            message_key = f"{self.MESSAGE_TEMPLATE.format(message.id)}"
            redis_client.setex(
                message_key, self.ttl_seconds, json.dumps(message.to_dict())
            )

            if message.receiver_id:
                # Direct message
                inbox_key = self.INBOX_TEMPLATE.format(message.receiver_id)
                redis_client.rpush(inbox_key, message.id)
                logger.debug(
                    f"[CommBus] Sent message {message.id} to {message.receiver_id}"
                )
            else:
                # Broadcast message
                redis_client.publish(
                    self.BROADCAST_CHANNEL, json.dumps(message.to_dict())
                )
                logger.debug(f"[CommBus] Broadcast message {message.id}")

            message.delivered = True
            return True

        except Exception as e:
            logger.error(f"[CommBus] Failed to send message: {str(e)}")
            return False

    async def get_inbox(self, agent_id: str, limit: int = 50) -> List[AgentMessage]:
        """Get messages for agent"""
        try:
            inbox_key = self.INBOX_TEMPLATE.format(agent_id)
            message_ids = redis_client.lrange(inbox_key, 0, limit - 1)

            messages = []
            for msg_id in message_ids:
                msg_data = redis_client.get(f"{self.MESSAGE_TEMPLATE.format(msg_id)}")
                if msg_data:
                    msg = AgentMessage.from_dict(json.loads(msg_data))
                    if not msg.is_expired:
                        messages.append(msg)

            return messages

        except Exception as e:
            logger.error(f"[CommBus] Error reading inbox: {str(e)}")
            return []

    async def get_unread_count(self, agent_id: str) -> int:
        """Count unread messages"""
        try:
            messages = await self.get_inbox(agent_id)
            return sum(1 for msg in messages if not msg.read)
        except Exception as e:
            logger.error(f"[CommBus] Error counting unread: {str(e)}")
            return 0

    async def mark_as_read(self, agent_id: str, message_id: str) -> bool:
        """Mark message as read"""
        try:
            message_key = f"{self.MESSAGE_TEMPLATE.format(message_id)}"
            msg_data = redis_client.get(message_key)

            if not msg_data:
                return False

            msg_dict = json.loads(msg_data)
            msg_dict["read"] = True
            msg_dict["read_at"] = datetime.utcnow().isoformat()

            redis_client.setex(message_key, self.ttl_seconds, json.dumps(msg_dict))

            logger.debug(f"[CommBus] Marked message {message_id} as read")
            return True

        except Exception as e:
            logger.error(f"[CommBus] Error marking as read: {str(e)}")
            return False

    async def delete_message(self, message_id: str) -> bool:
        """Delete message"""
        try:
            message_key = f"{self.MESSAGE_TEMPLATE.format(message_id)}"
            redis_client.delete(message_key)
            logger.debug(f"[CommBus] Deleted message {message_id}")
            return True
        except Exception as e:
            logger.error(f"[CommBus] Error deleting message: {str(e)}")
            return False

    def subscribe_to_channel(self, agent_id: str, callback: Callable) -> None:
        """Subscribe to broadcast channel"""
        if agent_id not in self.subscribers:
            self.subscribers[agent_id] = []
        self.subscribers[agent_id].append(callback)
        logger.info(f"[CommBus] Agent {agent_id} subscribed to broadcast")

    async def broadcast_to_subscribers(self, message: AgentMessage) -> None:
        """Broadcast to all subscribers"""
        for agent_id, callbacks in self.subscribers.items():
            for callback in callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(message)
                    else:
                        callback(message)
                except Exception as e:
                    logger.error(f"[CommBus] Callback error for {agent_id}: {str(e)}")


class AgentRequestHelper:
    """Helper for making inter-agent requests"""

    def __init__(self, comm_bus: AgentCommunicationBus):
        self.comm_bus = comm_bus
        self.pending_requests: Dict[str, asyncio.Future] = {}

    async def request_information(
        self,
        from_agent: str,
        to_agent: str,
        request_type: str,
        data: Dict[str, Any],
        timeout: float = 30.0,
    ) -> Optional[Dict[str, Any]]:
        """Request information from another agent"""

        request_id = str(uuid.uuid4())
        message = AgentMessage(
            id=request_id,
            sender_id=from_agent,
            receiver_id=to_agent,
            message_type=MessageType.REQUEST,
            priority=MessagePriority.HIGH,
            subject=f"{request_type} request",
            content={
                "request_type": request_type,
                "data": data,
                "requires_response": True,
            },
        )

        # Create future for response
        future: asyncio.Future = asyncio.Future()
        self.pending_requests[request_id] = future

        logger.info(
            f"[RequestHelper] {from_agent} requesting {request_type} from {to_agent}"
        )

        # Send request
        await self.comm_bus.send_message(message)

        # Wait for response
        try:
            response = await asyncio.wait_for(future, timeout=timeout)
            return response
        except asyncio.TimeoutError:
            logger.warning(f"[RequestHelper] Request {request_id} timed out")
            return None
        finally:
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]

    async def send_response(
        self,
        from_agent: str,
        to_agent: str,
        in_reply_to: str,
        response_data: Dict[str, Any],
    ) -> bool:
        """Send response to a request"""

        message = AgentMessage(
            sender_id=from_agent,
            receiver_id=to_agent,
            message_type=MessageType.RESPONSE,
            priority=MessagePriority.HIGH,
            subject="Response",
            content=response_data,
            in_reply_to=in_reply_to,
        )

        await self.comm_bus.send_message(message)

        # Resolve pending request
        if in_reply_to in self.pending_requests:
            future = self.pending_requests[in_reply_to]
            if not future.done():
                future.set_result(response_data)

        return True

    async def notify_agents(
        self, from_agent: str, notification_type: str, data: Dict[str, Any]
    ) -> None:
        """Send notification to all agents"""

        message = AgentMessage(
            sender_id=from_agent,
            receiver_id=None,  # Broadcast
            message_type=MessageType.NOTIFICATION,
            subject=notification_type,
            content=data,
        )

        await self.comm_bus.send_message(message)
        logger.info(f"[RequestHelper] {from_agent} notified all agents")


# Global communication bus instance
_communication_bus: Optional[AgentCommunicationBus] = None


def get_communication_bus() -> AgentCommunicationBus:
    """Get or create the global communication bus"""
    global _communication_bus
    if _communication_bus is None:
        _communication_bus = AgentCommunicationBus()
    return _communication_bus


def get_request_helper() -> AgentRequestHelper:
    """Get request helper with communication bus"""
    comm_bus = get_communication_bus()
    return AgentRequestHelper(comm_bus)
