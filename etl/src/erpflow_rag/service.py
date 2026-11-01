"""Application service for ERPFlow policy retrieval."""

from functools import lru_cache

from erpflow_rag.chunking import PolicyChunk, chunk_policies
from erpflow_rag.documents import load_policies
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