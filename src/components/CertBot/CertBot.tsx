import { useState, useEffect } from 'react'
import type { Question } from '@/types'
import { useCertBot } from '@/hooks/useCertBot'
import RobotButton from '@/components/CertBot/RobotButton'
import ChatWindow from '@/components/CertBot/ChatWindow'

interface CertBotProps {
  question: Question | undefined
  answerRevealed: boolean
  vendorColor: string
  vendorName: string
}

function CertBot({ question, answerRevealed, vendorColor, vendorName }: CertBotProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { messages, isLoading, apiKeyMissing, sendMessage } = useCertBot(
    question!,
    answerRevealed,
  )

  useEffect(() => {
    // Keep isOpen as-is when question changes; the hook clears messages
  }, [question?.id])

  if (!question) return null

  return (
    <>
      <RobotButton
        vendorColor={vendorColor}
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      />
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          vendorColor={vendorColor}
          vendorName={vendorName}
          apiKeyMissing={apiKeyMissing}
          onSend={sendMessage}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default CertBot
