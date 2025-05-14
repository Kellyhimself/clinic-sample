'use client';

import { useEffect, useState } from 'react';

export default function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="fixed inset-0 -z-10"
      style={{
        background: `
          radial-gradient(
            circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%,
            rgba(59, 130, 246, 0.1) 0%,
            rgba(20, 184, 166, 0.1) 25%,
            rgba(107, 114, 128, 0.1) 50%
          )
        `,
        transition: 'background 0.5s ease-out',
      }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 opacity-90"
        style={{
          animation: 'gradientShift 15s ease infinite',
        }}
      />
      <style jsx global>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
} 