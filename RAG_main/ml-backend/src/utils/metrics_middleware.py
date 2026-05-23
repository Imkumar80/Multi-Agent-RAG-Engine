"""
Metrics Middleware: Automatically collect evaluation metrics during chat pipeline
=====================================================================
This module provides middleware to hook into the chat pipeline and automatically
measure and evaluate every query without modifying chat business logic.

Why middleware pattern:
- Non-invasive: Chat code doesn't need to know about metrics
- Consistent: Same measurement approach for all queries
- Extensible: Can add new metrics without touching chat code
- Testable: Middleware can be tested independently

Comparison with other approaches:
- Decorators: Works for functions, but complex for async
- Aspect-oriented programming: More powerful, but overkill for metrics
- Middleware: Perfect for request/response pipelines (REST APIs, message handlers)

In web frameworks (Flask, FastAPI), middleware wraps requests:
Request → Middleware start → Handler → Middleware end → Response

We do the same for chat:
Query → MetricsCollector start → Chat handler → MetricsCollector end → Result
"""

import time
import logging
import uuid
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime
from functools import wraps
import asyncio

from .evaluation import EvaluationService, EvaluationResult

logger = logging.getLogger(__name__)


@dataclass
class MetricsContext:
    """
    Container for metrics collected during a single query execution

    Why this structure:
    - Bundles all timing measurements together
    - Can be passed through middleware layers
    - Becomes the input to EvaluationService.create_evaluation()

    Think of it as a "scratch pad" that gets filled in as query executes:
    1. START: Create MetricsContext, start timer
    2. EMBEDDING: Record embedding_end_time
    3. RETRIEVAL: Record retrieval_end_time
    4. LLM CALL: Record llm_end_time
    5. END: Calculate all latencies, pass to evaluation service
    """

    query_id: str = ""  # Unique ID for this query execution
    session_id: str = ""  # Chat session this belongs to
    query: str = ""
    retrieved_chunks: List[str] = None
    answer: str = ""
    user_id: str = ""

    # Timing milestones (unix timestamps in seconds)
    start_time: float = 0.0  # When query started
    embedding_end_time: Optional[float] = None  # After embedding query
    retrieval_end_time: Optional[float] = None  # After Qdrant search
    llm_end_time: Optional[float] = None  # After LLM response
    end_time: Optional[float] = None  # When query completed

    # Token tracking
    prompt_tokens: int = 0
    completion_tokens: int = 0

    # Cost tracking (model-dependent)
    cost_usd: float = 0.0
    model_used: str = ""  # "gpt-4", "claude-3-opus", etc.

    # Embeddings cache (optional, for better metrics)
    query_embedding: Optional[List[float]] = None
    answer_embedding: Optional[List[float]] = None
    chunk_embeddings: Optional[List[List[float]]] = None

    def __post_init__(self):
        if not self.query_id:
            self.query_id = str(uuid.uuid4())
        if self.retrieved_chunks is None:
            self.retrieved_chunks = []
        if self.start_time == 0.0:
            self.start_time = time.time()

    @property
    def total_latency_ms(self) -> float:
        """Total time from query start to response end"""
        if self.end_time is None:
            return (time.time() - self.start_time) * 1000
        return (self.end_time - self.start_time) * 1000

    @property
    def embedding_latency_ms(self) -> Optional[float]:
        """Time to compute query embedding"""
        if self.embedding_end_time is None:
            return None
        return (self.embedding_end_time - self.start_time) * 1000

    @property
    def retrieval_latency_ms(self) -> Optional[float]:
        """Time to retrieve chunks from Qdrant"""
        if self.retrieval_end_time is None or self.embedding_end_time is None:
            return None
        return (self.retrieval_end_time - self.embedding_end_time) * 1000

    @property
    def llm_latency_ms(self) -> Optional[float]:
        """Time for LLM inference"""
        if self.llm_end_time is None or self.retrieval_end_time is None:
            return None
        return (self.llm_end_time - self.retrieval_end_time) * 1000

    @property
    def total_tokens(self) -> int:
        """Total tokens (prompt + completion)"""
        return self.prompt_tokens + self.completion_tokens


class MetricsCollector:
    """
    Context manager and middleware for collecting query metrics

    Usage as context manager:
    ```python
    with MetricsCollector(session_id="sess_123") as metrics:
        # Run chat
        result = await chat(query)
        metrics.retrieved_chunks = result.chunks
        metrics.answer = result.answer
        metrics.completion_tokens = result.tokens
    # Metrics automatically evaluated and saved
    ```

    Why context manager:
    - Automatic resource management (__enter__ / __exit__)
    - Guaranteed to clean up even if exception occurs
    - Clean syntax
    - Easy to extend with logging, error handling, etc.
    """

    def __init__(
        self,
        session_id: str,
        user_id: str = "",
        evaluation_service: Optional[EvaluationService] = None,
        db_session=None,
        logger_instance: Optional[logging.Logger] = None,
    ):
        """
        Initialize metrics collector

        Args:
            session_id: Chat session ID
            user_id: User making query (for audit trail)
            evaluation_service: Service to compute metrics
            db_session: Database session for storing evaluations
            logger_instance: Logger to use
        """
        self.metrics = MetricsContext(session_id=session_id, user_id=user_id)
        self.evaluation_service = evaluation_service or EvaluationService()
        self.db_session = db_session
        self.logger = logger_instance or logger
        self.evaluation_result: Optional[EvaluationResult] = None
        self.exception_occurred = False

    def __enter__(self):
        """Start collecting metrics"""
        self.metrics.start_time = time.time()
        self.logger.debug(f"Metrics collection started: {self.metrics.query_id}")
        return self.metrics

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Finalize and store metrics"""
        self.metrics.end_time = time.time()

        if exc_type is not None:
            self.exception_occurred = True
            self.logger.error(
                f"Exception during query execution: {exc_type.__name__}: {exc_val}"
            )
            # Still record metrics for failed queries (helps debug issues)

        # Create evaluation result
        if self.metrics.answer:  # Only if we have an answer to evaluate
            self.evaluation_result = self.evaluation_service.create_evaluation(
                session_id=self.metrics.session_id,
                query=self.metrics.query,
                retrieved_chunks=self.metrics.retrieved_chunks,
                answer=self.metrics.answer,
                total_latency_ms=self.metrics.total_latency_ms,
                tokens_used=self.metrics.total_tokens,
                cost_usd=self.metrics.cost_usd,
                embeddings={
                    "query": self.metrics.query_embedding,
                    "answer": self.metrics.answer_embedding,
                    "chunks": self.metrics.chunk_embeddings,
                }
                if self.metrics.query_embedding
                else None,
                retrieval_latency_ms=self.metrics.retrieval_latency_ms,
                llm_latency_ms=self.metrics.llm_latency_ms,
                embedding_latency_ms=self.metrics.embedding_latency_ms,
            )

            # Store in PostgreSQL if session available
            if self.db_session:
                self._store_evaluation(self.evaluation_result)

        self.logger.info(
            f"Metrics collection completed: {self.metrics.query_id} "
            f"(latency={self.metrics.total_latency_ms:.0f}ms, "
            f"score={self.evaluation_result.overall_score:.2f if self.evaluation_result else 'N/A'})"
        )

    def _store_evaluation(self, result: EvaluationResult):
        """
        Store evaluation result in PostgreSQL

        Why store all metrics:
        - Historical tracking: See trends over time
        - Debugging: Replay poor-quality queries
        - Billing: Accurate cost tracking
        - ML: Fine-tune based on what works

        What we don't store:
        - Full retrieved chunks (too much data, can query Qdrant instead)
        - Full answer (redundant, in chat history)
        - We store aggregated metrics + references to chunks
        """
        try:
            from ..models.orm import RAGEvaluation as RAGEvaluationModel

            db_eval = RAGEvaluationModel(
                evaluation_id=result.eval_id or str(uuid.uuid4()),
                session_id=result.session_id,
                # Retrieval metrics
                retrieval_score=result.retrieval_metrics.retrieval_score,
                chunk_relevance=result.retrieval_metrics.chunk_relevance,
                num_relevant_chunks=result.retrieval_metrics.num_relevant_chunks,
                # Generation metrics
                generation_score=result.generation_metrics.generation_score,
                answer_relevance=result.generation_metrics.answer_relevance,
                factuality_score=result.generation_metrics.factuality_score,
                hallucination_risk=result.generation_metrics.hallucination_risk,
                # System metrics
                latency_ms=result.system_metrics.latency_ms,
                tokens_used=result.system_metrics.tokens_used,
                cost_usd=result.system_metrics.cost_usd,
                # Metadata
                created_at=datetime.utcnow(),
                model_used=self.metrics.model_used,
            )

            self.db_session.add(db_eval)
            self.db_session.commit()
            result.eval_id = db_eval.evaluation_id
            self.logger.debug(f"Evaluation stored: {db_eval.evaluation_id}")

        except Exception as e:
            self.logger.error(f"Failed to store evaluation: {e}")
            self.db_session.rollback()


def with_metrics(
    evaluation_service: Optional[EvaluationService] = None,
) -> Callable:
    """
    Decorator for chat/query functions to automatically collect metrics

    Usage:
    ```python
    @with_metrics()
    async def chat_with_paper(query: str, session_id: str, db):
        # Regular chat logic
        result = await rag_pipeline(query)
        return result
    ```

    The decorator:
    1. Wraps the function to capture latency
    2. Stores result in metrics context
    3. Evaluates quality
    4. Saves to database

    Why decorator:
    - Minimal code change (just add @with_metrics())
    - Works with sync and async functions
    - Cleanly separates metrics from business logic

    Note: For maximum accuracy, you'd want to refactor the chat handler
    to break out retrieval and LLM calls separately so we can measure
    their individual latencies. For now, this gives total latency.
    """

    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract session_id and db from kwargs or args
            session_id = kwargs.get("session_id") or (
                args[1] if len(args) > 1 else "unknown"
            )
            db_session = kwargs.get("db") or (args[2] if len(args) > 2 else None)

            eval_service = evaluation_service or EvaluationService()

            with MetricsCollector(
                session_id=session_id,
                evaluation_service=eval_service,
                db_session=db_session,
            ) as metrics:
                metrics.query = kwargs.get("query") or (args[0] if args else "")
                result = await func(*args, **kwargs)

                # Extract relevant fields from result
                if hasattr(result, "answer"):
                    metrics.answer = result.answer
                if hasattr(result, "chunks"):
                    metrics.retrieved_chunks = result.chunks
                if hasattr(result, "tokens"):
                    metrics.completion_tokens = result.tokens

                return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            session_id = kwargs.get("session_id") or (
                args[1] if len(args) > 1 else "unknown"
            )
            db_session = kwargs.get("db") or (args[2] if len(args) > 2 else None)

            eval_service = evaluation_service or EvaluationService()

            with MetricsCollector(
                session_id=session_id,
                evaluation_service=eval_service,
                db_session=db_session,
            ) as metrics:
                metrics.query = kwargs.get("query") or (args[0] if args else "")
                result = func(*args, **kwargs)

                # Extract relevant fields from result
                if hasattr(result, "answer"):
                    metrics.answer = result.answer
                if hasattr(result, "chunks"):
                    metrics.retrieved_chunks = result.chunks
                if hasattr(result, "tokens"):
                    metrics.completion_tokens = result.tokens

                return result

        # Return async or sync wrapper based on function
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class MetricsAggregator:
    """
    Aggregate metrics across multiple queries for dashboards and analysis

    Why aggregate metrics:
    - Single query metrics are noisy (one hallucination doesn't mean the system is bad)
    - Aggregates reveal patterns (Is generation score trending down? Is latency increasing?)
    - Enable trend detection (Performance degradation detection)
    - Support dashboarding (View metrics grouped by time, user, paper, model)

    Example aggregations:
    - Hourly: Every on-hour, compute avg_quality, p95_latency, total_cost
    - Per-paper: For each paper, track avg retrieval quality
    - Per-user: Track user satisfaction (ratings) and give personalized recommendations
    - By-model: Compare GPT-4 vs Claude vs open source on same queries
    """

    @staticmethod
    def aggregate_by_time_window(
        evaluations: List[EvaluationResult],
        window_minutes: int = 60,
    ) -> List[Dict[str, Any]]:
        """
        Aggregate evaluations into time windows

        Args:
            evaluations: List of evaluation results
            window_minutes: Size of time window (60 = hourly aggregation)

        Returns:
            List of aggregates: [{"time_start": datetime, "avg_quality": 0.82, ...}]

        Why this matters:
        - Hourly metrics show: "System degraded between 2pm-3pm"
        - Daily metrics show: "Quality drops on weekends"
        - Weekly metrics show: "New embedding model broke quality"

        Typical aggregates to compute:
        - avg_retrieval_score, p50, p95, p99 (quality percentiles)
        - avg_latency, p95_latency (performance)
        - total_cost, cost_per_query (cost efficiency)
        - avg_user_rating, rating_distribution (satisfaction)
        """
        if not evaluations:
            return []

        # Sort by creation time
        sorted_evals = sorted(evaluations, key=lambda e: e.created_at)

        # Group into windows
        windows = {}
        for eval_result in sorted_evals:
            # Compute window start time (rounded down to window size)
            window_start = eval_result.created_at
            window_key = f"{window_start.year}-{window_start.month}-{window_start.day}_{window_start.hour}"

            if window_key not in windows:
                windows[window_key] = []
            windows[window_key].append(eval_result)

        # Compute aggregates for each window
        aggregates = []
        for window_key, evals in windows.items():
            retrieval_scores = [e.retrieval_metrics.retrieval_score for e in evals]
            generation_scores = [e.generation_metrics.generation_score for e in evals]
            latencies = [e.system_metrics.latency_ms for e in evals]
            costs = [e.system_metrics.cost_usd for e in evals]
            ratings = [e.user_rating for e in evals if e.user_rating is not None]

            avg_dict = {
                "window": window_key,
                "query_count": len(evals),
                "avg_retrieval_score": sum(retrieval_scores) / len(retrieval_scores),
                "avg_generation_score": sum(generation_scores) / len(generation_scores),
                "avg_latency_ms": sum(latencies) / len(latencies),
                "total_cost_usd": sum(costs),
                "avg_user_rating": (sum(ratings) / len(ratings)) if ratings else None,
            }
            aggregates.append(avg_dict)

        return aggregates

    @staticmethod
    def compute_percentiles(
        evaluations: List[EvaluationResult],
        metric_name: str,  # "retrieval_score", "latency_ms", etc.
        percentiles: List[int] = [50, 95, 99],
    ) -> Dict[int, float]:
        """
        Compute percentiles for metric (50th, 95th, 99th)

        Why percentiles:
        - Average can be misleading (1 really slow query breaks average)
        - p95: "95% of users experience this latency"
        - p50 (median): More robust than average
        - p99: "Worst 1% experience this"

        Example:
        - Latency: p50=800ms, p95=1500ms, p99=3000ms
          Means: 50% users fast, 95% reasonable, 1% can be slow
        - Quality: p50=0.75, p95=0.60, p99=0.30
          Means: Half queries are good, but 1% are quite bad
        """
        if not evaluations:
            return {}

        # Extract values for metric
        values = []
        for eval_result in evaluations:
            if metric_name == "retrieval_score":
                values.append(eval_result.retrieval_metrics.retrieval_score)
            elif metric_name == "generation_score":
                values.append(eval_result.generation_metrics.generation_score)
            elif metric_name == "latency_ms":
                values.append(eval_result.system_metrics.latency_ms)
            elif metric_name == "cost_usd":
                values.append(eval_result.system_metrics.cost_usd)

        if not values:
            return {}

        # Sort to compute percentiles
        sorted_values = sorted(values)
        result = {}
        for p in percentiles:
            # Simple percentile calculation (not interpolated)
            idx = int(len(sorted_values) * p / 100)
            result[p] = sorted_values[idx]

        return result
