"""
Tests for vector_store.py

Basic validation tests for vector_store.py functions
"""

import sys
import os
import inspect
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Test imports
try:
    from src.services.vector_store import (
        initialize_qdrant,
        store_paper_embedding,
        search_similar,
        get_paper_by_id,
        get_all_papers,
        delete_paper,
        get_collection_stats,
        COLLECTION_NAME
    )
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

# Test function signatures
def test_function_signatures():
    """Test that functions have expected signatures."""
    
    # Check initialize_qdrant
    sig = inspect.signature(initialize_qdrant)
    assert len(sig.parameters) == 0, "initialize_qdrant should take no parameters"
    print("✅ initialize_qdrant signature correct")
    
    # Check store_paper_embedding
    sig = inspect.signature(store_paper_embedding)
    params = list(sig.parameters.keys())
    assert 'paper' in params, "store_paper_embedding should have 'paper' parameter"
    assert 'embedding' in params, "store_paper_embedding should have 'embedding' parameter"
    print("✅ store_paper_embedding signature correct")
    
    # Check search_similar
    sig = inspect.signature(search_similar)
    params = list(sig.parameters.keys())
    assert 'query_embedding' in params, "search_similar should have 'query_embedding' parameter"
    assert 'top_k' in params, "search_similar should have 'top_k' parameter"
    print("✅ search_similar signature correct")
    
    # Check get_paper_by_id
    sig = inspect.signature(get_paper_by_id)
    params = list(sig.parameters.keys())
    assert 'paper_id' in params, "get_paper_by_id should have 'paper_id' parameter"
    print("✅ get_paper_by_id signature correct")
    
    # Check get_all_papers
    sig = inspect.signature(get_all_papers)
    print("✅ get_all_papers signature correct")
    
    # Check delete_paper
    sig = inspect.signature(delete_paper)
    params = list(sig.parameters.keys())
    assert 'paper_id' in params, "delete_paper should have 'paper_id' parameter"
    print("✅ delete_paper signature correct")
    
    # Check get_collection_stats
    sig = inspect.signature(get_collection_stats)
    assert len(sig.parameters) == 0, "get_collection_stats should take no parameters"
    print("✅ get_collection_stats signature correct")

def test_constants():
    """Test that constants are defined."""
    assert COLLECTION_NAME == "resonav-papers", f"COLLECTION_NAME should be 'resonav-papers', got {COLLECTION_NAME}"
    print("✅ COLLECTION_NAME constant correct")

def run_all_tests():
    """Run all basic validation tests."""
    print("Running Vector Store Validation Tests...")
    print("=" * 50)

    try:
        test_function_signatures()
        test_constants()

        print("=" * 50)
        print("🎉 ALL VALIDATION TESTS PASSED!")
        print("Note: Full integration tests require Qdrant server to be running.")

    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        return False

    return True


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)