interface MessageBubbleProps {
  role: 'user' | 'bot'
  content: string
  vendorColor?: string
}

function MessageBubble({ role, content, vendorColor }: MessageBubbleProps) {
  if (role === 'bot' && content === '') {
    return (
      <div className="flex justify-start">
        <div className="bg-muted text-foreground px-3 py-2 rounded-2xl text-sm leading-relaxed flex items-center gap-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    )
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="text-white px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words"
          style={{ backgroundColor: vendorColor }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="bg-muted text-foreground px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
        {content}
      </div>
    </div>
  )
}

export default MessageBubble
