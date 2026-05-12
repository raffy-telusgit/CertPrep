import { useRef, useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import RobotIcon from '@/components/CertBot/RobotIcon'
import MessageBubble from '@/components/CertBot/MessageBubble'
import type { ChatMessage } from '@/types'

interface ChatWindowProps {
  messages: ChatMessage[]
  isLoading: boolean
  vendorColor: string
  vendorName: string
  apiKeyMissing: boolean
  onSend: (text: string) => void
  onClose: () => void
}

function ChatWindow({
  messages,
  isLoading,
  vendorColor,
  vendorName,
  apiKeyMissing,
  onSend,
  onClose,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleSend() {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading || apiKeyMissing) return
    onSend(trimmed)
    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 w-80 flex flex-col rounded-xl border bg-background shadow-xl h-96">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <span style={{ color: vendorColor }}>
          <RobotIcon className="w-5 h-5" />
        </span>
        <span className="text-sm font-semibold truncate flex-1">
          CertBot · {vendorName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close CertBot"
          className="h-7 w-7 shrink-0"
        >
          <span className="text-base leading-none" aria-hidden="true">×</span>
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {apiKeyMissing ? (
          <Alert>
            <AlertDescription>
              VITE_GEMINI_API_KEY is not set. Add it to your .env file to use CertBot.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                role={msg.role}
                content={msg.content}
                vendorColor={vendorColor}
              />
            ))}
            {isLoading && <MessageBubble role="bot" content="" />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t flex gap-2">
        <textarea
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CertBot..."
          disabled={apiKeyMissing}
          className="flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim() || apiKeyMissing}
          aria-label="Send message"
          className="text-white shrink-0"
          style={{ backgroundColor: vendorColor }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export default ChatWindow
