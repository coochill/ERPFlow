"""Evaluate ERPFlow RAG answer generation and citation quality."""

import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from erpflow_ai.usage import GeminiDailyLimitExceeded
from erpflow_rag.llm import GeminiGenerationError
from erpflow_rag.service import answer_policy_question


TOP_K = 3

OUTPUT_FILE = Path("/app/data/output/rag_generation_evaluation.json")

EVALUATION_CASES = [
    {
        "question": "What is the procurement policy of ERPFlow?",
        "policy_id": "NTC-PRC-001",
        "version": "2.0",
        "facts": [
            [r"purchase request"],
            [r"approval"],
            [r"approved supplier"],
            [r"three written quotes", r"three quotes"],
            [r"2 business days"],
        ],
    },
    {
        "question": "What are the approval requirements for purchase requests?",
        "policy_id": "NTC-PRC-001",
        "version": "2.0",
        "facts": [
            [r"buyer.{0,100}2,?500|2,?500.{0,100}buyer"],
            [r"procurement lead.{0,100}10,?000|10,?000.{0,100}procurement lead"],
            [r"finance controller.{0,100}50,?000|50,?000.{0,100}finance controller"],
            [r"chief financial officer", r"\bcfo\b"],
            [r"cannot approve their own", r"no self-approval"],
        ],
    },
    {
        "question": "What is the company inventory management policy?",
        "policy_id": "NTC-INV-001",
        "version": "1.2",
        "facts": [
            [r"reorder point", r"rop"],
            [r"replenishment"],
            [r"cycle count"],
            [r"stock adjustment"],
            [r"returned stock"],
        ],
    },
    {
        "question": "What is the procedure for handling returned items?",
        "policy_id": "NTC-RET-001",
        "version": "1.3",
        "facts": [
            [r"30 calendar days"],
            [r"60 calendar days"],
            [r"rma"],
            [r"15%"],
            [r"original packaging"],
            [r"7 business days"],
        ],
    },
    {
        "question": "What guidelines should employees follow when using AI in ERPFlow?",
        "policy_id": "NTC-AI-001",
        "version": "1.0",
        "facts": [
            [r"policy id", r"policy identifier"],
            [r"current effective version", r"current version"],
            [r"cannot approve", r"may not approve"],
            [r"sensitive data"],
            [r"human review", r"reviewed and approved"],
            [r"conflicting rules", r"conflicting policies"],
        ],
    },
    {
        "question": "Who approves a purchase request above $50,000?",
        "policy_id": "NTC-PRC-001",
        "version": "2.0",
        "facts": [
            [r"chief financial officer", r"\bcfo\b"],
            [r"50,?000"],
        ],
    },
    {
        "question": "How many supplier quotations are required for purchases above $10,000?",
        "policy_id": "NTC-PRC-001",
        "version": "2.0",
        "facts": [
            [r"three", r"3"],
            [r"written quotes", r"written quotations"],
            [r"different approved suppliers"],
        ],
    },
    {
        "question": "How is the inventory reorder point calculated?",
        "policy_id": "NTC-INV-001",
        "version": "1.2",
        "facts": [
            [r"average daily demand", r"\badd\b"],
            [r"lead time"],
            [r"safety stock"],
        ],
    },
    {
        "question": "When should a replenishment request be converted into a purchase request?",
        "policy_id": "NTC-INV-001",
        "version": "1.2",
        "facts": [
            [r"one business day", r"1 business day"],
            [r"purchase requisition", r"\bpr\b"],
        ],
    },
    {
        "question": "How long do customers have to return standard and defective items?",
        "policy_id": "NTC-RET-001",
        "version": "1.3",
        "facts": [
            [r"30 calendar days"],
            [r"60 calendar days"],
        ],
    },
    {
        "question": "What condition must returned items meet before restocking?",
        "policy_id": "NTC-RET-001",
        "version": "1.3",
        "facts": [
            [r"unopened"],
            [r"original packaging"],
            [r"condition check"],
            [r"warehouse supervisor"],
        ],
    },
    {
        "question": "What documents are required to onboard a supplier?",
        "policy_id": "NTC-SUP-001",
        "version": "1.1",
        "facts": [
            [r"legal business name"],
            [r"registered address"],
            [r"tax identification form", r"tax form"],
            [r"bank account", r"bank details"],
            [r"two trade references", r"2 trade references"],
            [r"1,000,000", r"\$1 million", r"one million"],
            [r"code of conduct"],
        ],
    },
    {
        "question": "How should supplier bank detail changes be verified?",
        "policy_id": "NTC-SUP-001",
        "version": "1.1",
        "facts": [
            [r"call-back", r"callback", r"call back"],
            [r"supplier master file"],
            [r"finance controller"],
            [r"email alone", r"email.*not accepted"],
        ],
    },
    {
        "question": "Can the AI assistant approve purchase requests?",
        "policy_id": "NTC-AI-001",
        "version": "1.0",
        "facts": [
            [r"cannot approve", r"may not approve", r"not permitted to approve"],
            [r"human owner", r"human decision"],
        ],
    },
    {
        "question": "What should the AI assistant do when it cannot find an approved policy source?",
        "policy_id": "NTC-AI-001",
        "version": "1.0",
        "facts": [
            [r"no approved source was found", r"no approved source"],
            [r"could not find a confident answer", r"insufficient information"],
            [r"policy owner"],
        ],
    },
]


def check_fact_coverage(answer, expected_facts):
    """Check whether at least one alternative matches each expected fact."""

    normalized = answer.lower()
    matched = []

    for alternatives in expected_facts:
        found = any(
            re.search(pattern, normalized, re.IGNORECASE)
            for pattern in alternatives
        )
        matched.append(found)

    total = len(matched)
    hits = sum(matched)

    return {
        "matched": hits,
        "total": total,
        "coverage": hits / total if total else 0.0,
        "checks": matched,
    }



def extract_section_number(section):
    """Extract the numeric section identifier from a citation or source title."""
    match = re.match(
        r"^\s*(\d+(?:\.\d+)*)\b",
        section,
    )
    return match.group(1) if match else None


def check_citations(answer, sources, expected_policy_id, expected_version):
    """Validate cited policy IDs, versions, and section numbers against retrieved sources."""

    citations = []

    for block in re.findall(r"\(([^()]*)\)", answer):
        headers = list(re.finditer(
            r"(NTC-[A-Z]+-\d+)\s*,\s*Version\s+([\d.]+)",
            block,
            flags=re.IGNORECASE,
        ))

        for index, header in enumerate(headers):
            end = (
                headers[index + 1].start()
                if index + 1 < len(headers)
                else len(block)
            )

            section_text = block[header.end():end]
            sections = re.findall(
                r"\bSection\s+(\d+(?:\.\d+)*)",
                section_text,
                flags=re.IGNORECASE,
            )

            for section in sections:
                citations.append({
                    "policy_id": header.group(1).upper(),
                    "version": header.group(2),
                    "section": section,
                })

    valid_sources = {
        (
            source["policy_id"].upper(),
            source["version"],
            extract_section_number(source["section"]),
        )
        for source in sources
    }

    valid_citations = []
    invalid_citations = []

    for citation in citations:
        source_key = (
            citation["policy_id"],
            citation["version"],
            citation["section"],
        )

        if source_key in valid_sources:
            valid_citations.append(citation)
        else:
            invalid_citations.append(citation)

    expected_citation_present = any(
        citation["policy_id"] == expected_policy_id.upper()
        and citation["version"] == expected_version
        for citation in valid_citations
    )

    return {
        "citation_count": len(citations),
        "valid_count": len(valid_citations),
        "invalid_count": len(invalid_citations),
        "expected_policy_cited": expected_citation_present,
        "valid_citations": valid_citations,
        "invalid_citations": invalid_citations,
    }

def evaluate_case(case):
    """Generate and evaluate one policy answer."""

    result = answer_policy_question(
        question=case["question"],
        top_k=TOP_K,
    )

    answer = result["answer"]
    sources = result["sources"]

    if not sources:
        return {
            "question": case["question"],
            "status": "no_context",
            "answer": answer,
            "source_count": 0,
            "sources": [],
            "manual_review": "not_applicable",
        }

    facts = check_fact_coverage(answer, case["facts"])

    citations = check_citations(
        answer,
        sources,
        case["policy_id"],
        case["version"],
    )

    return {
        "question": case["question"],
        "status": "succeeded",
        "answer": answer,
        "source_count": result["source_count"],
        "sources": sources,
        "fact_coverage": facts,
        "citation_validation": citations,
        "manual_review": "pending",
    }

def save_report(report):
    """Persist the current evaluation progress."""

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    temporary_file = OUTPUT_FILE.with_suffix(".tmp")
    temporary_file.write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    temporary_file.replace(OUTPUT_FILE)


def main():
    """Run generation evaluation and preserve partial results."""

    report = {
        "evaluation": "ERPFlow RAG Generation Evaluation",
        "evaluated_at": datetime.now(
            ZoneInfo("Asia/Manila")
        ).isoformat(),
        "top_k": TOP_K,
        "total_questions": len(EVALUATION_CASES),
        "status": "running",
        "results": [],
    }

    print("=" * 75)
    print("ERPFLOW RAG GENERATION EVALUATION")
    print(f"Questions: {len(EVALUATION_CASES)}")
    print(f"Retrieval cutoff: Top {TOP_K}")
    print("=" * 75)

    for index, case in enumerate(EVALUATION_CASES, start=1):
        print(f"\n{index}/{len(EVALUATION_CASES)}: {case['question']}")

        try:
            result = evaluate_case(case)

        except GeminiDailyLimitExceeded as error:
            report["status"] = "stopped_daily_limit"
            report["stop_reason"] = str(error)
            print("\nDaily Gemini limit reached. Stopping evaluation.")
            break

        except GeminiGenerationError as error:
            result = {
                "question": case["question"],
                "status": "generation_failed",
                "error": str(error),
                "manual_review": "not_applicable",
            }

        except Exception as error:
            result = {
                "question": case["question"],
                "status": "evaluation_failed",
                "error": str(error),
                "manual_review": "not_applicable",
            }

        report["results"].append(result)
        save_report(report)

        if result["status"] == "succeeded":
            facts = result["fact_coverage"]
            citations = result["citation_validation"]

            print(f"   Fact coverage: {facts['matched']}/{facts['total']}")
            print(
                "   Valid citations: "
                f"{citations['valid_count']}/{citations['citation_count']}"
            )
            print(
                "   Expected policy cited: "
                f"{citations['expected_policy_cited']}"
            )
        else:
            print(f"   Status: {result['status']}")

    if report["status"] == "running":
        report["status"] = (
            "completed"
            if len(report["results"]) == len(EVALUATION_CASES)
            else "completed_with_failures"
        )

    successful = [
        result for result in report["results"]
        if result["status"] == "succeeded"
    ]
    total_citations = sum(
        result["citation_validation"]["citation_count"]
        for result in successful
    )

    valid_citations = sum(
        result["citation_validation"]["valid_count"]
        for result in successful
    )

    invalid_citations = sum(
        result["citation_validation"]["invalid_count"]
        for result in successful
    )

    report["summary"] = {
        "completed_questions": len(report["results"]),
        "successful_generations": len(successful),
        "failed_generations": sum(
            result["status"] != "succeeded"
            for result in report["results"]
        ),
        "mean_fact_coverage": (
            sum(
                result["fact_coverage"]["coverage"]
                for result in successful
            ) / len(successful)
            if successful else 0.0
        ),
        "expected_policy_citation_rate": (
            sum(
                result["citation_validation"]["expected_policy_cited"]
                for result in successful
            ) / len(successful)
            if successful else 0.0
        ),
        "total_citations": total_citations,
        "valid_citations": valid_citations,
        "invalid_citations": invalid_citations,
        "citation_precision": (
            valid_citations / total_citations
            if total_citations else 0.0
        ),
        "manual_reviews_pending": len(successful),
    }

    save_report(report)

    print("\n" + "=" * 75)
    print("GENERATION EVALUATION SUMMARY")
    print(json.dumps(report["summary"], indent=2))
    print(f"Status: {report['status']}")
    print(f"Report: {OUTPUT_FILE}")
    print("=" * 75)


if __name__ == "__main__":
    main()
