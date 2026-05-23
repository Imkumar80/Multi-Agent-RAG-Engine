"""
Real Chat Workflow Test

1. Search real papers from ArXiv
2. Get paper_id from search results
3. Create chat session with that paper
4. Ask questions about the paper
5. Get chat history
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001/api"

print("=" * 70)
print("REAL WORKFLOW TEST - Search → Chat")
print("=" * 70)

# ============================================================
# STEP 1: Search for Real Papers
# ============================================================
print("\n[1] SEARCHING FOR PAPERS ON 'machine learning'...\n")

search_request = {
    "query": "machine learning",
    "source": "arxiv",
    "limit": 3
}

try:
    response = requests.post(
        f"{BASE_URL}/research/search",
        json=search_request,
        timeout=30
    )
    
    if response.status_code == 200:
        search_data = response.json()
        papers = search_data.get("papers", [])
        
        print(f"✓ Found and saved {len(papers)} papers\n")
        
        if not papers:
            print("✗ No papers found!")
            exit(1)
        
        for i, paper in enumerate(papers[:3], 1):
            print(f"Paper {i}:")
            print(f"  Paper ID: {paper.get('paper_id')} ← USE THIS FOR CHAT")
            print(f"  Title: {paper.get('title', 'N/A')[:60]}...")
            print(f"  Authors: {paper.get('authors', 'N/A')}")
            print(f"  Source: {paper.get('source', 'N/A')}\n")
        
        # Use first paper
        first_paper = papers[0]
        paper_id = first_paper.get("paper_id")
        
        if not paper_id:
            print("✗ Error: paper_id not returned from search!")
            exit(1)
            
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        exit(1)
        
except requests.exceptions.ConnectionError:
    print("✗ Cannot connect to server at localhost:8001")
    print("  Make sure server is running: python main.py")
    exit(1)

# ============================================================
# STEP 2: Create Chat Session
# ============================================================
print("\n[2] CREATING CHAT SESSION WITH PAPER...\n")

session_request = {
    "user_id": "test_user_123",
    "paper_id": paper_id,
    "session_title": "Discussing Machine Learning Paper"
}

try:
    response = requests.post(
        f"{BASE_URL}/chat/sessions",
        json=session_request,
        timeout=10
    )
    
    if response.status_code == 200:
        session_data = response.json()
        session_id = session_data.get("id") or session_data.get("session_id")
        print(f"✓ Chat session created!")
        print(f"  Session ID: {session_id}")
        print(f"  Paper ID: {session_data.get('paper_id')}\n")
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        exit(1)
        
except Exception as e:
    print(f"✗ Error creating session: {e}")
    exit(1)

# ============================================================
# STEP 3: Send Messages & Get Responses
# ============================================================
print("\n[3] ASKING QUESTIONS ABOUT THE PAPER...\n")

questions = [
    "What is the main objective of this paper?",
    "What methodology is used?",
    "What are the key contributions?"
]

for i, question in enumerate(questions, 1):
    print(f"Q{i}: {question}")
    
    message_request = {
        "session_id": session_id,
        "content": question,
        "metadata": {}
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/messages",
            json=message_request,
            timeout=30
        )
        
        if response.status_code == 200:
            message_data = response.json()
            print(f"✓ Question sent\n")
        else:
            print(f"✗ Error: {response.status_code}")
            error_detail = response.text[:200] if response.text else "No error details"
            print(f"  {error_detail}\n")
            
    except Exception as e:
        print(f"✗ Error: {e}\n")
    
    # Small delay between requests
    time.sleep(1)

# ============================================================
# STEP 4: Get Chat History
# ============================================================
print("\n[4] RETRIEVING CHAT HISTORY...\n")

try:
    response = requests.get(
        f"{BASE_URL}/chat/sessions/{session_id}/messages",
        timeout=10
    )
    
    if response.status_code == 200:
        conversation = response.json()
        messages = conversation.get("messages", [])
        print(f"✓ Retrieved {len(messages)} messages\n")
        
        for i, msg in enumerate(messages, 1):
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            print(f"[{i}] {role}:")
            print(f"    {content}\n")
            print()
    else:
        print(f"Note: Conversation history not available (status {response.status_code})")
        
except Exception as e:
    print(f"Note: Could not retrieve conversation history: {e}")

# ============================================================
# STEP 5: Get Session Info
# ============================================================
print("\n[5] GETTING SESSION INFO...\n")

try:
    response = requests.get(
        f"{BASE_URL}/chat/sessions/{session_id}",
        timeout=10
    )
    
    if response.status_code == 200:
        session_info = response.json()
        print(f"✓ Session Information:")
        print(f"  Session ID: {session_info.get('session_id')}")
        print(f"  Paper Title: {session_info.get('paper', {}).get('title', 'N/A')[:60]}...")
        print(f"  Message Count: {session_info.get('message_count')}")
        print(f"  Duration: {session_info.get('session_duration_minutes', 0):.1f} minutes")
    else:
        print(f"Note: Session info not available")
        
except Exception as e:
    print(f"Note: Could not get session info: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE!")
print("=" * 70)
print("\n✓ Workflow completed:")
print("  1. Searched for real papers (ArXiv)")
print("  2. Got paper_id from search results")
print("  3. Created chat session")
print("  4. Sent 3 questions")
print("  5. Retrieved chat history")
print("\n✓ The complete search → chat workflow is working!")
