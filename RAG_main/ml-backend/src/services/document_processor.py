"""
Document Processing Service - Educational Implementation

WHY THIS MATTERS:
================
When you feed entire research papers to RAG, the model can get lost.
Instead, we:
1. Break papers into smart chunks (not just random sections)
2. Extract metadata (summaries, keywords, questions)
3. Store chunks with embeddings for semantic search

EXAMPLE:
--------
Paper: "Deep Learning for Medical Imaging" (50 pages)

Without chunking:
- Query: "What neural network architecture?"
- Model sees ALL 50 pages, gets confused, gives bad answer

With smart chunking:
- Paper split into 10 chunks (each ~5 pages)
- Query embedded and searched
- Only relevant chunks retrieved (e.g., "Architecture Chapter")
- Model gets focused context → better answer!

This file handles ALL the preprocessing to make RAG work well.
"""

from typing import List, Dict, Any, Optional, Tuple
import re
from dataclasses import dataclass
from enum import Enum

from src.utils.logger import logger


class ChunkingStrategy(Enum):
    """Different ways to split documents"""

    FIXED_SIZE = "fixed_size"  # Split by character count
    SEMANTIC = "semantic"  # Split by topics/sections
    HYBRID = "hybrid"  # Combination approach
    PARAGRAPH = "paragraph"  # Split by paragraphs


@dataclass
class DocumentChunk:
    """Represents a single piece of a document"""

    content: str  # The actual text
    chunk_index: int  # Which chunk (0, 1, 2, ...)
    start_char: int  # Character position in original document
    end_char: int  # Character position in original document
    heading: Optional[str] = None  # Section heading this chunk belongs to
    metadata: Dict[str, Any] = None  # Any extra info about this chunk

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class ExtractedMetadata:
    """Metadata extracted from a document"""

    title: str
    authors: List[str]
    abstract: str
    keywords: List[str]
    summary: str  # Generated summary of the paper
    questions: List[str]  # Auto-generated questions the paper answers
    main_findings: List[str]
    publication_date: Optional[str] = None


def extract_title_authors_from_text(text: str) -> Tuple[str, List[str]]:
    """
    Extract title and authors from document text.

    LEARNING POINT:
    In real papers, title is usually at the top and authors follow.
    We use regex patterns to find them.

    Args:
        text: Full document text

    Returns:
        (title, list of authors)
    """
    try:
        # Split by newlines and get first few lines
        lines = text.split("\n")[:20]

        # Title is usually the first non-empty line
        title = ""
        for line in lines:
            if len(line.strip()) > 10 and len(line.strip()) < 300:
                title = line.strip()
                break

        # Authors often come after title with common patterns
        authors = []
        author_section = "\n".join(lines[:10])

        # Look for common author formats: "Name Address" or "FirstName LastName, University"
        email_pattern = r"[\w\.-]+@[\w\.-]+"
        if re.search(email_pattern, author_section):
            # Likely has author info
            for line in lines[1:10]:
                if "@" in line or any(
                    word in line.lower()
                    for word in ["univ", "college", "institute", "lab"]
                ):
                    authors.append(line.strip())

        return title, authors[:5]  # Return up to 5 authors

    except Exception as e:
        logger.warning(f"Could not extract title/authors: {str(e)}")
        return "", []


def chunk_document(
    text: str,
    strategy: ChunkingStrategy = ChunkingStrategy.HYBRID,
    chunk_size: int = 500,
    overlap: int = 100,
) -> List[DocumentChunk]:
    """
    Split a document into chunks for RAG.

    LEARNING POINT - WHY CHUNKING MATTERS:
    ======================================

    Imagine embedding a 50-page paper as ONE vector:
    - It becomes a generic "mix of everything" vector
    - Query "What's the methodology?" might not match well

    With 50 chunks (1 page each):
    - Chunk 1: Introduction (different vector)
    - Chunk 15: Methodology (similar to methodology queries!)
    - Query "methodology" matches chunk 15 perfectly

    OVERLAP:
    If we just split without overlap:
    - Chunk 1: "...the model uses attention. This is important because..."
    - Chunk 2: "...because we need long-range dependencies..."

    The sentence spanning chunks gets cut! With overlap:
    - Chunk 1: "...the model uses attention. This is important because..."
    - Chunk 2: "...This is important because we need long-range dependencies..."
    ^^^ "This is important because..." appears in both!
    So semantic meaning is preserved.

    Args:
        text: Full document text
        strategy: How to split (fixed, semantic, hybrid)
        chunk_size: Max characters per chunk
        overlap: Overlapping characters between chunks

    Returns:
        List of DocumentChunk objects
    """
    if not text or len(text) < 100:
        logger.warning("Document too short for chunking")
        return []

    chunks = []

    if strategy == ChunkingStrategy.FIXED_SIZE:
        chunks = _chunk_fixed_size(text, chunk_size, overlap)
    elif strategy == ChunkingStrategy.SEMANTIC:
        chunks = _chunk_semantic(text, chunk_size)
    elif strategy == ChunkingStrategy.PARAGRAPH:
        chunks = _chunk_by_paragraph(text, chunk_size, overlap)
    else:  # HYBRID
        chunks = _chunk_hybrid(text, chunk_size, overlap)

    logger.info(f"[+] Split document into {len(chunks)} chunks using {strategy.value}")
    return chunks


def _chunk_fixed_size(
    text: str, chunk_size: int = 500, overlap: int = 100
) -> List[DocumentChunk]:
    """
    Simple fixed-size chunking.

    LEARNING POINT:
    Pros: Simple, predictable
    Cons: Might cut sentences in half
    Use when: Quick/simple documents

    Algorithm:
    - Start at position 0
    - Read chunk_size characters
    - Move forward by (chunk_size - overlap)
    - Repeat until end of text
    """
    chunks = []
    step = chunk_size - overlap

    pos = 0
    chunk_idx = 0

    while pos < len(text):
        # Get chunk
        start = pos
        end = min(pos + chunk_size, len(text))
        content = text[start:end].strip()

        if content:  # Only add non-empty chunks
            chunks.append(
                DocumentChunk(
                    content=content,
                    chunk_index=chunk_idx,
                    start_char=start,
                    end_char=end,
                )
            )
            chunk_idx += 1

        pos += step

    return chunks


def _chunk_semantic(text: str, max_chunk_size: int = 500) -> List[DocumentChunk]:
    """
    Split by natural semantic boundaries (sections, paragraphs).

    LEARNING POINT:
    Pros: Respects document structure, no orphaned sentences
    Cons: Chunks might be uneven sizes
    Use when: Well-structured papers with clear sections

    Strategy:
    1. Look for section headers (## Title, ### Subtitle)
    2. Group content under headers
    3. If a section is too big, split it further
    """
    chunks = []
    chunk_idx = 0

    # Look for markdown-style headers or numbered sections
    # Examples: "## Section", "### Subsection", "1. Introduction"
    header_pattern = r"^(#{1,6}\s+.*|^\d+\.\s+.*?)$"

    lines = text.split("\n")
    current_section = ""
    current_heading = ""
    start_pos = 0

    for i, line in enumerate(lines):
        is_header = re.match(header_pattern, line.strip())

        if is_header and current_section:
            # Save current section
            if len(current_section) > 0:
                chunk_content = current_section.strip()
                if chunk_content:
                    chunks.append(
                        DocumentChunk(
                            content=chunk_content,
                            chunk_index=chunk_idx,
                            start_char=start_pos,
                            end_char=start_pos + len(current_section),
                            heading=current_heading,
                        )
                    )
                    chunk_idx += 1

            # Start new section
            current_heading = line.strip()
            current_section = ""
            start_pos = i

        current_section += line + "\n"

        # If current section is too big, split it
        if len(current_section) > max_chunk_size:
            chunk_content = current_section.strip()
            if chunk_content:
                chunks.append(
                    DocumentChunk(
                        content=chunk_content,
                        chunk_index=chunk_idx,
                        start_char=start_pos,
                        end_char=start_pos + len(current_section),
                        heading=current_heading,
                    )
                )
                chunk_idx += 1
            current_section = ""
            start_pos = i

    # Don't forget the last section
    if current_section.strip():
        chunks.append(
            DocumentChunk(
                content=current_section.strip(),
                chunk_index=chunk_idx,
                start_char=start_pos,
                end_char=start_pos + len(current_section),
                heading=current_heading,
            )
        )

    return chunks


def _chunk_by_paragraph(
    text: str, max_size: int = 500, overlap: int = 100
) -> List[DocumentChunk]:
    """
    Split by paragraphs (blank lines separate paragraphs).

    LEARNING POINT:
    Pros: Respects paragraph boundaries (semantic!), no cut sentences
    Cons: Some paragraphs might be too big
    Use when: Documents with clear paragraph structure

    Strategy:
    1. Split by double newlines (paragraph breaks)
    2. Group paragraphs to fill chunk_size
    3. Add overlap between chunks
    """
    # Split by double newlines (paragraph breaks)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current_chunk = ""
    chunk_idx = 0
    start_idx = 0

    for i, paragraph in enumerate(paragraphs):
        # Try to add paragraph to current chunk
        test_chunk = current_chunk + "\n\n" + paragraph if current_chunk else paragraph

        if len(test_chunk) <= max_size:
            # Fits! Add it
            current_chunk = test_chunk
        else:
            # Doesn't fit
            if current_chunk:
                # Save current chunk
                chunks.append(
                    DocumentChunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_idx,
                        start_char=sum(len(p) + 2 for p in paragraphs[:start_idx]),
                        end_char=sum(len(p) + 2 for p in paragraphs[:i]),
                    )
                )
                chunk_idx += 1

            # Start new chunk with this paragraph
            current_chunk = paragraph
            start_idx = i

    # Save last chunk
    if current_chunk:
        chunks.append(
            DocumentChunk(
                content=current_chunk.strip(),
                chunk_index=chunk_idx,
                start_char=sum(len(p) + 2 for p in paragraphs[:start_idx]),
                end_char=len(text),
            )
        )

    return chunks


def _chunk_hybrid(
    text: str, chunk_size: int = 500, overlap: int = 100
) -> List[DocumentChunk]:
    """
    Hybrid strategy: semantic first, then break big sections with fixed-size.

    LEARNING POINT:
    Combines benefits of semantic (respects structure) and fixed-size (predictable).

    Strategy:
    1. Try to split by sections (semantic)
    2. If a section is too big, split it further (fixed-size)
    3. Add overlap within sections
    """
    # First try semantic split
    semantic_chunks = _chunk_semantic(text, chunk_size)

    # Then refine with fixed-size if needed
    result = []
    chunk_idx = 0

    for chunk in semantic_chunks:
        if len(chunk.content) <= chunk_size:
            # Chunk is small enough, keep as is
            chunk.chunk_index = chunk_idx
            result.append(chunk)
            chunk_idx += 1
        else:
            # Chunk is too big, split it further with fixed-size
            sub_chunks = _chunk_fixed_size(chunk.content, chunk_size, overlap)
            for sub_chunk in sub_chunks:
                sub_chunk.chunk_index = chunk_idx
                sub_chunk.heading = chunk.heading
                result.append(sub_chunk)
                chunk_idx += 1

    return result


def extract_metadata(
    text: str,
    title: Optional[str] = None,
    authors: Optional[List[str]] = None,
    abstract: Optional[str] = None,
) -> ExtractedMetadata:
    """
    Extract important metadata from document.

    LEARNING POINT - WHY METADATA MATTERS:
    ======================================

    Metadata helps the RAG system understand context:

    Without metadata:
    - Query: "Who wrote this?"
    - System searches chunks, finds author name buried in text
    - Slow and error-prone

    With metadata:
    - Query: "Who wrote this?"
    - System immediately knows: metadata.authors = ["John Doe", ...]
    - Instant, reliable answer!

    Args:
        text: Document text
        title: Title (auto-extracted if not provided)
        authors: Authors list (auto-extracted if not provided)
        abstract: Abstract (auto-extracted if not provided)

    Returns:
        ExtractedMetadata object with all important fields
    """

    # Extract title and authors if not provided
    if not title:
        title, extracted_authors = extract_title_authors_from_text(text)
        if not authors:
            authors = extracted_authors

    # Extract or use provided abstract (usually first paragraph)
    if not abstract:
        first_para = text.split("\n\n")[0] if "\n\n" in text else text[:500]
        abstract = first_para[:200] + "..." if len(first_para) > 200 else first_para

    # Extract keywords using simple heuristics
    keywords = _extract_keywords(text, abstract, title)

    # Generate summary of what paper does
    summary = _generate_summary(text, abstract, keywords)

    # Generate questions this paper might answer
    questions = _generate_questions(title, abstract, keywords)

    # Extract main findings
    findings = _extract_findings(text)

    return ExtractedMetadata(
        title=title,
        authors=authors,
        abstract=abstract,
        keywords=keywords,
        summary=summary,
        questions=questions,
        main_findings=findings,
    )


def _extract_keywords(text: str, abstract: str, title: str) -> List[str]:
    """
    Extract keywords from document.

    LEARNING POINT:
    Simple heuristic: look for words that appear
    - In title (clearly important)
    - Repeated in abstract
    - Technical terms (contain capital letters, numbers)

    In production, you'd use NLP libraries like NLTK or spaCy.
    """
    keywords = set()

    # Keywords from title
    title_words = [w.lower() for w in title.split() if len(w) > 4]
    keywords.update(title_words[:3])

    # Repeated words in abstract
    abstract_lower = abstract.lower()
    words = re.findall(r"\b[a-z]{4,}\b", abstract_lower)

    # Count word frequency
    from collections import Counter

    word_freq = Counter(words)

    # Take top 5 most frequent
    top_words = [word for word, _ in word_freq.most_common(5)]
    keywords.update(top_words)

    # Look for hyphenated terms (often technical)
    technical_terms = re.findall(r"[a-z]+-[a-z]+", abstract_lower)
    keywords.update(technical_terms[:3])

    return list(keywords)[:10]  # Return up to 10 keywords


def _generate_summary(text: str, abstract: str, keywords: List[str]) -> str:
    """
    Generate a short summary of the paper.

    LEARNING POINT:
    In a real system, you'd use an LLM or abstractive summarization.
    This is a simple extractive approach: combine abstract + key sentences.
    """
    summary = abstract

    # Try to add one more sentence from the text
    sentences = re.split(r"[.!?]+", text)
    long_sentences = [s.strip() for s in sentences if 50 < len(s.strip()) < 300]

    if long_sentences:
        summary += " " + long_sentences[0] + "."

    return summary[:500]  # Keep under 500 characters


def _generate_questions(title: str, abstract: str, keywords: List[str]) -> List[str]:
    """
    Generate questions this paper might answer.

    LEARNING POINT:
    These questions help with semantic search:
    User asks: "How do you implement X?"
    System matches this to auto-generated question: "What is the implementation?"
    System retrieves relevant chunks → good answer!

    In production: use LLMs to generate better questions.
    """
    questions = []

    # Question about what the paper does
    if title:
        questions.append(f"What is {title.lower()}?")

    # Questions about keywords
    for keyword in keywords[:3]:
        questions.append(f"How does this paper use {keyword}?")
        questions.append(f"What is the role of {keyword}?")

    # General questions
    questions.append("What problem does this paper solve?")
    questions.append("What is the main contribution?")

    return questions[:8]  # Top 8 questions


def _extract_findings(text: str) -> List[str]:
    """
    Extract main findings/results.

    LEARNING POINT:
    Look for sections with "Results", "Findings", "Conclusion"
    Extract key statements from those sections.
    """
    findings = []

    # Look for results/findings section
    result_pattern = (
        r"(Results?|Findings?|Conclusions?)[\s\n]+(.*?)(?=\n\n|References|$)"
    )

    matches = re.finditer(result_pattern, text, re.IGNORECASE | re.DOTALL)
    for match in matches:
        section_text = match.group(2)
        # Split into sentences and take first 3
        sentences = re.split(r"[.!?]+", section_text)
        for sentence in sentences[:3]:
            sentence = sentence.strip()
            if 20 < len(sentence) < 200:
                findings.append(sentence)

    return findings[:5]  # Top 5 findings
