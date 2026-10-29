"""Load policy documents from the ERPFlow knowledge base."""

from dataclasses import dataclass
from datetime import date
from pathlib import Path
import re


DEFAULT_KNOWLEDGE_BASE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "knowledge_base"
)


@dataclass(frozen=True)
class PolicyDocument:
    source: str
    policy_id: str
    title: str
    version: str
    effective_date: str
    content: str


def _extract(pattern: str, content: str, field: str) -> str:
    match = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
    if not match:
        raise ValueError(f"Missing required policy metadata: {field}")
    return match.group(1).strip()


def load_policy(path: Path) -> PolicyDocument:
    """Load one Markdown policy and extract its identifying metadata."""
    content = path.read_text(encoding="utf-8")

    policy_id = _extract(
        r"Policy ID\s*[:|]\s*([A-Z0-9-]+)",
        content,
        "Policy ID",
    )
    version = _extract(
        r"Version\s*[:|]\s*([0-9]+(?:\.[0-9]+)*)",
        content,
        "Version",
    )
    effective_date = _extract(
        r"Effective Date\s*[:|]\s*(\d{4}-\d{2}-\d{2})",
        content,
        "Effective Date",
    )

    # Validate the date format and that the date is a real calendar date.
    date.fromisoformat(effective_date)

    title_match = re.search(r"^\s*#\s+(.+?)\s*$", content, re.MULTILINE)
    if not title_match:
        raise ValueError(f"Missing policy title in {path.name}")

    return PolicyDocument(
        source=path.name,
        policy_id=policy_id,
        title=title_match.group(1).strip(),
        version=version,
        effective_date=effective_date,
        content=content,
    )


def load_policies(
    knowledge_base: Path | None = None,
) -> list[PolicyDocument]:
    """Load all Markdown policies from the knowledge base directory."""
    directory = Path(knowledge_base or DEFAULT_KNOWLEDGE_BASE)

    if not directory.is_dir():
        raise FileNotFoundError(
            f"Knowledge base directory not found: {directory}"
        )

    paths = sorted(directory.glob("*.md"))
    if not paths:
        raise ValueError(f"No Markdown policies found in {directory}")

    return [load_policy(path) for path in paths]
