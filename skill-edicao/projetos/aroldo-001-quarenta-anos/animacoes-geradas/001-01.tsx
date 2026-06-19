import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const backgroundEnter = interpolate(frame, [0, 36], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.8, 0, 0.2, 1) })
  const crackleEnter = spring({ frame: frame - 20, fps, config: { stiffness: 350, damping: 10 } })
  
  const textOpacity = interpolate(frame, [36, 81], [0, 1], { extrapolateRight: 'clamp', easing: Easing.ease })
  const textScale = spring({ frame: frame - 36, fps, config: { stiffness: 380, damping: 12 } })
  
  const breathe = interpolate(frame, [81, 144], [0, 1], { extrapolateRight: 'clamp' })
  const pulse = Math.sin(breathe * Math.PI * 3) * 0.03 + 1
  
  const exitOpacity = interpolate(frame, [144, 180], [1, 0], { extrapolateRight: 'clamp', easing: Easing.ease })

  const crackles = Array.from({ length: 12 }, (_, i) => {
    const delay = i * 3
    const crackleSpring = spring({ frame: frame - delay, fps, config: { stiffness: 320, damping: 8 } })
    const x = 200 + (i % 4) * 400
    const y = 100 + Math.floor(i / 4) * 300
    const rotation = interpolate(frame, [delay, delay + 60], [0, (i % 2 === 0 ? 45 : -45)], { extrapolateRight: 'clamp' })
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 80,
          height: 3,
          backgroundColor: '#8B4513',
          transform: `rotate(${rotation}deg) scaleX(${crackleSpring * crackleEnter})`,
          opacity: backgroundEnter * exitOpacity * 0.6,
          zIndex: 5
        }}
      />
    )
  })

  const tearShards = Array.from({ length: 8 }, (_, i) => {
    const shardSpring = spring({ frame: frame - 15 - i * 2, fps, config: { stiffness: 360, damping: 9 } })
    const x = 300 + i * 180
    const y = 200 + (i % 2) * 600
    const scaleX = interpolate(frame, [15 + i * 2, 45 + i * 2], [0.1, 1], { extrapolateRight: 'clamp' })
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 40,
          height: 120,
          background: `linear-gradient(135deg, #D4651A, #8B4513)`,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          transform: `scaleX(${scaleX * shardSpring}) scaleY(${shardSpring})`,
          opacity: backgroundEnter * exitOpacity * 0.7,
          zIndex: 3
        }}
      />
    )
  })

  const wrinkleLines = Array.from({ length: 15 }, (_, i) => {
    const lineDelay = i * 2
    const lineSpring = spring({ frame: frame - lineDelay, fps, config: { stiffness: 340, damping: 11 } })
    const x = 100 + (i % 5) * 350
    const y = 50 + Math.floor(i / 5) * 350
    const width = 150 + (i % 3) * 100
    const rotation = (i * 23) % 360
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: width,
          height: 2,
          backgroundColor: '#F5C842',
          transform: `rotate(${rotation}deg) scaleX(${lineSpring})`,
          opacity: backgroundEnter * exitOpacity * 0.4,
          zIndex: 2
        }}
      />
    )
  })

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, rgba(212,101,26,0.1) 0%, transparent 70%)`,
          opacity: backgroundEnter * exitOpacity,
          zIndex: 1
        }}
      />
      
      {crackles}
      {tearShards}
      {wrinkleLines}
      
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${Math.min(textScale, 1) * pulse})`,
          opacity: textOpacity * exitOpacity,
          zIndex: 100,
          textAlign: 'center',
          maxWidth: '80%'
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.70)',
            borderRadius: 8,
            padding: '12px 24px',
            border: '2px solid #D4651A'
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#FFFFFF',
              textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
              lineHeight: 1.2,
              letterSpacing: '-1px'
            }}
          >
            Tem uma pergunta que cê
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#F5C842',
              textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
              lineHeight: 1.2,
              letterSpacing: '-1px',
              marginTop: '8px'
            }}
          >
            nunca quer responder tarde
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}