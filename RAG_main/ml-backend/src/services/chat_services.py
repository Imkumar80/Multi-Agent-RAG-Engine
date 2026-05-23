"""
Chat Services - Redis-backed chat persistence

Handles chat session and message storage in Redis while paper embeddings remain in Qdrant.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from src.models.database import ChatSession, ChatMessage
from src.services.vector_store import get_paper_by_id
from src.utils.logger import logger
from src.utils.redis_client import redis_client


SESSION_KEY_TEMPLATE = "chat:session:{}"
SESSION_USER_KEY_TEMPLATE = "chat:sessions:user:{}"
MESSAGES_KEY_TEMPLATE = "chat:messages:{}"
SESSION_ID_KEY = "chat:session:id"
MESSAGE_ID_KEY = "chat:message:id"


def _session_key(session_id: int) -> str:
    return SESSION_KEY_TEMPLATE.format(session_id)


def _user_sessions_key(user_id: str) -> str:
    return SESSION_USER_KEY_TEMPLATE.format(user_id)


def _messages_key(session_id: int) -> str:
    return MESSAGES_KEY_TEMPLATE.format(session_id)


def _serialize_chat_session(session: ChatSession) -> Dict[str, Any]:
    return {
        "id": str(session.id),
        "paper_id": str(session.paper_id),
        "user_id": session.user_id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat() if session.updated_at else "",
    }


def _deserialize_chat_session(data: Dict[str, Any]) -> Optional[ChatSession]:
    if not data:
        return None

    try:
        updated_at = data.get("updated_at")
        return ChatSession(
            id=int(data["id"]),
            paper_id=int(data["paper_id"]),
            user_id=data["user_id"],
            title=data["title"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(updated_at) if updated_at else None,
        )
    except Exception as e:
        logger.error(f"[-] Error deserializing chat session: {str(e)}")
        return None


def _serialize_chat_message(message: ChatMessage) -> Dict[str, Any]:
    return {
        "id": str(message.id),
        "session_id": str(message.session_id),
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
        "metadata": message.metadata or {},
    }


def _deserialize_chat_message(data: Dict[str, Any]) -> Optional[ChatMessage]:
    if not data:
        return None

    try:
        return ChatMessage(
            id=int(data["id"]),
            session_id=int(data["session_id"]),
            role=data["role"],
            content=data["content"],
            created_at=datetime.fromisoformat(data["created_at"]),
            metadata=data.get("metadata") or {},
        )
    except Exception as e:
        logger.error(f"[-] Error deserializing chat message: {str(e)}")
        return None


def _get_session_from_redis(session_id: int) -> Optional[ChatSession]:
    data = redis_client.hgetall(_session_key(session_id))
    return _deserialize_chat_session(data)


def _save_session_to_redis(session: ChatSession) -> None:
    redis_client.hset(
        _session_key(session.id), mapping=_serialize_chat_session(session)
    )
    redis_client.sadd(_user_sessions_key(session.user_id), session.id)


def _save_message_to_redis(message: ChatMessage) -> None:
    payload = json.dumps(_serialize_chat_message(message))
    redis_client.rpush(_messages_key(message.session_id), payload)


def _get_messages_from_redis(
    session_id: int, limit: int = 50, offset: int = 0
) -> List[ChatMessage]:
    raw_messages = redis_client.lrange(
        _messages_key(session_id), offset, offset + limit - 1
    )
    messages: List[ChatMessage] = []

    for raw in raw_messages:
        try:
            message_data = json.loads(raw)
            message = _deserialize_chat_message(message_data)
            if message:
                messages.append(message)
        except json.JSONDecodeError as e:
            logger.warning(f"[-] Failed to decode message JSON: {str(e)}")
            continue

    return messages


def _get_message_count(session_id: int) -> int:
    return redis_client.llen(_messages_key(session_id))


def _get_message_at(session_id: int, index: int) -> Optional[ChatMessage]:
    raw = redis_client.lindex(_messages_key(session_id), index)
    if not raw:
        return None

    try:
        return _deserialize_chat_message(json.loads(raw))
    except json.JSONDecodeError as e:
        logger.warning(f"[-] Failed to decode message JSON: {str(e)}")
        return None


# FUNCTION 1: CREATE CHAT SESSION
def create_chat_session(
    paper_id: int, user_id: str, session_title: str
) -> Optional[ChatSession]:
    """
    Create a new chat session for discussing a paper.

    Args:
        paper_id: ID of the paper to discuss
        user_id: ID of the user
        session_title: Title for the chat session

    Returns:
        ChatSession object or None
    """
    try:
        paper_data = get_paper_by_id(paper_id)
        if not paper_data:
            logger.warning(f"Paper {paper_id} not found")
            return None

        session_id = int(redis_client.incr(SESSION_ID_KEY))
        now = datetime.now()

        session = ChatSession(
            id=session_id,
            paper_id=paper_id,
            user_id=user_id,
            title=session_title,
            created_at=now,
            updated_at=now,
        )

        _save_session_to_redis(session)

        logger.info(f"[+] Chat session created with ID {session_id}")
        return session

    except Exception as e:
        logger.error(f"[-] Error creating chat session: {str(e)}")
        return None


# FUNCTION 2: ADD MESSAGE TO SESSION
def add_message_to_session(
    session_id: int,
    message_text: str,
    role: str = "user",
    metadata: Optional[Dict] = None,
) -> Optional[ChatMessage]:
    """
    Add a message to a chat session.

    Args:
        session_id: Chat session ID
        message_text: Message content
        role: "user" or "assistant"
        metadata: Optional metadata

    Returns:
        ChatMessage object or None
    """
    try:
        session = _get_session_from_redis(session_id)
        if not session:
            logger.warning(f"Session {session_id} not found")
            return None

        message_id = int(redis_client.incr(MESSAGE_ID_KEY))
        now = datetime.now()

        message = ChatMessage(
            id=message_id,
            session_id=session_id,
            role=role,
            content=message_text,
            created_at=now,
            metadata=metadata or {},
        )

        _save_message_to_redis(message)

        session.updated_at = now
        _save_session_to_redis(session)

        logger.info(f"[+] Message added to session {session_id}")
        return message

    except Exception as e:
        logger.error(f"[-] Error adding message: {str(e)}")
        return None


# FUNCTION 3: GET CONVERSATION HISTORY
def get_conversation_history(
    session_id: int, limit: int = 50, offset: int = 0
) -> Dict[str, Any]:
    """
    Get all messages in a chat session with pagination.

    Args:
        session_id: Chat session ID
        limit: Number of messages to return
        offset: Pagination offset

    Returns:
        Dictionary with messages, total count, limit, offset
    """
    try:
        messages = _get_messages_from_redis(session_id, limit=limit, offset=offset)
        total = _get_message_count(session_id)

        messages_data = [
            {
                "id": msg.id,
                "session_id": msg.session_id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "metadata": msg.metadata,
            }
            for msg in messages
        ]

        logger.info(
            f"[+] Retrieved {len(messages_data)} messages from session {session_id}"
        )

        return {
            "messages": messages_data,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        logger.error(f"[-] Error getting conversation history: {str(e)}")
        return {"messages": [], "total": 0, "limit": limit, "offset": offset}


# FUNCTION 4: GET SESSION INFO
def get_session_info(session_id: int) -> Optional[Dict[str, Any]]:
    """
    Get chat session information with paper details.

    Args:
        session_id: Chat session ID

    Returns:
        Dictionary with session info and paper details
    """
    try:
        session = _get_session_from_redis(session_id)
        if not session:
            logger.warning(f"Session {session_id} not found")
            return None

        paper_data = get_paper_by_id(session.paper_id)
        message_count = _get_message_count(session_id)

        first_message = _get_message_at(session_id, 0)
        last_message = _get_message_at(session_id, -1)

        if first_message and last_message:
            duration = (
                last_message.created_at - first_message.created_at
            ).total_seconds() / 60
            first_message_at = first_message.created_at
            last_message_at = last_message.created_at
        else:
            duration = 0
            first_message_at = session.created_at
            last_message_at = None

        logger.info(f"[+] Retrieved session info for {session_id}")

        return {
            "session": session,
            "paper": paper_data,
            "message_count": message_count,
            "first_message_at": first_message_at.isoformat(),
            "last_message_at": last_message_at.isoformat() if last_message_at else None,
            "session_duration_minutes": duration,
        }

    except Exception as e:
        logger.error(f"[-] Error getting session info: {str(e)}")
        return None


# HELPER: GET ALL SESSIONS FOR USER
def get_user_sessions(user_id: str) -> List[ChatSession]:
    """
    Get all chat sessions for a specific user.

    Args:
        user_id: User ID

    Returns:
        List of ChatSession objects
    """
    try:
        session_ids = redis_client.smembers(_user_sessions_key(user_id))
        sessions: List[ChatSession] = []

        for session_id in session_ids:
            try:
                session = _get_session_from_redis(int(session_id))
                if session:
                    sessions.append(session)
            except ValueError:
                continue

        logger.info(f"[+] Found {len(sessions)} sessions for user {user_id}")
        return sessions

    except Exception as e:
        logger.error(f"[-] Error getting user sessions: {str(e)}")
        return []


# HELPER: DELETE SESSION
def delete_chat_session(session_id: int) -> bool:
    """
    Delete a chat session and all its messages.

    Args:
        session_id: Chat session ID

    Returns:
        Success status
    """
    try:
        session = _get_session_from_redis(session_id)
        pipe = redis_client.pipeline()
        pipe.delete(_session_key(session_id))
        pipe.delete(_messages_key(session_id))

        if session:
            pipe.srem(_user_sessions_key(session.user_id), session_id)

        pipe.execute()

        logger.info(f"[+] Deleted chat session {session_id}")
        return True

    except Exception as e:
        logger.error(f"[-] Error deleting session: {str(e)}")
        return False
