from erpflow_rag import service


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
