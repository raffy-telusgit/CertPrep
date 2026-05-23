import { X } from 'lucide-react'
import RobotIcon from '@/components/CertBot/RobotIcon'

interface RobotButtonProps {
  vendorColor: string
  isOpen: boolean
  onClick: () => void
}

function RobotButton({ vendorColor, isOpen, onClick }: RobotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close CertBot' : 'Open CertBot study assistant'}
      aria-expanded={isOpen}
      className="fixed bottom-4 right-4 z-50 w-16 h-16 rounded-full text-white shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 flex items-center justify-center relative"
      style={{ backgroundColor: vendorColor }}
    >
      <RobotIcon className="w-7 h-7" />
      {isOpen && (
        <X className="absolute top-1.5 right-1.5 h-4 w-4 text-white" aria-hidden="true" />
      )}
    </button>
  )
}

export default RobotButton
