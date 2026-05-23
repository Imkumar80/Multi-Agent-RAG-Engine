"""
Embedding Service Module

Generates vector embeddings using HuggingFace Sentence-Transformers
Provides semantic search capabilities through vector similarity
"""

from sentence_transformers import SentenceTransformer
from typing import List, Optional
import logging
import os
import numpy as np

from src.utils.config import (
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
    SENTENCE_TRANSFORMERS_HOME
)
from src.utils.logger import logger


# ============================================================================
# EMBEDDING SERVICE CLASS
# ============================================================================

class EmbeddingService:
    """
    Service for generating text embeddings using HuggingFace models
    
    Features:
    - Singleton pattern (only one model instance)
    - Automatic caching
    - Batch processing
    - Error handling
    """
    
    # Singleton instance
    _instance = None
    
    def __new__(cls):
        """Ensure only one instance of EmbeddingService"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize embedding service with HuggingFace model"""
        
        # Only initialize once
        if self._initialized:
            return
        
        self._initialized = True
        
        try:
            # Set cache directory
            os.environ['SENTENCE_TRANSFORMERS_HOME'] = SENTENCE_TRANSFORMERS_HOME
            
            logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
            logger.info(f"Cache directory: {SENTENCE_TRANSFORMERS_HOME}")
            
            # Load model (downloads if not cached)
            self.model = SentenceTransformer(EMBEDDING_MODEL)
            
            # Verify dimensions
            self.embedding_dimension = self.model.get_sentence_embedding_dimension()
            
            if self.embedding_dimension != EMBEDDING_DIMENSION:
                logger.warning(
                    f"Embedding dimension mismatch. "
                    f"Expected {EMBEDDING_DIMENSION}, "
                    f"got {self.embedding_dimension}"
                )
            
            logger.info(f"[OK] Embedding model loaded successfully")
            logger.info(f"    Model: {EMBEDDING_MODEL}")
            logger.info(f"    Dimensions: {self.embedding_dimension}")
            logger.info(f"    Device: {self.model.device}")
            
        except Exception as e:
            logger.error(f"[ERROR] Failed to load embedding model: {str(e)}")
            raise
    
    # ========================================================================
    # SINGLE EMBEDDING METHOD
    # ========================================================================
    
    def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
        
        Returns:
            List of floats (embedding vector) or None if error
        
        Example:
            embedding = service.get_embedding("machine learning")
            # Returns: [0.234, 0.567, 0.891, ..., 0.123]
        """
        try:
            if not text or not text.strip():
                logger.warning("Empty text provided for embedding")
                return None
            
            # Truncate to avoid memory issues
            text = text[:8000]
            
            # Generate embedding
            embedding = self.model.encode(text, convert_to_tensor=False)
            
            # Convert numpy array to list
            return embedding.tolist()
        
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None
    
    # ========================================================================
    # BATCH EMBEDDING METHOD (More Efficient)
    # ========================================================================
    
    def get_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
        show_progress: bool = False
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts efficiently
        
        Batch processing is much faster than one-by-one!
        
        Args:
            texts: List of texts to embed
            batch_size: Process in batches of N (default 32)
            show_progress: Show progress bar (default False)
        
        Returns:
            List of embedding vectors (or None for failed texts)
        
        Example:
            embeddings = service.get_embeddings_batch([
                "machine learning",
                "deep learning",
                "neural networks"
            ])
            # Returns: [[0.234, ...], [0.345, ...], [0.456, ...]]
        """
        try:
            # Filter and truncate texts
            valid_texts = [
                t[:8000] if t and t.strip() else ""
                for t in texts
            ]
            
            if not any(valid_texts):
                logger.warning("No valid texts provided for batch embedding")
                return [None] * len(texts)
            
            logger.info(
                f"Generating embeddings for {len(valid_texts)} texts "
                f"(batch_size={batch_size})"
            )
            
            # Batch encode (efficient)
            embeddings = self.model.encode(
                valid_texts,
                batch_size=batch_size,
                convert_to_tensor=False,
                show_progress_bar=show_progress
            )
            
            # Convert to list format
            result = [
                emb.tolist() if emb is not None else None
                for emb in embeddings
            ]
            
            logger.debug(f"Generated {len(result)} embeddings successfully")
            return result
        
        except Exception as e:
            logger.error(f"Error in batch embedding: {str(e)}")
            return [None] * len(texts)
    
    # ========================================================================
    # SIMILARITY SEARCH
    # ========================================================================
    
    def get_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
        
        Returns:
            Similarity score (0-1, higher = more similar)
        
        Example:
            similarity = service.get_similarity(emb1, emb2)
            # Returns: 0.95 (very similar)
        """
        try:
            # Convert to numpy arrays
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)
            
            # Calculate cosine similarity: dot product / (norm1 * norm2)
            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
        
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    # ========================================================================
    # MODEL INFO
    # ========================================================================
    
    def get_model_info(self) -> dict:
        """
        Get information about loaded model
        
        Returns:
            Dictionary with model metadata
        
        Example:
            info = service.get_model_info()
            # Returns: {
            #   "model_name": "all-MiniLM-L6-v2",
            #   "embedding_dimension": 384,
            #   "device": "cpu",
            #   ...
            # }
        """
        return {
            "model_name": EMBEDDING_MODEL,
            "embedding_dimension": self.embedding_dimension,
            "device": str(self.model.device),
            "cache_location": SENTENCE_TRANSFORMERS_HOME,
            "cost": "FREE (local processing)"
        }


# ============================================================================
# GLOBAL SINGLETON INSTANCE
# ============================================================================

# Create global instance (loaded once)
embedding_service = EmbeddingService()


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def get_embedding(text: str) -> Optional[List[float]]:
    """
    Convenience function to get embedding
    
    Usage:
        from services.embeddings import get_embedding
        embedding = get_embedding("machine learning")
    """
    return embedding_service.get_embedding(text)


def get_embeddings_batch(
    texts: List[str],
    batch_size: int = 32
) -> List[Optional[List[float]]]:
    """
    Convenience function to get batch embeddings
    
    Usage:
        from services.embeddings import get_embeddings_batch
        embeddings = get_embeddings_batch(["text1", "text2", "text3"])
    """
    return embedding_service.get_embeddings_batch(texts, batch_size)


def get_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Convenience function to get similarity
    
    Usage:
        from services.embeddings import get_similarity
        score = get_similarity(emb1, emb2)
    """
    return embedding_service.get_similarity(embedding1, embedding2)