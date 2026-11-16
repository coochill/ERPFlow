
import json

import pytest

from scripts import evaluate_rag_generation as evaluator
from erpflow_ai.usage import GeminiDailyLimitExceeded
from erpflow_rag.llm import GeminiGenerationError


def make_source(
    policy_id="NTC-PRC-001",
    version="2.0",
    section="4.1 Approval Thresholds",
):
    return {
        "chunk_id": "NTC-PRC-001:006",
        "source": "procurement_policy.md",
        "policy_id": policy_id,
        "title": "Procurement Policy",
        "version": version,
        "effective_date": "2026-02-01",
        "section": section,
    }


def make_case():
    return {
        "question": "Who approves purchase requests above $50,000?",
        "policy_id": "NTC-PRC-001",
        "version": "2.0",
        "facts": [
            [r"\bcfo\b"],
            [r"50,000"],
        ],
    }


def test_check_fact_coverage_all_facts_match():
    result = evaluator.check_fact_coverage(
        "The CFO approves requests above $50,000.",
        [
            [r"\bcfo\b"],
            [r"50,000"],
        ],
    )

    assert result["matched"] == 2
    assert result["total"] == 2
    assert result["coverage"] == 1.0
    assert result["checks"] == [True, True]


def test_check_fact_coverage_detects_missing_facts():
    result = evaluator.check_fact_coverage(
        "The CFO approves purchase requests.",
        [
            [r"\bcfo\b"],
            [r"50,000"],
        ],
    )

    assert result["matched"] == 1
    assert result["total"] == 2
    assert result["coverage"] == 0.5
    assert result["checks"] == [True, False]


def test_check_fact_coverage_handles_empty_expected_facts():
    result = evaluator.check_fact_coverage("Any answer", [])

    assert result["matched"] == 0
    assert result["total"] == 0
    assert result["coverage"] == 0.0
    assert result["checks"] == []


def test_check_citations_accepts_matching_source():
    answer = (
        "The CFO approves requests above $50,000 "
        "(NTC-PRC-001, Version 2.0, "
        "Section 4.1 Approval Thresholds)."
    )

    result = evaluator.check_citations(
        answer,
        [make_source()],
        "NTC-PRC-001",
        "2.0",
    )

    assert result["citation_count"] == 1
    assert result["valid_count"] == 1
    assert result["invalid_count"] == 0
    assert result["expected_policy_cited"] is True


def test_check_citations_rejects_wrong_section():
    answer = (
        "The CFO approves requests "
        "(NTC-PRC-001, Version 2.0, Section 9.9 Unrelated Section)."
    )

    result = evaluator.check_citations(
        answer,
        [make_source()],
        "NTC-PRC-001",
        "2.0",
    )

    assert result["citation_count"] == 1
    assert result["valid_count"] == 0
    assert result["invalid_count"] == 1
    assert result["expected_policy_cited"] is False


def test_check_citations_rejects_wrong_version():
    answer = (
        "The CFO approves requests "
        "(NTC-PRC-001, Version 1.0, "
        "Section 4.1 Approval Thresholds)."
    )

    result = evaluator.check_citations(
        answer,
        [make_source()],
        "NTC-PRC-001",
        "2.0",
    )

    assert result["valid_count"] == 0
    assert result["invalid_count"] == 1
    assert result["expected_policy_cited"] is False


def test_check_citations_handles_missing_citations():
    result = evaluator.check_citations(
        "The CFO approves requests above $50,000.",
        [make_source()],
        "NTC-PRC-001",
        "2.0",
    )

    assert result["citation_count"] == 0
    assert result["valid_count"] == 0
    assert result["invalid_count"] == 0
    assert result["expected_policy_cited"] is False


def test_evaluate_case_classifies_empty_sources_as_no_context(
    monkeypatch,
):
    def mock_answer_policy_question(question, top_k):
        return {
            "question": question,
            "answer": "No relevant policy information found.",
            "source_count": 0,
            "sources": [],
        }

    monkeypatch.setattr(
        evaluator,
        "answer_policy_question",
        mock_answer_policy_question,
    )

    result = evaluator.evaluate_case(make_case())

    assert result["status"] == "no_context"
    assert result["source_count"] == 0
    assert result["sources"] == []
    assert result["manual_review"] == "not_applicable"


def test_evaluate_case_evaluates_generated_answer(monkeypatch):
    answer = (
        "The CFO approves requests above $50,000 "
        "(NTC-PRC-001, Version 2.0, "
        "Section 4.1 Approval Thresholds)."
    )

    def mock_answer_policy_question(question, top_k):
        assert top_k == evaluator.TOP_K

        return {
            "question": question,
            "answer": answer,
            "source_count": 1,
            "sources": [make_source()],
        }

    monkeypatch.setattr(
        evaluator,
        "answer_policy_question",
        mock_answer_policy_question,
    )

    result = evaluator.evaluate_case(make_case())

    assert result["status"] == "succeeded"
    assert result["fact_coverage"]["coverage"] == 1.0
    assert result["citation_validation"]["valid_count"] == 1
    assert result["citation_validation"]["expected_policy_cited"] is True
    assert result["manual_review"] == "pending"


def test_evaluate_case_propagates_generation_error(monkeypatch):
    def mock_answer_policy_question(question, top_k):
        raise GeminiGenerationError("Mock Gemini failure")

    monkeypatch.setattr(
        evaluator,
        "answer_policy_question",
        mock_answer_policy_question,
    )

    with pytest.raises(GeminiGenerationError):
        evaluator.evaluate_case(make_case())


def test_save_report_writes_valid_json(tmp_path, monkeypatch):
    output_file = tmp_path / "rag_generation_evaluation.json"

    monkeypatch.setattr(
        evaluator,
        "OUTPUT_FILE",
        output_file,
    )

    report = {
        "status": "running",
        "results": [
            {
                "question": "Test question",
                "status": "succeeded",
            }
        ],
    }

    evaluator.save_report(report)

    assert output_file.exists()

    saved_report = json.loads(
        output_file.read_text(encoding="utf-8")
    )

    assert saved_report == report
    assert not output_file.with_suffix(".tmp").exists()


def test_main_stops_when_gemini_daily_limit_is_reached(
    monkeypatch,
    tmp_path,
):
    output_file = tmp_path / "rag_generation_evaluation.json"

    monkeypatch.setattr(
        evaluator,
        "OUTPUT_FILE",
        output_file,
    )

    monkeypatch.setattr(
        evaluator,
        "EVALUATION_CASES",
        [make_case(), make_case()],
    )

    calls = []

    def mock_evaluate_case(case):
        calls.append(case)

        if len(calls) == 1:
            return {
                "question": case["question"],
                "status": "succeeded",
                "answer": "Mock answer",
                "source_count": 1,
                "sources": [make_source()],
                "fact_coverage": {
                    "matched": 2,
                    "total": 2,
                    "coverage": 1.0,
                    "checks": [True, True],
                },
                "citation_validation": {
                    "citation_count": 1,
                    "valid_count": 1,
                    "invalid_count": 0,
                    "expected_policy_cited": True,
                    "valid_citations": [],
                    "invalid_citations": [],
                },
                "manual_review": "pending",
            }

        raise GeminiDailyLimitExceeded()

    monkeypatch.setattr(
        evaluator,
        "evaluate_case",
        mock_evaluate_case,
    )

    evaluator.main()

    saved_report = json.loads(
        output_file.read_text(encoding="utf-8")
    )

    assert len(calls) == 2
    assert saved_report["status"] == "stopped_daily_limit"
    assert len(saved_report["results"]) == 1
    assert saved_report["summary"]["successful_generations"] == 1
    assert saved_report["summary"]["manual_reviews_pending"] == 1


def test_main_records_generation_failure(
    monkeypatch,
    tmp_path,
):
    output_file = tmp_path / "rag_generation_evaluation.json"

    monkeypatch.setattr(
        evaluator,
        "OUTPUT_FILE",
        output_file,
    )

    monkeypatch.setattr(
        evaluator,
        "EVALUATION_CASES",
        [make_case()],
    )

    def mock_evaluate_case(case):
        raise GeminiGenerationError("Mock generation failure")

    monkeypatch.setattr(
        evaluator,
        "evaluate_case",
        mock_evaluate_case,
    )

    evaluator.main()

    saved_report = json.loads(
        output_file.read_text(encoding="utf-8")
    )

    assert saved_report["status"] == "completed"
    assert len(saved_report["results"]) == 1
    assert saved_report["results"][0]["status"] == "generation_failed"
    assert saved_report["summary"]["successful_generations"] == 0
    assert saved_report["summary"]["failed_generations"] == 1


def test_check_citations_accepts_section_number_only():
    answer = (
        "The CFO approves requests "
        "(NTC-PRC-001, Version 2.0, Section 4.1)."
    )

    result = evaluator.check_citations(
        answer,
        [make_source()],
        "NTC-PRC-001",
        "2.0",
    )

    assert result["valid_count"] == 1
    assert result["invalid_count"] == 0
    assert result["expected_policy_cited"] is True


def test_check_citations_accepts_multiple_sections_in_one_parenthesis():
    answer = (
        "The CFO approves requests "
        "(NTC-PRC-001, Version 2.0, Section 4.1; "
        "NTC-PRC-001, Version 2.0, Section 5)."
    )

    sources = [
        make_source(section="4.1 Approval Thresholds."),
        make_source(section="5. Approval Responsibilities"),
    ]

    result = evaluator.check_citations(
        answer,
        sources,
        "NTC-PRC-001",
        "2.0",
    )

    assert result["citation_count"] == 2
    assert result["valid_count"] == 2
    assert result["invalid_count"] == 0
    assert result["expected_policy_cited"] is True


def test_check_citations_rejects_unretrieved_section_number():
    answer = (
        "The CFO approves requests "
        "(NTC-PRC-001, Version 2.0, Section 9.9)."
    )

    result = evaluator.check_citations(
        answer,
        [make_source()],
        "NTC-PRC-001",
        "2.0",
    )

    assert result["valid_count"] == 0
    assert result["invalid_count"] == 1
    assert result["expected_policy_cited"] is False

def test_check_citations_accepts_multiple_sections_with_one_policy_header():
    answer = (
        "Bank changes require verification "
        "(NTC-SUP-001, Version 1.1, Section 4.4 and Section 5)."
    )

    sources = [
        make_source(
            policy_id="NTC-SUP-001",
            version="1.1",
            section="4.4 Bank Detail Changes",
        ),
        make_source(
            policy_id="NTC-SUP-001",
            version="1.1",
            section="5. Finance Approval",
        ),
    ]

    result = evaluator.check_citations(
        answer,
        sources,
        "NTC-SUP-001",
        "1.1",
    )

    assert result["citation_count"] == 2
    assert result["valid_count"] == 2
    assert result["invalid_count"] == 0
    assert result["expected_policy_cited"] is True
