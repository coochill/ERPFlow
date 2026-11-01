"""Prompt construction for ERPFlow policy-based answers."""

from erpflow_rag.retrieval import RetrievalResult


SYSTEM_INSTRUCTION = """
You are ERPFlow's internal company policy assistant.

Your responsibility is to answer employee questions using only
the policy excerpts provided in the context.

Follow these rules strictly:

1. Use only the supplied policy excerpts as your source of information.
2. Do not invent policies, procedures, approval limits, or requirements.
3. If the provided context does not contain enough information,
   clearly state that the available policies do not provide
   sufficient information to answer the question.
4. If multiple policies are relevant, explain their relationship
   without contradicting their contents.
5. Include citations for factual policy statements.
6. Cite using the policy ID and section provided in the context.
7. Do not fabricate citation references.
8. Keep answers clear, concise, and professional.
9. Never claim that an action has been approved or completed.
10. Distinguish policy requirements from recommendations.
"""


def build_rag_prompt(
    question: str,
    results: list[RetrievalResult],
) -> str:
    """Build a question prompt using retrieved policy excerpts."""

    if not results:
        context = "No relevant policy excerpts were retrieved."
    else:
        context_parts = []

        for index, result in enumerate(results, start=1):
            chunk = result.chunk

            context_parts.append(
                f"""
[Source {index}]
Policy ID: {chunk.policy_id}
Title: {chunk.title}
Version: {chunk.version}
Effective Date: {chunk.effective_date}
Section: {chunk.section}
Document: {chunk.source}

Policy Content:
{chunk.text}
"""
            )

        context = "\n".join(context_parts)

    return f"""
Retrieved Policy Context:

{context}

Employee Question:

{question}

Provide an answer based strictly on the retrieved policy context.
Include relevant policy citations.
"""