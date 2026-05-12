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
      className="fixed bottom-4 left-4 z-50 w-16 h-16 rounded-full text-white shadow-lg hover:shadow-xl transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 flex items-center justify-center relative"
      style={{ backgroundColor: vendorColor }}
    >
      <RobotIcon className="w-7 h-7" />
      {isOpen && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-1 text-white font-bold text-base leading-none select-none"
        >
          ×
        </span>
      )}
    </button>
  )
}

export default RobotButton
