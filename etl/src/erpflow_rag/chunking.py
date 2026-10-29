"""Section-aware chunking for ERPFlow policy documents."""

from dataclasses import dataclass
import re

from erpflow_rag.documents import PolicyDocument


SECTION_PATTERN = re.compile(
    r"(?m)^\s*(?:"
    r"#{1,6}\s+\d+(?:\.\d+)*\.?\s+[^\r\n]+"
    r"|\*\*\d+(?:\.\d+)*\.?\s+[^*\r\n]+?\*\*"
    r")(?=\s|$)"
)


@dataclass(frozen=True)
class PolicyChunk:
    chunk_id: str
    source: str
    policy_id: str
    title: str
    version: str
    effective_date: str
    section: str
    text: str


def chunk_policy(document: PolicyDocument) -> list[PolicyChunk]:
    """Split a policy at explicitly formatted numbered headings."""
    matches = list(SECTION_PATTERN.finditer(document.content))
    chunks: list[PolicyChunk] = []

    if not matches:
        text = document.content.strip()
        if text:
            chunks.append(
                _make_chunk(document, "Introduction", text, 1)
            )
        return chunks

    introduction = document.content[:matches[0].start()].strip()

    if introduction:
        chunks.append(
            _make_chunk(document, "Introduction", introduction, 1)
        )

    for index, match in enumerate(matches):
        start = match.start()
        end = (
            matches[index + 1].start()
            if index + 1 < len(matches)
            else len(document.content)
        )

        text = document.content[start:end].strip()
        heading = match.group(0).strip()
        heading = re.sub(r"^#{1,6}\s+", "", heading)
        heading = heading.strip("*").strip()

        if text:
            chunks.append(
                _make_chunk(
                    document,
                    heading,
                    text,
                    len(chunks) + 1,
                )
            )

    return chunks


def chunk_policies(
    documents: list[PolicyDocument],
) -> list[PolicyChunk]:
    """Chunk multiple policies while preserving source metadata."""
    return [
        chunk
        for document in documents
        for chunk in chunk_policy(document)
    ]


def _make_chunk(
    document: PolicyDocument,
    section: str,
    text: str,
    sequence: int,
) -> PolicyChunk:
    return PolicyChunk(
        chunk_id=f"{document.policy_id}:{sequence:03d}",
        source=document.source,
        policy_id=document.policy_id,
        title=document.title,
        version=document.version,
        effective_date=document.effective_date,
        section=section,
        text=text,
    )
