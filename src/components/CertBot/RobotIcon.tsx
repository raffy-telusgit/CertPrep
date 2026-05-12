interface RobotIconProps {
  className?: string
}

function RobotIcon({ className }: RobotIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* antenna */}
      <line x1="20" y1="2" x2="20" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="2" r="2" fill="currentColor" />
      {/* head */}
      <rect x="6" y="8" width="28" height="24" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* eyes */}
      <rect x="11" y="14" width="6" height="5" rx="1" fill="currentColor" />
      <rect x="23" y="14" width="6" height="5" rx="1" fill="currentColor" />
      {/* mouth/visor */}
      <rect x="11" y="23" width="18" height="4" rx="2" fill="currentColor" />
    </svg>
  )
}

export default RobotIcon
