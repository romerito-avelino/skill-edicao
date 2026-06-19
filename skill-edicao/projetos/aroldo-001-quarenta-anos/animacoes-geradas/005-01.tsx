import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const paperOpacity = interpolate(frame, [0, 36], [0, 0.8], { extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.6, 1) })
  
  const crackOpacity = interpolate(frame, [10, 45], [0, 0.6], { extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.7, 1) })
  
  const textOpacity = interpolate(frame, [36, 81], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0, 0.5, 1) })
  
  const breathScale = spring({ frame: frame - 81, fps, config: { stiffness: 70, damping: 25 } })
  const breatheEffect = 1 + Math.sin(frame * 0.08) * 0.02
  
  const dustOpacity = interpolate(frame, [20, 55], [0, 0.4], { extrapolateRight: 'clamp' })
  
  const exitOpacity = interpolate(frame, [144, 180], [1, 0], { extrapolateLeft: 'clamp', easing: Easing.bezier(0.4, 0, 1, 1) })
  
  const wrinkleShift = Math.sin(frame * 0.04) * 2
  const shadowPulse = 0.7 + Math.sin(frame * 0.06) * 0.1

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgba(20,15,10,0.95)' }}>
      
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: paperOpacity * exitOpacity,
        background: `
          radial-gradient(circle at 30% 20%, rgba(212,101,26,0.15) 0%, transparent 40%),
          radial-gradient(circle at 70% 80%, rgba(139,69,19,0.12) 0%, transparent 35%),
          linear-gradient(45deg, rgba(245,196,66,0.08) 0%, transparent 50%, rgba(212,101,26,0.06) 100%)
        `,
        transform: `scale(${1 + breatheEffect * 0.5})`,
        zIndex: 2
      }} />

      <div style={{
        position: 'absolute',
        top: 50,
        left: 100,
        width: 400,
        height: 2,
        backgroundColor: '#8B4513',
        opacity: crackOpacity * exitOpacity,
        transform: `rotate(15deg) translateX(${wrinkleShift}px)`,
        boxShadow: `0 0 8px rgba(139,69,19,${shadowPulse})`,
        zIndex: 3
      }} />

      <div style={{
        position: 'absolute',
        top: 120,
        right: 150,
        width: 300,
        height: 1,
        backgroundColor: '#D4651A',
        opacity: crackOpacity * exitOpacity * 0.7,
        transform: `rotate(-8deg) translateX(${-wrinkleShift}px)`,
        zIndex: 3
      }} />

      <div style={{
        position: 'absolute',
        bottom: 100,
        left: 200,
        width: 500,
        height: 1,
        backgroundColor: '#F5C842',
        opacity: crackOpacity * exitOpacity * 0.5,
        transform: `rotate(3deg) translateX(${wrinkleShift * 0.5}px)`,
        zIndex: 3
      }} />

      <div style={{
        position: 'absolute',
        bottom: 50,
        right: 100,
        width: 250,
        height: 2,
        backgroundColor: '#8B4513',
        opacity: crackOpacity * exitOpacity * 0.6,
        transform: `rotate(-12deg) translateX(${-wrinkleShift * 0.8}px)`,
        zIndex: 3
      }} />

      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${20 + i * 80}px`,
          left: `${100 + Math.sin(i) * 300}px`,
          width: 3,
          height: 3,
          backgroundColor: '#F5C842',
          opacity: dustOpacity * exitOpacity * (0.3 + Math.sin(frame * 0.1 + i) * 0.2),
          borderRadius: '50%',
          transform: `translate(${Math.sin(frame * 0.05 + i) * 10}px, ${Math.cos(frame * 0.04 + i) * 8}px)`,
          zIndex: 4
        }} />
      ))}

      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${breatheEffect})`,
        textAlign: 'center',
        zIndex: 100,
        opacity: textOpacity * exitOpacity
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.75)',
          borderRadius: '12px',
          padding: '16px 32px',
          border: '1px solid rgba(212,101,26,0.3)',
          backdropFilter: 'blur(2px)'
        }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: 300,
            color: '#FFFFFF',
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            letterSpacing: '1px',
            lineHeight: '1.2',
            margin: 0,
            fontFamily: 'Arial, sans-serif'
          }}>
            Experiência é o preço
          </h1>
          <h1 style={{
            fontSize: '56px',
            fontWeight: 300,
            color: '#F5C842',
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            letterSpacing: '1px',
            lineHeight: '1.2',
            margin: '8px 0 0 0',
            fontFamily: 'Arial, sans-serif'
          }}>
            que se paga
          </h1>
        </div>
      </div>

    </AbsoluteFill>
  )
}