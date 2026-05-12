import { useState, useEffect } from 'react'
import type { Question, ChatMessage } from '@/types'

interface GeminiContent {
  role: string
  parts: { text: string }[]
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[]
    }
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

function buildGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  const capped = messages.slice(-20)
  return capped.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))
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
  const apiKeyMissing = !import.meta.env.VITE_GEMINI_API_KEY

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
      const systemPrompt = buildSystemPrompt(question, answerRevealed)
      const contents = buildGeminiContents(nextMessages)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Gemini responded with status ${response.status}`)
      }

      const data: GeminiResponse = await response.json() as GeminiResponse
      const replyText = data.candidates[0].content.parts[0].text
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
