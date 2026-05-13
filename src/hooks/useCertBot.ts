import { useState, useEffect } from 'react'
import type { Question, ChatMessage } from '@/types'

interface FuelixMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface FuelixResponse {
  choices: {
    message: { role: string; content: string }
  }[]
}

function buildSystemPrompt(question: Question, answerRevealed: boolean): string {
  return `You are CertBot, a cloud certification study assistant embedded in CertPrep.

Your ONLY job is to help the user understand concepts related to the following exam question:

${question.question}

Answer options:
${question.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}

Topic tags: ${question.category}, ${question.difficulty}
Answer revealed: ${answerRevealed ? 'true' : 'false'}

Rules:
1. Only answer questions about concepts directly related to this question.
2. If the answer has NOT been revealed: explain concepts freely, but NEVER indicate which answer is correct or hint at it.
3. If the answer HAS been revealed: you may explain fully why each option is correct or incorrect.
4. If the user asks anything unrelated to this question's topic, respond with: "I'm CertBot, not GoogleBot! I can only help with concepts related to this question 😄"
5. Keep answers concise and educational. You are a study aid, not a search engine.`
}

function buildChatMessages(systemPrompt: string, messages: ChatMessage[]): FuelixMessage[] {
  const recent = messages.slice(-20).map<FuelixMessage>((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }))
  return [{ role: 'system', content: systemPrompt }, ...recent]
}

interface UseCertBotResult {
  messages: ChatMessage[]
  isLoading: boolean
  apiKeyMissing: boolean
  sendMessage: (text: string) => Promise<void>
}

export function useCertBot(question: Question, answerRevealed: boolean): UseCertBotResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const apiKeyMissing = !import.meta.env.VITE_FUELIX_API_KEY

  useEffect(() => {
    setMessages([])
    setIsLoading(false)
  }, [question.id])

  async function sendMessage(text: string): Promise<void> {
    if (apiKeyMissing || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setIsLoading(true)

    try {
      const baseUrl = (import.meta.env.VITE_FUELIX_BASE_URL ?? 'https://api.fuelix.ai').replace(/\/+$/, '')
      const model = import.meta.env.VITE_FUELIX_MODEL ?? 'gpt-4o-mini'
      const systemPrompt = buildSystemPrompt(question, answerRevealed)
      const chatMessages = buildChatMessages(systemPrompt, nextMessages)

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_FUELIX_API_KEY}`,
        },
        body: JSON.stringify({ model, messages: chatMessages }),
      })

      if (!response.ok) {
        throw new Error(`Fuel iX responded with status ${response.status}`)
      }

      const data = await response.json() as FuelixResponse
      const replyText = data.choices[0].message.content
      const botMessage: ChatMessage = { role: 'bot', content: replyText }
      setMessages([...nextMessages, botMessage])
    } catch {
      const errorMessage: ChatMessage = {
        role: 'bot',
        content: 'CertBot is having trouble connecting. Please try again.',
      }
      setMessages([...nextMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return { messages, isLoading, apiKeyMissing, sendMessage }
}
