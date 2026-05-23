"""
AI Response Service - OpenAI Integration with Enhanced Prompting

Generates comprehensive AI responses using OpenAI GPT model with RAG context.
Includes systematic analysis of papers with detailed breakdowns.
"""

from typing import Optional, Dict, Any, List
from openai import OpenAI
from src.models.database import ResearchPaper
from src.utils.config import OPENAI_API_KEY
from src.utils.logger import logger
from src.services.rag_services import get_context_for_question

# Initialize OpenAI client (new API v1.0+)
client = OpenAI(api_key=OPENAI_API_KEY)


# ============ SYSTEM PROMPTS ============

PAPER_ANALYZER_PROMPT = """You are an expert research paper analyst with deep knowledge across computer science, engineering, and data science.

Your task is to analyze and explain research papers in a systematic, comprehensive way.

When analyzing a paper, ALWAYS structure your response as follows:

1. PAPER OVERVIEW
   - Title and authors
   - Research domain/field
   - Main objective of the research
   - Problem statement

2. RESEARCH PROBLEM & MOTIVATION
   - What problem does this paper solve?
   - Why is this problem important?
   - What gaps in existing research does it address?

3. METHODOLOGY & APPROACH
   - What is the core methodology?
   - What algorithms or techniques are used?
   - What is the technical approach?
   - How is it different from existing approaches?

4. TECHNOLOGY STACK & TOOLS
   - Programming languages used
   - Frameworks and libraries (TensorFlow, PyTorch, etc.)
   - Tools and platforms for experimentation
   - Hardware requirements mentioned
   - Software dependencies

5. EXPERIMENTAL SETUP
   - Datasets used
   - Evaluation metrics
   - Baseline comparisons
   - Experimental conditions
   - Sample size and data distribution

6. KEY FINDINGS & RESULTS
   - Main results and achievements
   - Performance improvements over baselines
   - Statistical significance of results
   - Key insights discovered

7. LIMITATIONS & CHALLENGES
   - Acknowledged limitations
   - Computational constraints
   - Scalability concerns
   - Data availability issues
   - Potential biases

8. FUTURE SCOPE & RESEARCH DIRECTIONS
   - Suggested future work
   - Open research questions
   - Potential applications
   - Areas for improvement
   - Extension possibilities

9. PRACTICAL APPLICATIONS
   - Real-world use cases
   - Industry applications
   - Implementation considerations
   - Deployment challenges

10. RELATED WORK & CONTRIBUTIONS
    - How does this advance the field?
    - Novel contributions compared to prior work
    - Impact on the research community
    - Reproducibility considerations

Be thorough, precise, and cite specific sections from the provided paper content.
Use technical terminology appropriately but explain complex concepts clearly.
If information is not available in the paper, explicitly state that."""


QUICK_ANSWER_PROMPT = """You are an expert research paper analyst.

Answer the following question about the paper concisely and accurately.
Use information from the provided paper context.
If the answer involves technical details, explain them clearly.
Keep response focused and under 300 words unless more detail is needed.

If you cannot find the answer in the provided context, say so explicitly."""


TECH_STACK_PROMPT = """You are a technology stack analyst for research papers.

Analyze the paper and extract:

1. PROGRAMMING LANGUAGES
   - Primary languages used
   - Alternative languages mentioned

2. FRAMEWORKS & LIBRARIES
   - Deep learning frameworks (PyTorch, TensorFlow, etc.)
   - Data processing libraries (NumPy, Pandas, Scikit-learn, etc.)
   - Visualization tools
   - Other specialized libraries

3. TOOLS & PLATFORMS
   - Version control (Git)
   - Experiment tracking tools
   - Cloud platforms (AWS, GCP, Azure)
   - Development tools
   - Testing frameworks

4. HARDWARE
   - GPU/TPU specifications
   - Memory requirements
   - Distributed computing setup
   - Hardware accelerators

5. DATASETS & DATA SOURCES
   - Dataset names
   - Data sources
   - Preprocessing tools
   - Data size

Present in a structured, easy-to-read format."""


FUTURE_SCOPE_PROMPT = """You are a research strategist analyzing future directions.

From the paper, identify and explain:

1. FUTURE WORK MENTIONED
   - Explicit future work stated by authors
   - Extensions proposed
   - Areas for improvement

2. RESEARCH GAPS
   - Open research questions
   - Unresolved problems
   - Limitations that need addressing

3. POTENTIAL APPLICATIONS
   - Industries that could benefit
   - Real-world deployment scenarios
   - Scalability potential

4. ADVANCEMENT OPPORTUNITIES
   - How the approach could be enhanced
   - Combination with other techniques
   - Cross-domain applications

5. TIMELINE & FEASIBILITY
   - How quickly could improvements be implemented?
   - Resources required
   - Potential challenges

Be specific and reference the paper content."""


RESEARCH_DEPTH_PROMPT = """You are a research maturity analyst.

Analyze how deeply this research has been conducted:

1. RESEARCH SCOPE
   - Breadth of study (how many aspects covered?)
   - Depth of analysis (how thoroughly explored?)
   - Comprehensiveness of evaluation

2. EXPERIMENTAL RIGOR
   - Number of experiments conducted
   - Diversity of test cases
   - Statistical testing performed
   - Robustness checks included

3. VALIDATION METHODS
   - Types of evaluation (benchmark, user study, etc.)
   - Cross-validation approach
   - Generalization testing
   - Real-world validation

4. RESEARCH MATURITY LEVEL
   - Is this proof-of-concept or production-ready?
   - Reproducibility level
   - Code and data availability
   - Documentation quality

5. NOVELTY ASSESSMENT
   - How novel is the approach? (Incremental vs Revolutionary)
   - Degree of innovation
   - Comparison with state-of-the-art

Rate the research depth: Early-stage / Developing / Mature / Production-ready"""


# ============ FUNCTION 1: GENERATE COMPREHENSIVE RESPONSE ============

def generate_response(
    question: str,
    paper_id: int,
    conversation_history: Optional[list] = None,
    response_type: str = "quick"
) -> Optional[str]:
    """
    Generate AI response to user question using OpenAI + RAG context.
    
    Args:
        question: User question
        paper_id: Paper ID to get context from
        conversation_history: Previous messages in conversation
        response_type: "quick", "detailed", "systematic", "tech_stack", "future", "depth"
    
    Returns:
        AI response text or None
    """
    try:
        logger.info(f"Generating {response_type} response for: {question[:50]}...")
        
        # Get context from paper using RAG
        context_data = get_context_for_question(
            question=question,
            paper_id=paper_id,
            top_k=5
        )
        
        context = context_data.get("context", "")
        
        if not context:
            logger.warning("No context retrieved")
            return "Sorry, I couldn't find relevant information in the paper to answer your question."
        
        # Select system prompt based on response type
        system_prompt = _get_system_prompt(response_type)
        
        # Build messages for OpenAI
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Paper Context:\n\n{context}\n\nQuestion: {question}"}
        ]
        
        # Add conversation history if provided
        if conversation_history:
            messages = messages[:1] + conversation_history + messages[1:]
        
        # Call OpenAI API (new syntax for v1.0+)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract response
        answer = response.choices[0].message.content
        
        logger.info(f"[+] Generated {response_type} response ({len(answer)} chars)")
        return answer
        
    except Exception as e:
        error_str = str(e)
        logger.error(f"[-] Error generating response: {error_str}")
        
        # Handle common OpenAI errors
        if "authentication" in error_str.lower() or "api_key" in error_str.lower():
            return "Error: OpenAI API key is invalid. Check your OPENAI_API_KEY in .env"
        elif "rate_limit" in error_str.lower():
            return "Error: OpenAI rate limit exceeded. Please try again later."
        else:
            return f"Error: {error_str}"


# ============ FUNCTION 2: ANALYZE PAPER SYSTEMATICALLY ============

def analyze_paper_systematically(paper_id: int) -> Optional[str]:
    """
    Comprehensive systematic analysis of a paper covering all aspects.
    
    Returns:
        Complete paper analysis
    """
    try:
        logger.info(f"Performing systematic analysis of paper {paper_id}")
        
        question = "Please provide a comprehensive systematic analysis of this research paper"
        
        return generate_response(
            question=question,
            paper_id=paper_id,
            response_type="systematic"
        )
        
    except Exception as e:
        logger.error(f"[-] Error in systematic analysis: {str(e)}")
        return None


# ============ FUNCTION 3: EXTRACT TECHNOLOGY STACK ============

def extract_technology_stack(paper_id: int) -> Optional[str]:
    """
    Extract and explain the technology stack used in the paper.
    
    Returns:
        Technology stack details
    """
    try:
        logger.info(f"Extracting technology stack from paper {paper_id}")
        
        question = "What is the complete technology stack, tools, frameworks, and programming languages used in this research?"
        
        return generate_response(
            question=question,
            paper_id=paper_id,
            response_type="tech_stack"
        )
        
    except Exception as e:
        logger.error(f"[-] Error extracting tech stack: {str(e)}")
        return None


# ============ FUNCTION 4: ANALYZE FUTURE SCOPE ============

def analyze_future_scope(paper_id: int) -> Optional[str]:
    """
    Analyze future research directions and scope.
    
    Returns:
        Future scope analysis
    """
    try:
        logger.info(f"Analyzing future scope for paper {paper_id}")
        
        question = "What are the future research directions, open problems, and potential improvements for this work?"
        
        return generate_response(
            question=question,
            paper_id=paper_id,
            response_type="future"
        )
        
    except Exception as e:
        logger.error(f"[-] Error analyzing future scope: {str(e)}")
        return None


# ============ FUNCTION 5: ASSESS RESEARCH DEPTH ============

def assess_research_depth(paper_id: int) -> Optional[str]:
    """
    Assess how deeply the research has been conducted.
    
    Returns:
        Research depth assessment
    """
    try:
        logger.info(f"Assessing research depth for paper {paper_id}")
        
        question = "How deep and rigorous is this research? What is the maturity level and how much has been explored?"
        
        return generate_response(
            question=question,
            paper_id=paper_id,
            response_type="depth"
        )
        
    except Exception as e:
        logger.error(f"[-] Error assessing depth: {str(e)}")
        return None


# ============ FUNCTION 6: ANSWER SPECIFIC QUESTION ============

def answer_question(
    question: str,
    paper_id: int,
    conversation_history: Optional[list] = None
) -> Optional[str]:
    """
    Answer a specific user question about the paper.
    
    Args:
        question: User's specific question
        paper_id: Paper ID
        conversation_history: Chat history for context
    
    Returns:
        Answer to the question
    """
    try:
        return generate_response(
            question=question,
            paper_id=paper_id,
            conversation_history=conversation_history,
            response_type="quick"
        )
        
    except Exception as e:
        logger.error(f"[-] Error answering question: {str(e)}")
        return None


# ============ FUNCTION 7: STREAM RESPONSE ============

def generate_response_stream(
    question: str,
    paper_id: int,
    conversation_history: Optional[list] = None,
    response_type: str = "quick"
):
    """
    Generate AI response with streaming for real-time display.
    
    Yields:
        Response chunks as they arrive
    """
    try:
        logger.info(f"Streaming {response_type} response for: {question[:50]}...")
        
        # Get context
        context_data = get_context_for_question(
            question=question,
            paper_id=paper_id,
            top_k=5
        )
        
        context = context_data.get("context", "")
        
        if not context:
            yield "Sorry, I couldn't find relevant information in the paper."
            return
        
        # Get system prompt
        system_prompt = _get_system_prompt(response_type)
        
        # Build messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Paper Context:\n\n{context}\n\nQuestion: {question}"}
        ]
        
        if conversation_history:
            messages = messages[:1] + conversation_history + messages[1:]
        
        # Stream response (new syntax for v1.0+)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            stream=True
        )
        
        # Yield chunks
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
        
        logger.info("[+] Streaming completed")
        
    except Exception as e:
        logger.error(f"[-] Error in streaming: {str(e)}")
        yield f"Error: {str(e)}"


# ============ HELPER FUNCTION ============

def _get_system_prompt(response_type: str) -> str:
    """Get appropriate system prompt based on response type."""
    prompts = {
        "quick": QUICK_ANSWER_PROMPT,
        "detailed": PAPER_ANALYZER_PROMPT,
        "systematic": PAPER_ANALYZER_PROMPT,
        "tech_stack": TECH_STACK_PROMPT,
        "future": FUTURE_SCOPE_PROMPT,
        "depth": RESEARCH_DEPTH_PROMPT
    }
    return prompts.get(response_type, QUICK_ANSWER_PROMPT)


# ============ BATCH ANALYSIS ============

def batch_analyze_papers(paper_ids: List[int]) -> Dict[int, Dict[str, str]]:
    """
    Analyze multiple papers systematically.
    
    Args:
        paper_ids: List of paper IDs
    
    Returns:
        Dictionary mapping paper_id to analysis results
    """
    try:
        results = {}
        
        for paper_id in paper_ids:
            logger.info(f"Analyzing paper {paper_id}")
            
            analysis = {
                "overview": analyze_paper_systematically(paper_id),
                "tech_stack": extract_technology_stack(paper_id),
                "future_scope": analyze_future_scope(paper_id),
                "research_depth": assess_research_depth(paper_id)
            }
            
            results[paper_id] = analysis
        
        logger.info(f"[+] Batch analysis complete for {len(results)} papers")
        return results
        
    except Exception as e:
        logger.error(f"[-] Error in batch analysis: {str(e)}")
        return {}