import pytest
from types import SimpleNamespace

from erpflow_ai import service

@pytest.fixture
def anyio_backend():
    return "asyncio"


class FakePart:
    function_call = None


class FakeContent:
    parts = [FakePart()]


class FakeCandidate:
    content = FakeContent()


class FakeResponse:
    candidates = [FakeCandidate()]
    text = "The policy answer is grounded and complete."


class FakeListing:
    tools = []


class FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def list_tools(self):
        return FakeListing()

    async def call_tool(self, name, arguments):
        return None


class FakeTransport:
    def __init__(self):
        self.session = FakeSession()

    async def __aenter__(self):
        return (object(), object(), object())

    async def __aexit__(self, *args):
        return None


@pytest.mark.anyio
async def test_answer_question_preserves_policy_sources_without_tool_calls(
    monkeypatch,
):
    monkeypatch.setenv("ETL_SERVICE_TOKEN", "service-token")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-key")
    monkeypatch.setenv("MCP_CLIENT_MODE", "http")
    monkeypatch.setattr(service, "retrieve_policy_chunks", lambda **kwargs: [])
    monkeypatch.setattr(
        service,
        "streamable_http_client",
        lambda *args, **kwargs: FakeTransport(),
    )
    monkeypatch.setattr(service, "ClientSession", lambda *args: FakeSession())
    monkeypatch.setattr(
        service,
        "_generate",
        lambda *args, **kwargs: _completed(FakeResponse()),
    )

    result = await service.answer_question("Show current stock")

    assert result["answer"] == "The policy answer is grounded and complete."
    assert result["sources"] == []
    assert result["used_live_data"] is False


@pytest.mark.anyio
async def test_policy_question_does_not_open_mcp(monkeypatch):
    class PolicyChunk:
        chunk_id = "chunk-1"
        source = "policy.md"
        policy_id = "POL-001"
        title = "Inventory Policy"
        version = "1"
        effective_date = "2026-01-01"
        section = "Stock"
        text = "Maintain accurate inventory records."

    class Retrieval:
        chunk = PolicyChunk()

    def fail_if_called(*args, **kwargs):
        raise AssertionError("MCP must not be initialized for policy questions")

    monkeypatch.setattr(
        service,
        "retrieve_policy_chunks",
        lambda **kwargs: [Retrieval()],
    )
    monkeypatch.setattr(service, "streamable_http_client", fail_if_called)
    monkeypatch.setattr(
        service,
        "generate_answer",
        lambda **kwargs: "Policy answer [POL-001, Stock].",
    )

    result = await service.answer_question("What is the inventory policy?")

    assert result["answer"] == "Policy answer [POL-001, Stock]."
    assert result["used_live_data"] is False
    assert result["live_tools"] == []
    assert result["source_count"] == 1
    assert result["sources"][0]["policy_id"] == "POL-001"


@pytest.mark.anyio
async def test_tool_calling_rounds_default_to_two(monkeypatch):
    calls = 0

    class Tool:
        name = "get_inventory_items"
        description = "Read inventory."
        input_schema = {"type": "object", "properties": {}}

    class Response:
        text = ""
        candidates = [
            SimpleNamespace(
                content=SimpleNamespace(
                    parts=[
                        SimpleNamespace(
                            function_call=SimpleNamespace(
                                name="get_inventory_items",
                                args={},
                            )
                        )
                    ]
                )
            )
        ]

    async def generate(*args, **kwargs):
        nonlocal calls
        calls += 1
        return Response()

    async def call_tool(name, arguments):
        return SimpleNamespace(structured_content={"items": []})

    monkeypatch.setenv("GEMINI_MAX_TOOL_ROUNDS", "2")
    monkeypatch.setattr(service, "_generate", generate)

    with pytest.raises(RuntimeError, match="tool-calling limit"):
        await service._complete_with_tools(
            "show inventory",
            [],
            object(),
            "test-model",
            [Tool()],
            call_tool,
        )

    assert calls == 2


def test_live_intent_routing():
    assert service._requires_live_data("Show me current inventory.")
    assert service._requires_live_data("Which items are low in stock?")
    assert service._requires_live_data("Show pending purchase requests.")
    assert service._requires_live_data("Show recent goods receipts.")
    assert not service._requires_live_data("What are the supplier requirements?")


async def _completed(value):
    return value
