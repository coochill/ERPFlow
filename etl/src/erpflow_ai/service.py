"""Combine policy retrieval, Gemini answers, and ERP MCP data."""

import asyncio
import os
import re
from typing import Any

import httpx2
from google import genai
from google.genai import types
from mcp import ClientSession
from mcp.shared.exceptions import MCPError
from mcp.client.streamable_http import streamable_http_client

from erpflow_mcp.server import mcp_server
from erpflow_rag.llm import generate_answer
from erpflow_rag.prompts import SYSTEM_INSTRUCTION, build_rag_prompt
from erpflow_rag.retrieval import RetrievalResult
from erpflow_rag.service import retrieve_policy_chunks
from erpflow_ai.usage import (
    complete_gemini_request,
    reserve_gemini_request,
)


_LIVE_DATA_PATTERNS = (
    r"\bcurrent\b",
    r"\blive\b",
    r"\bshow\b",
    r"\blist\b",
    r"\bfind\b",
    r"\bwho are (?:our|the) suppliers?\b",
    r"\b(?:current|available)\s+(?:inventory|stock)\b",
    r"\blow[- ]stock\b",
    r"\blow\b.{0,20}\bstock\b",
    r"\bpending purchase requests?\b",
    r"\bpurchase requests?\b",
    r"\bgoods receipts?\b",
    r"\brecent receipts?\b",
)


def _requires_live_data(question: str) -> bool:
    """Route only questions that request live ERP records to MCP."""

    return any(
        re.search(pattern, question, flags=re.IGNORECASE)
        for pattern in _LIVE_DATA_PATTERNS
    )


def _policy_context(results: list[RetrievalResult]) -> str:
    if not results:
        return "No relevant policy excerpts were retrieved."

    return "\n\n".join(
        "\n".join(
            [
                f"[Source {index}]",
                f"Policy ID: {result.chunk.policy_id}",
                f"Title: {result.chunk.title}",
                f"Section: {result.chunk.section}",
                f"Document: {result.chunk.source}",
                f"Policy Content:\n{result.chunk.text}",
            ]
        )
        for index, result in enumerate(results, start=1)
    )


def _tool_declarations(tools: list[Any]) -> list[types.Tool]:
    declarations = [
        types.FunctionDeclaration(
            name=tool.name,
            description=tool.description or "Read-only ERPFlow data tool.",
            parameters_json_schema=(
                tool.input_schema
                or {"type": "object", "properties": {}}
            ),
        )
        for tool in tools
    ]
    return [types.Tool(function_declarations=declarations)]


def _tool_result(result: Any) -> dict[str, Any]:
    structured = getattr(result, "structured_content", None)
    if isinstance(structured, dict):
        return structured

    content = getattr(result, "content", None)
    return {"content": str(content) if content else "Tool returned no data."}


def _sources(results: list[RetrievalResult]) -> list[dict[str, Any]]:
    return [
        {
            "chunk_id": result.chunk.chunk_id,
            "source": result.chunk.source,
            "policy_id": result.chunk.policy_id,
            "title": result.chunk.title,
            "version": result.chunk.version,
            "effective_date": result.chunk.effective_date,
            "section": result.chunk.section,
        }
        for result in results
    ]


async def _generate(
    client: genai.Client,
    model: str,
    contents: list[Any],
    tools: list[types.Tool] | None = None,
) -> Any:
    """Run the synchronous Gemini SDK call without blocking the event loop."""

    config = types.GenerateContentConfig(
        system_instruction=(
            SYSTEM_INSTRUCTION
            + "\nUse only supplied read-only ERPFlow tools for live "
            "ERP data. Never invent records or perform writes."
        ),
        temperature=0.2,
        tools=tools or [],
    )
    reservation = reserve_gemini_request(model)
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=contents,
            config=config,
        )
    except Exception:
        complete_gemini_request(reservation, succeeded=False)
        raise

    complete_gemini_request(reservation, response, succeeded=True)
    return response


async def _answer_policy_question(
    question: str,
    results: list[RetrievalResult],
) -> str:
    """Generate a policy-only answer without initializing MCP."""

    if not results:
        return (
            "I couldn't find relevant information in the available "
            "company policies to answer your question."
        )

    prompt = build_rag_prompt(question=question, results=results)
    return await asyncio.to_thread(
        generate_answer,
        prompt=prompt,
        system_instruction=SYSTEM_INSTRUCTION,
    )


async def _answer_with_mcp(
    question: str,
    results: list[RetrievalResult],
    client: genai.Client,
    model: str,
) -> tuple[str, list[str]]:
    token = os.getenv("ETL_SERVICE_TOKEN")
    if not token:
        raise RuntimeError("AI assistant services are not configured.")

    endpoint = os.getenv("MCP_CLIENT_URL", "http://127.0.0.1:8000/mcp")
    if os.getenv("MCP_CLIENT_MODE", "in-process") == "in-process":
        return await _answer_with_registered_tools(
            question,
            results,
            client,
            model,
            mcp_server,
        )

    async with httpx2.AsyncClient(
        headers={"Authorization": f"Bearer {token}"},
    ) as http_client:
        async with streamable_http_client(
            endpoint,
            http_client=http_client,
        ) as streams:
            async with ClientSession(*streams) as session:
                listing = await session.list_tools()
                return await _complete_with_tools(
                    question,
                    results,
                    client,
                    model,
                    listing.tools,
                    session.call_tool,
                )

    raise RuntimeError("The assistant reached its tool-calling limit.")


async def _answer_with_registered_tools(
    question: str,
    results: list[RetrievalResult],
    client: genai.Client,
    model: str,
    server: Any,
) -> tuple[str, list[str]]:
    listing = await server.list_tools()

    async def call_tool(name: str, arguments: dict[str, Any]) -> Any:
        return await server.call_tool(name, arguments)

    return await _complete_with_tools(
        question,
        results,
        client,
        model,
        listing,
        call_tool,
    )


async def _complete_with_tools(
    question: str,
    results: list[RetrievalResult],
    client: genai.Client,
    model: str,
    tools: list[Any],
    call_tool,
) -> tuple[str, list[str]]:
    declarations = _tool_declarations(tools)
    available_names = {tool.name for tool in tools}
    contents: list[Any] = [
        "Retrieved policy context:\n\n"
        f"{_policy_context(results)}\n\n"
        f"Employee question:\n{question}\n\n"
        "Use an ERPFlow tool when live ERP data is needed. Distinguish "
        "policy facts from live ERP records in the final answer."
    ]
    used_tools: list[str] = []

    max_tool_rounds = int(os.getenv("GEMINI_MAX_TOOL_ROUNDS", "2"))
    if max_tool_rounds < 1:
        raise RuntimeError("GEMINI_MAX_TOOL_ROUNDS must be a positive integer.")

    for _ in range(max_tool_rounds):
        response = await _generate(client, model, contents, declarations)
        candidate = response.candidates[0]
        calls = [
            part.function_call
            for part in candidate.content.parts
            if part.function_call
        ]

        if not calls:
            answer = (response.text or "").strip()
            if not answer:
                raise RuntimeError("Gemini returned an empty response.")
            return answer, used_tools

        contents.append(candidate.content)
        for call in calls:
            if call.name not in available_names:
                raise RuntimeError("Gemini requested an unavailable tool.")

            result = await call_tool(call.name, dict(call.args or {}))
            used_tools.append(call.name)
            contents.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_function_response(
                            name=call.name,
                            response={"result": _tool_result(result)},
                        )
                    ],
                )
            )

    raise RuntimeError("The assistant reached its tool-calling limit.")


def _run_mcp_exchange(
    question: str,
    results: list[RetrievalResult],
    client: genai.Client,
    model: str,
) -> tuple[str, list[str]]:
    """Run the stateful MCP client off the FastAPI request event loop."""

    return asyncio.run(
        _answer_with_mcp(question, results, client, model)
    )


async def answer_question(question: str, top_k: int = 5) -> dict[str, Any]:
    """Answer with RAG and use MCP only when live ERP data is requested."""

    results = retrieve_policy_chunks(question=question, top_k=top_k)
    live_data_required = _requires_live_data(question)

    if not live_data_required:
        answer = await _answer_policy_question(question, results)
        return {
            "question": question,
            "answer": answer,
            "source_count": len(results),
            "sources": _sources(results),
            "used_live_data": False,
            "live_tools": [],
        }

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("AI assistant services are not configured.")

    client = genai.Client(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    try:
        answer, used_tools = await asyncio.to_thread(
            _run_mcp_exchange,
            question,
            results,
            client,
            model,
        )
    except (MCPError, httpx2.HTTPError) as error:
        raise RuntimeError("Unable to retrieve live ERP data.") from error

    return {
        "question": question,
        "answer": answer,
        "source_count": len(results),
        "sources": _sources(results),
        "used_live_data": bool(used_tools),
        "live_tools": used_tools,
    }
