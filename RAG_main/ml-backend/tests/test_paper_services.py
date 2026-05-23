"""
Test file for paper_services.py functions
Run this to verify all functions work correctly
"""

from src.services.paper_services import (
    save_paper,
    get_paper_by_id,
    search_papers_in_db,
    update_paper_embedding
)
from src.utils.logger import logger

def test_save_paper():
    """Test Function 1: Save a paper"""
    print("\n" + "="*50)
    print("TEST 1: SAVE PAPER")
    print("="*50)
    
    try:
        paper = save_paper(
            title="Deep Learning Fundamentals",
            authors=["John Smith", "Jane Doe"],
            abstract="This paper explores the basics of deep learning and neural networks.",
            url="https://arxiv.org/abs/2401.12345",
            source="arxiv",
            content="Full paper text would go here..."
        )
        print(f"✅ SUCCESS: Paper saved with ID {paper.id}")
        return paper.id
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return None

def test_get_paper_by_id(paper_id):
    """Test Function 2: Get paper by ID"""
    print("\n" + "="*50)
    print("TEST 2: GET PAPER BY ID")
    print("="*50)
    
    try:
        paper = get_paper_by_id(paper_id)
        if paper:
            print(f"✅ SUCCESS: Retrieved paper: {paper.title}")
            return True
        else:
            print(f"❌ FAILED: Paper not found")
            return False
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

def test_search_papers():
    """Test Function 3: Search papers"""
    print("\n" + "="*50)
    print("TEST 3: SEARCH PAPERS")
    print("="*50)
    
    try:
        results = search_papers_in_db(
            search_query="deep learning",
            limit=5,
            offset=0
        )
        print(f"✅ SUCCESS: Found {results['total']} papers")
        print(f"   Returned: {len(results['papers'])} papers")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

def test_update_embedding(paper_id):
    """Test Function 4: Update embedding"""
    print("\n" + "="*50)
    print("TEST 4: UPDATE EMBEDDING")
    print("="*50)
    
    try:
        # Create a fake embedding (384 dimensions)
        fake_embedding = [0.1] * 384
        
        paper = update_paper_embedding(
            paper_id=paper_id,
            embedding=fake_embedding
        )
        if paper:
            print(f"✅ SUCCESS: Updated embedding for paper {paper_id}")
            return True
        else:
            print(f"❌ FAILED: Paper not found")
            return False
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

# Run all tests
if __name__ == "__main__":
    print("\n🧪 STARTING PAPER SERVICES TESTS...\n")
    
    # Test 1: Save
    paper_id = test_save_paper()
    
    if paper_id:
        # Test 2: Get by ID
        test_get_paper_by_id(paper_id)
        
        # Test 3: Search
        test_search_papers()
        
        # Test 4: Update embedding
        test_update_embedding(paper_id)
    
    print("\n" + "="*50)
    print("🏁 TESTS COMPLETED")
    print("="*50 + "\n")


    # Just test imports work
try:
    from src.services import paper_services
    print("✅ paper_services.py imported successfully!")
    print("✅ All functions defined:")
    print("   - save_paper")
    print("   - get_paper_by_id")
    print("   - search_papers_in_db")
    print("   - update_paper_embedding")
except Exception as e:
    print(f"❌ Import failed: {e}")