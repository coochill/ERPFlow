export type PolicySource = {
  chunk_id?: string
  source?: string
  policy_id?: string
  title?: string
  version?: string
  effective_date?: string
  section?: string
}

export type RagAnswer = {
  question: string
  answer: string
  source_count: number
  sources: PolicySource[]
  used_live_data?: boolean
  live_tools?: string[]
}

export type AssistantMessage =
  | { id: string; role: 'user'; content: string }
  | {
      id: string
      role: 'assistant'
      content: string
      sources: PolicySource[]
      usedLiveData: boolean
    }
