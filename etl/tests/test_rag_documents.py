from pathlib import Path

import pytest

from erpflow_rag import chunk_policies, load_policies, load_policy
import re


KNOWLEDGE_BASE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "knowledge_base"
)


def test_loads_all_five_policies():
    documents = load_policies(KNOWLEDGE_BASE)

    assert len(documents) == 5
    assert {document.source for document in documents} == {
        "inventory_policy.md",
        "procurement_policy.md",
        "supplier_policy.md",
        "returns_policy.md",
        "ai_usage_policy.md",
    }


def test_policy_metadata_is_preserved():
    documents = load_policies(KNOWLEDGE_BASE)

    for document in documents:
        assert document.policy_id.startswith("NTC-")
        assert document.title
        assert document.version
        assert document.effective_date
        assert document.content


def test_returns_policy_contains_restocking_section():
    documents = load_policies(KNOWLEDGE_BASE)
    returns_policy = next(
        doc for doc in documents if doc.source == "returns_policy.md"
    )

    chunks = chunk_policies([returns_policy])

    restocking = [
        chunk for chunk in chunks
        if "4.4 Restocking Eligibility" in chunk.section
    ]

    assert len(restocking) == 1
    assert "original packaging" in restocking[0].text
    assert restocking[0].policy_id == "NTC-RET-001"
    assert restocking[0].source == "returns_policy.md"


def test_missing_metadata_is_rejected(tmp_path):
    invalid_file = tmp_path / "invalid.md"
    invalid_file.write_text("# Missing Metadata\n\nSome content.", encoding="utf-8")

    with pytest.raises(ValueError, match="Policy ID"):
        load_policy(invalid_file)


def test_chunk_ids_are_unique():
    documents = load_policies(KNOWLEDGE_BASE)
    chunks = chunk_policies(documents)

    ids = [chunk.chunk_id for chunk in chunks]

    assert ids
    assert len(ids) == len(set(ids))


def test_numbered_qa_entries_are_not_sections():
    documents = load_policies(KNOWLEDGE_BASE)
    chunks = chunk_policies(documents)

    assert not any(
        re.match(r"^\d+\.\s+\*\*Q:", chunk.section)
        for chunk in chunks
    )


def test_supplier_checklist_stays_inside_section():
    documents = load_policies(KNOWLEDGE_BASE)
    supplier_policy = next(
        doc for doc in documents
        if doc.source == "supplier_policy.md"
    )

    chunks = chunk_policies([supplier_policy])

    checklist_chunks = [
        chunk for chunk in chunks
        if "4.2 Onboarding Package" in chunk.section
    ]

    assert len(checklist_chunks) == 1

    checklist = checklist_chunks[0]
    assert "Legal business name" in checklist.text
    assert "Bank account details" in checklist.text
    assert "Supplier Code of Conduct" in checklist.text
