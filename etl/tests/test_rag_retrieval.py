from pathlib import Path

import pytest

from erpflow_rag import load_policies, chunk_policies, search_chunks


KNOWLEDGE_BASE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "knowledge_base"
)


@pytest.fixture(scope="module")
def chunks():
    return chunk_policies(load_policies(KNOWLEDGE_BASE))


@pytest.mark.parametrize(
    ("query", "policy_id", "section_fragment"),
    [
        (
            "What is the standard return window?",
            "NTC-RET-001",
            "4.1 Return Window",
        ),
        (
            "Who approves a purchase above $50,000?",
            "NTC-PRC-001",
            "4.1 Approval Thresholds",
        ),
        (
            "How soon must stock adjustments be completed?",
            "NTC-INV-001",
            "4.6 Stock Adjustment Deadline",
        ),
        (
            "How are supplier bank detail changes verified?",
            "NTC-SUP-001",
            "4.4 Bank Detail Changes",
        ),
        (
            "Can the AI assistant approve purchase requests autonomously?",
            "NTC-AI-001",
            "4.3 No Autonomous Decisions",
        ),
    ],
)
def test_retrieves_relevant_policy_sections(
    chunks, query, policy_id, section_fragment
):
    results = search_chunks(query, chunks, top_k=5)

    assert results
    assert any(
        result.chunk.policy_id == policy_id
        and section_fragment in result.chunk.section
        for result in results
    )


def test_results_include_citation_metadata(chunks):
    results = search_chunks(
        "What is the standard return window?",
        chunks,
        top_k=3,
    )

    assert results

    result = results[0]
    assert result.chunk.source == "returns_policy.md"
    assert result.chunk.policy_id == "NTC-RET-001"
    assert result.chunk.version
    assert result.chunk.effective_date
    assert result.chunk.section
    assert result.score > 0
    assert result.matched_terms


def test_empty_query_returns_no_results(chunks):
    assert search_chunks("", chunks) == []
    assert search_chunks("the and what", chunks) == []


def test_top_k_must_be_positive(chunks):
    with pytest.raises(ValueError, match="top_k"):
        search_chunks("inventory", chunks, top_k=0)


def test_no_matching_terms_returns_no_results(chunks):
    results = search_chunks(
        "xyzzy quux nonexistentterm",
        chunks,
    )

    assert results == []

def test_purchase_threshold_question_ranks_threshold_section_first(chunks):
    results = search_chunks(
        "Who approves a purchase above $50,000?",
        chunks,
        top_k=3,
    )

    assert results
    assert results[0].chunk.policy_id == "NTC-PRC-001"
    assert "4.1 Approval Thresholds" in results[0].chunk.section
