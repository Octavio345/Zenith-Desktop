// components/Profile/ProfileMouseGlow.jsx
import { useEffect, useState } from 'react'

export default function ProfileMouseGlow() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div 
      className="profile-mouse-glow" 
      style={{ 
        left: mousePosition.x - 250, 
        top: mousePosition.y - 250 
      }} 
    />
  )
}