
"""Application service for ERPFlow policy retrieval and answering."""

from functools import lru_cache

from erpflow_rag.chunking import PolicyChunk, chunk_policies
from erpflow_rag.documents import load_policies
from erpflow_rag.llm import generate_answer
from erpflow_rag.prompts import SYSTEM_INSTRUCTION, build_rag_prompt
from erpflow_rag.retrieval import RetrievalResult, search_chunks


@lru_cache(maxsize=1)
def get_policy_chunks() -> tuple[PolicyChunk, ...]:
    """Load and chunk the knowledge base once per service process."""

    documents = load_policies()
    return tuple(chunk_policies(documents))


def retrieve_policy_chunks(
    question: str,
    top_k: int = 5,
) -> list[RetrievalResult]:
    """Retrieve the most relevant policy chunks for a question."""

    chunks = list(get_policy_chunks())

    return search_chunks(
        query=question,
        chunks=chunks,
        top_k=top_k,
    )


def answer_policy_question(
    question: str,
    top_k: int = 5,
) -> dict:
    """Retrieve policy context and generate a grounded answer."""

    results = retrieve_policy_chunks(
        question=question,
        top_k=top_k,
    )

    # Do not call Gemini when no relevant policy context is found.
    if not results:
        return {
            "question": question,
            "answer": (
                "I couldn't find relevant information in the available "
                "company policies to answer your question."
            ),
            "source_count": 0,
            "sources": [],
        }

    prompt = build_rag_prompt(
        question=question,
        results=results,
    )

    answer = generate_answer(
        prompt=prompt,
        system_instruction=SYSTEM_INSTRUCTION,
    )

    sources = [
        {
            "chunk_id": result.chunk.chunk_id,
            "source": result.chunk.source,
            "policy_id": result.chunk.policy_id,
            "title": result.chunk.title,
            "version": result.chunk.version,
            "effective_date": result.chunk.effective_date,
            "section": result.chunk.section,
        }
        for result in results
    ]

    return {
        "question": question,
        "answer": answer,
        "source_count": len(sources),
        "sources": sources,
    }
