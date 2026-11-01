import { apiRequest } from './api'
import type { RagAnswer } from '../types/aiAssistant'

export async function askAssistant(
  question: string,
  topK = 5,
): Promise<RagAnswer> {
  const response = await apiRequest('/api/ai/ask', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, top_k: topK }),
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const body = payload as { message?: string }
    throw new Error(body?.message ?? 'Unable to reach the AI assistant.')
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as RagAnswer).answer !== 'string' ||
    !Array.isArray((payload as RagAnswer).sources)
  ) {
    throw new Error('The AI assistant returned an invalid response.')
  }

  return payload as RagAnswer
}
