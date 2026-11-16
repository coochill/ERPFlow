
"""Evaluate ERPFlow policy retrieval using Recall@3 and MRR."""

from erpflow_rag.service import get_policy_chunks, retrieve_policy_chunks


EVALUATION_CASES = [
    {
        "question": "What is the procurement policy of ERPFlow?",
        "relevant_chunks": {
            "NTC-PRC-001:005",
            "NTC-PRC-001:006",
            "NTC-PRC-001:007",
            "NTC-PRC-001:008",
            "NTC-PRC-001:009",
            "NTC-PRC-001:010",
            "NTC-PRC-001:011",
            "NTC-PRC-001:012",
            "NTC-PRC-001:013",
            "NTC-PRC-001:015",
        },
    },
    {
        "question": "What are the approval requirements for purchase requests?",
        "relevant_chunks": {
            "NTC-PRC-001:006",
            "NTC-PRC-001:007",
            "NTC-PRC-001:011",
            "NTC-PRC-001:014",
            "NTC-PRC-001:015",
        },
    },
    {
        "question": "What is the company inventory management policy?",
        "relevant_chunks": {
            "NTC-INV-001:005",
            "NTC-INV-001:006",
            "NTC-INV-001:007",
            "NTC-INV-001:008",
            "NTC-INV-001:009",
            "NTC-INV-001:010",
            "NTC-INV-001:011",
            "NTC-INV-001:012",
        },
    },
    {
        "question": "What is the procedure for handling returned items?",
        "relevant_chunks": {
            "NTC-RET-001:006",
            "NTC-RET-001:007",
            "NTC-RET-001:008",
            "NTC-RET-001:009",
            "NTC-RET-001:010",
            "NTC-RET-001:011",
            "NTC-RET-001:012",
            "NTC-RET-001:013",
            "NTC-RET-001:016",
        },
    },
    {
        "question": "What guidelines should employees follow when using AI in ERPFlow?",
        "relevant_chunks": {
            "NTC-AI-001:006",
            "NTC-AI-001:007",
            "NTC-AI-001:008",
            "NTC-AI-001:009",
            "NTC-AI-001:010",
            "NTC-AI-001:011",
            "NTC-AI-001:012",
            "NTC-AI-001:013",
            "NTC-AI-001:014",
            "NTC-AI-001:016",
        },
    },

    {
        "question": "Who approves a purchase request above $50,000?",
        "relevant_chunks": {
            "NTC-PRC-001:006",
        },
    },
    {
        "question": "How many supplier quotations are required for purchases above $10,000?",
        "relevant_chunks": {
            "NTC-PRC-001:010",
        },
    },
    {
        "question": "How is the inventory reorder point calculated?",
        "relevant_chunks": {
            "NTC-INV-001:006",
        },
    },
    {
        "question": "When should a replenishment request be converted into a purchase request?",
        "relevant_chunks": {
            "NTC-INV-001:007",
        },
    },
    {
        "question": "How long do customers have to return standard and defective items?",
        "relevant_chunks": {
            "NTC-RET-001:006",
        },
    },
    {
        "question": "What condition must returned items meet before restocking?",
        "relevant_chunks": {
            "NTC-RET-001:009",
        },
    },
    {
        "question": "What documents are required to onboard a supplier?",
        "relevant_chunks": {
            "NTC-SUP-001:007",
        },
    },
    {
        "question": "How should supplier bank detail changes be verified?",
        "relevant_chunks": {
            "NTC-SUP-001:009",
        },
    },
    {
        "question": "Can the AI assistant approve purchase requests?",
        "relevant_chunks": {
            "NTC-AI-001:008",
        },
    },
    {
        "question": "What should the AI assistant do when it cannot find an approved policy source?",
        "relevant_chunks": {
            "NTC-AI-001:010",
            "NTC-AI-001:011",
        },
    },
]
TOP_K = 3


def evaluate_case(case, available_chunk_ids):
    """Calculate Recall@K, reciprocal rank, and top-K hit."""

    relevant = case["relevant_chunks"] & available_chunk_ids

    if not relevant:
        raise ValueError(
            f"No valid relevant chunks for: {case['question']}"
        )

    results = retrieve_policy_chunks(
        case["question"],
        top_k=TOP_K,
    )

    retrieved_ids = [
        result.chunk.chunk_id for result in results
    ]

    hits = sum(
        chunk_id in relevant for chunk_id in retrieved_ids
    )

    recall = hits / len(relevant)

    reciprocal_rank = 0.0

    for rank, chunk_id in enumerate(retrieved_ids, start=1):
        if chunk_id in relevant:
            reciprocal_rank = 1 / rank
            break

    return {
        "retrieved_ids": retrieved_ids,
        "hits": hits,
        "recall": recall,
        "reciprocal_rank": reciprocal_rank,
        "hit": int(hits > 0),
    }


def main():
    """Run the retrieval evaluation and print aggregate metrics."""

    chunks = get_policy_chunks()
    available_chunk_ids = {
        chunk.chunk_id for chunk in chunks
    }

    results = []

    print("=" * 75)
    print("ERPFLOW RAG RETRIEVAL EVALUATION")
    print(f"Knowledge base chunks: {len(chunks)}")
    print(f"Evaluation questions: {len(EVALUATION_CASES)}")
    print(f"Retrieval cutoff: Top {TOP_K}")
    print("=" * 75)

    for index, case in enumerate(EVALUATION_CASES, start=1):
        result = evaluate_case(case, available_chunk_ids)
        results.append(result)

        print(f"\n{index}. {case['question']}")
        print(f"   Retrieved: {result['retrieved_ids']}")
        print(f"   Relevant hits: {result['hits']}")
        print(f"   Recall@{TOP_K}: {result['recall']:.4f}")
        print(f"   Reciprocal Rank: {result['reciprocal_rank']:.4f}")

    question_count = len(results)

    mean_recall = sum(
        result["recall"] for result in results
    ) / question_count

    mean_reciprocal_rank = sum(
        result["reciprocal_rank"] for result in results
    ) / question_count

    hit_rate = sum(
        result["hit"] for result in results
    ) / question_count

    print("\n" + "=" * 75)
    print("AGGREGATE RESULTS")
    print(f"Mean Recall@{TOP_K}: {mean_recall:.4f}")
    print(f"Mean Reciprocal Rank: {mean_reciprocal_rank:.4f}")
    print(f"Top-{TOP_K} Hit Rate: {hit_rate:.4f}")
    print("=" * 75)

if __name__ == "__main__":
    main()
