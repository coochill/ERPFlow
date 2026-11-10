"""Gemini language model integration for ERPFlow RAG."""

import logging
import os
from functools import lru_cache

from google import genai
from google.genai import types

from erpflow_ai.usage import (
    GeminiDailyLimitExceeded,
    complete_gemini_request,
    reserve_gemini_request,
)

logger = logging.getLogger(__name__)


class GeminiGenerationError(RuntimeError):
    """Raised when Gemini cannot generate a valid answer."""


@lru_cache(maxsize=1)
def get_gemini_client() -> genai.Client:
    """Create and cache the Gemini client."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("Gemini API key is not configured.")

    return genai.Client(api_key=api_key)


def generate_answer(
    prompt: str,
    system_instruction: str,
) -> str:
    """Generate an answer using the configured Gemini model."""

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    try:
        client = get_gemini_client()

        reservation = reserve_gemini_request(model)
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                ),
            )
        except Exception:
            complete_gemini_request(reservation, succeeded=False)
            raise

        complete_gemini_request(reservation, response, succeeded=True)

        answer = (response.text or "").strip()

        if not answer:
            raise GeminiGenerationError(
                "Gemini returned an empty response."
            )

        return answer

    except (GeminiGenerationError, GeminiDailyLimitExceeded):
        raise

    except Exception as error:
        logger.exception("Gemini API request failed.")

        raise GeminiGenerationError(
            "Unable to generate an answer using Gemini."
        ) from error
