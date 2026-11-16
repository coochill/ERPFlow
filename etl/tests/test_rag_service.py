from erpflow_rag import service
from erpflow_rag.chunking import PolicyChunk
from erpflow_rag.retrieval import RetrievalResult


def test_answer_policy_question_does_not_call_gemini_without_results(
    monkeypatch,
):
    def mock_retrieve_policy_chunks(question, top_k):
        return []

    def mock_generate_answer(*args, **kwargs):
        raise AssertionError(
            "Gemini should not be called when no policy results exist."
        )

    monkeypatch.setattr(
        service,
        "retrieve_policy_chunks",
        mock_retrieve_policy_chunks,
    )

    monkeypatch.setattr(
        service,
        "generate_answer",
        mock_generate_answer,
    )

    result = service.answer_policy_question(
        question="xyzzy quux nonexistentterm",
        top_k=5,
    )

    assert result["question"] == "xyzzy quux nonexistentterm"
    assert result["source_count"] == 0
    assert result["sources"] == []
    assert "couldn't find relevant information" in result["answer"]


def test_answer_policy_question_generates_grounded_answer(
    monkeypatch,
):
    question = "Who approves purchase requests above $50,000?"

    chunk = PolicyChunk(
        chunk_id="NTC-PRC-001:006",
        source="procurement_policy.md",
        policy_id="NTC-PRC-001",
        title="Procurement Policy",
        version="2.0",
        effective_date="2026-02-01",
        section="4.1 Approval Thresholds",
        text="Purchase requests above $50,000 require CFO approval.",
    )

    retrieval_result = RetrievalResult(
        chunk=chunk,
        score=5.0,
        matched_terms=("purchase", "approval"),
    )

    captured = {}

    def mock_retrieve_policy_chunks(question, top_k):
        captured["question"] = question
        captured["top_k"] = top_k
        return [retrieval_result]

    def mock_generate_answer(prompt, system_instruction):
        captured["prompt"] = prompt
        captured["system_instruction"] = system_instruction
        return (
            "Purchase requests above $50,000 require CFO approval "
            "(NTC-PRC-001, Section 4.1)."
        )

    monkeypatch.setattr(
        service,
        "retrieve_policy_chunks",
        mock_retrieve_policy_chunks,
    )

    monkeypatch.setattr(
        service,
        "generate_answer",
        mock_generate_answer,
    )

    result = service.answer_policy_question(
        question=question,
        top_k=3,
    )

    assert captured["question"] == question
    assert captured["top_k"] == 3

    assert question in captured["prompt"]
    assert chunk.text in captured["prompt"]
    assert "NTC-PRC-001" in captured["prompt"]

    assert captured["system_instruction"] == service.SYSTEM_INSTRUCTION

    assert result["question"] == question
    assert result["answer"] == (
        "Purchase requests above $50,000 require CFO approval "
        "(NTC-PRC-001, Section 4.1)."
    )

    assert result["source_count"] == 1
    assert result["sources"] == [
        {
            "chunk_id": "NTC-PRC-001:006",
            "source": "procurement_policy.md",
            "policy_id": "NTC-PRC-001",
            "title": "Procurement Policy",
            "version": "2.0",
            "effective_date": "2026-02-01",
            "section": "4.1 Approval Thresholds",
        }
    ]
