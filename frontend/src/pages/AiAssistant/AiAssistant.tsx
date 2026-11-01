import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Bot, Check, FileText, MessageSquare, RotateCcw, Send } from 'lucide-react'
import { askAssistant } from '../../services/aiAssistantService'
import type { AssistantMessage, PolicySource } from '../../types/aiAssistant'

function formatSourceValue(value: string | undefined, fallback = 'Not provided') {
  return value?.trim() || fallback
}

function SourceCitation({ source }: { source: PolicySource }) {
  return (
    <article className="assistant-source">
      <div className="assistant-source-heading">
        <FileText size={15} />
        <strong>{formatSourceValue(source.policy_id, 'Policy source')}</strong>
        <span>v{formatSourceValue(source.version, '—')}</span>
      </div>
      <div className="assistant-source-title">{formatSourceValue(source.title)}</div>
      <dl>
        <div>
          <dt>Effective</dt>
          <dd>{formatSourceValue(source.effective_date)}</dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd>{formatSourceValue(source.section)}</dd>
        </div>
        <div>
          <dt>Document</dt>
          <dd>{formatSourceValue(source.source)}</dd>
        </div>
      </dl>
    </article>
  )
}

function AiAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submitQuestion() {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || loading) return

    setError('')
    setQuestion('')
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: trimmedQuestion },
    ])
    setLoading(true)

    try {
      const result = await askAssistant(trimmedQuestion)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reach the AI assistant. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitQuestion()
    }
  }

  return (
    <div className="assistant-page">
      <div className="page-heading assistant-heading">
        <div>
          <div className="eyebrow">OPERATIONS INTELLIGENCE</div>
          <h1>AI Assistant</h1>
          <p>Ask questions about company policies and operating procedures.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setMessages([])
            setError('')
          }}
          disabled={messages.length === 0 || loading}
        >
          <RotateCcw size={15} /> Clear chat
        </button>
      </div>

      <section className="assistant-shell" aria-label="AI Assistant conversation">
        {messages.length === 0 && !loading ? (
          <div className="assistant-empty">
            <div className="assistant-empty-icon"><Bot size={25} /></div>
            <h2>Bring a policy question</h2>
            <p>
              Ask about approvals, procurement, receiving, or other documented
              operating policies. Answers include the source documents used.
            </p>
            <div className="assistant-suggestions">
              <span><Check size={14} /> Approval thresholds</span>
              <span><Check size={14} /> Receiving procedures</span>
              <span><Check size={14} /> Procurement policy</span>
            </div>
          </div>
        ) : (
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                className={`assistant-message assistant-message-${message.role}`}
                key={message.id}
              >
                <div className="assistant-message-label">
                  {message.role === 'user' ? (
                    <><MessageSquare size={14} /> You</>
                  ) : (
                    <><Bot size={14} /> ERPFlow Assistant</>
                  )}
                </div>
                <div className="assistant-message-content">{message.content}</div>
                {message.role === 'assistant' && message.sources.length > 0 && (
                  <div className="assistant-citations">
                    <div className="assistant-citations-heading">
                      <FileText size={14} /> Sources ({message.sources.length})
                    </div>
                    <div className="assistant-source-list">
                      {message.sources.map((source, index) => (
                        <SourceCitation
                          key={`${source.chunk_id ?? source.policy_id ?? 'source'}-${index}`}
                          source={source}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="assistant-message assistant-message-assistant">
                <div className="assistant-message-label"><Bot size={14} /> ERPFlow Assistant</div>
                <div className="assistant-loading" role="status">
                  <span /> <span /> <span /> Thinking through the policies…
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-banner assistant-error" role="alert">{error}</div>}

        <div className="assistant-composer">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask a question about ERPFlow policies…"
            maxLength={1000}
            rows={2}
            disabled={loading}
            aria-label="Question for the AI assistant"
          />
          <div className="assistant-composer-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <button
              type="button"
              className="primary-button"
              onClick={() => void submitQuestion()}
              disabled={!question.trim() || loading}
            >
              <Send size={15} /> {loading ? 'Sending…' : 'Send question'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AiAssistant
