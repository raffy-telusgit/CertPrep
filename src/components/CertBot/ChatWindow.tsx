import { useRef, useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import RobotIcon from '@/components/CertBot/RobotIcon'
import MessageBubble from '@/components/CertBot/MessageBubble'
import { cn } from '@/lib/utils'
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

const WINDOW_WIDTH = 320
const WINDOW_HEIGHT = 384

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
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const initialPosRef = useRef({ x: 0, y: 0 })
  const originRef = useRef({ x: 0, y: 0 })
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const hasDraggedRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { hasDraggedRef.current = hasDragged }, [hasDragged])

  useEffect(() => {
    return () => {
      if (mouseMoveHandlerRef.current) window.removeEventListener('mousemove', mouseMoveHandlerRef.current)
      if (mouseUpHandlerRef.current) window.removeEventListener('mouseup', mouseUpHandlerRef.current)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    originRef.current = { x: e.clientX, y: e.clientY }
    setIsDragging(true)

    const moveHandler = (ev: MouseEvent) => {
      if (!hasDraggedRef.current) {
        const initX = window.innerWidth - WINDOW_WIDTH - 16
        const initY = window.innerHeight - WINDOW_HEIGHT - 80
        initialPosRef.current = { x: initX, y: initY }
        hasDraggedRef.current = true
        setHasDragged(true)
      }

      const deltaX = ev.clientX - originRef.current.x
      const deltaY = ev.clientY - originRef.current.y
      const rawX = initialPosRef.current.x + deltaX
      const rawY = initialPosRef.current.y + deltaY

      const clampedX = Math.max(0, Math.min(rawX, window.innerWidth - WINDOW_WIDTH))
      const clampedY = Math.max(0, Math.min(rawY, window.innerHeight - WINDOW_HEIGHT))
      setPos({ x: clampedX, y: clampedY })
      initialPosRef.current = { x: clampedX, y: clampedY }
      originRef.current = { x: ev.clientX, y: ev.clientY }
    }

    const upHandler = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', moveHandler)
      window.removeEventListener('mouseup', upHandler)
    }

    mouseMoveHandlerRef.current = moveHandler
    mouseUpHandlerRef.current = upHandler
    window.addEventListener('mousemove', moveHandler)
    window.addEventListener('mouseup', upHandler)
  }

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
    <div
      className={cn(
        'fixed z-50 w-80 h-96 flex flex-col rounded-xl border bg-background shadow-xl',
        !hasDragged && 'bottom-20 right-4'
      )}
      style={hasDragged ? { top: pos.y, left: pos.x } : undefined}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 border-b select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handleMouseDown}
      >
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
          onMouseDown={(e) => e.stopPropagation()}
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
