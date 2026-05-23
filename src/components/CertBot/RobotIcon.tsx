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
      {/* antenna halo */}
      <circle cx="20" cy="2" r="5.5" fill="currentColor" opacity="0.18" />
      {/* antenna stem */}
      <line x1="20" y1="7" x2="20" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* antenna bulb */}
      <circle cx="20" cy="2" r="2" fill="currentColor" />
      {/* head */}
      <rect x="4" y="9" width="32" height="22" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* left ear */}
      <rect x="1" y="14" width="3" height="9" rx="1.5" fill="currentColor" />
      {/* right ear */}
      <rect x="36" y="14" width="3" height="9" rx="1.5" fill="currentColor" />
      {/* left eye */}
      <circle cx="14" cy="17" r="4" fill="currentColor" />
      {/* right eye */}
      <circle cx="26" cy="17" r="4" fill="currentColor" />
      {/* visor */}
      <rect x="9" y="24" width="22" height="4" rx="2" fill="currentColor" />
    </svg>
  )
}

export default RobotIcon
