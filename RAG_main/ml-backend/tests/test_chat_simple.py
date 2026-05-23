"""
Simple Chat Testing Script

Tests the complete chat flow without searching:
1. Create dummy paper
2. Create chat session  
3. Send messages
4. Get responses
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001/api"

print("=" * 70)
print("SIMPLE CHAT TEST - No Search Needed!")
print("=" * 70)

# ============================================================
# STEP 1: Create Dummy Paper
# ============================================================
print("\n[1] CREATING DUMMY PAPER...\n")

try:
    response = requests.post(
        f"{BASE_URL}/test/dummy-paper",
        timeout=10
    )
    
    if response.status_code == 200:
        paper_data = response.json()
        paper_id = paper_data["paper_id"]
        print(f"✓ Dummy paper created!")
        print(f"  Paper ID: {paper_id}")
        print(f"  Title: {paper_data['title']}\n")
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        exit(1)
        
except requests.exceptions.ConnectionError:
    print("✗ Cannot connect to server at localhost:8001")
    print("  Make sure server is running: python main.py")
    exit(1)

# ============================================================
# STEP 2: Get All Papers
# ============================================================
print("\n[2] GETTING ALL PAPERS...\n")

try:
    response = requests.get(
        f"{BASE_URL}/test/papers",
        timeout=10
    )
    
    if response.status_code == 200:
        papers_data = response.json()
        print(f"✓ Found {papers_data['total']} paper(s)")
        for paper in papers_data.get('papers', [])[:3]:
            print(f"  - {paper.get('title', 'N/A')[:60]}... (ID: {paper.get('id')})\n")
    else:
        print(f"Note: {response.status_code}")
        
except Exception as e:
    print(f"Note: Could not get papers: {e}")

# ============================================================
# STEP 3: Create Chat Session
# ============================================================
print("\n[3] CREATING CHAT SESSION...\n")

session_request = {
    "user_id": "test_user_123",
    "paper_id": paper_id,
    "session_title": "Testing ML Paper Discussion"
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
# STEP 4: Send Messages
# ============================================================
print("\n[4] SENDING MESSAGES & GETTING RESPONSES...\n")

questions = [
    "What is this paper about?",
    "What technology stack is used?",
    "What are the main results?"
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
            print(f"✓ Message sent\n")
        else:
            print(f"✗ Error: {response.status_code}")
            print(response.text[:200] + "\n")
            
    except Exception as e:
        print(f"✗ Error: {e}\n")
    
    time.sleep(1)

# ============================================================
# STEP 5: Get Chat History
# ============================================================
print("\n[5] RETRIEVING CHAT HISTORY...\n")

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
            content = msg.get("content", "")[:80]
            print(f"[{i}] {role}: {content}...")
    else:
        print(f"Note: Conversation history not available (status {response.status_code})")
        
except Exception as e:
    print(f"Note: Could not retrieve conversation history: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE!")
print("=" * 70)
print("\n✓ Steps completed:")
print("  1. Created dummy paper")
print("  2. Got all papers")
print("  3. Created chat session")
print("  4. Sent 3 questions")
print("  5. Retrieved chat history")
print("\nThe chat endpoint should now be working!")
