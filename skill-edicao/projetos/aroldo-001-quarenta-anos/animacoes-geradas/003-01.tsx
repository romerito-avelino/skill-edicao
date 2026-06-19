import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const bgCracksOpacity = interpolate(frame, [0, 36], [0, 0.8], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
  })

  const textOpacity = interpolate(frame, [36, 81], [0, 1], { 
    extrapolateRight: 'clamp', 
    easing: Easing.ease 
  })

  const textScale = spring({ 
    frame: frame - 36, 
    fps, 
    config: { stiffness: 380, damping: 10 } 
  })

  const breathe = interpolate(frame, [81, 144], [0, 1], { 
    extrapolateRight: 'clamp', 
    easing: Easing.ease 
  })

  const breatheScale = 1 + Math.sin(breathe * Math.PI * 4) * 0.02

  const exitOpacity = interpolate(frame, [144, 180], [1, 0], { 
    extrapolateRight: 'clamp', 
    easing: Easing.ease 
  })

  const crackTransforms = [
    { x: 200, y: 100, rotation: 15, scale: 1.2 },
    { x: 800, y: 300, rotation: -25, scale: 0.8 },
    { x: 1400, y: 200, rotation: 45, scale: 1.5 },
    { x: 400, y: 600, rotation: -15, scale: 0.9 },
    { x: 1200, y: 700, rotation: 35, scale: 1.3 },
    { x: 600, y: 800, rotation: -45, scale: 1.1 }
  ]

  return (
    <AbsoluteFill style={{ backgroundColor: '#1A0D0A' }}>
      
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: bgCracksOpacity * exitOpacity,
        zIndex: 5
      }}>
        {crackTransforms.map((crack, index) => {
          const crackDelay = index * 6
          const crackOpacity = interpolate(frame, [crackDelay, crackDelay + 20], [0, 0.7], {
            extrapolateRight: 'clamp',
            easing: Easing.ease
          })
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: crack.x,
                top: crack.y,
                width: 120,
                height: 4,
                backgroundColor: '#8B4513',
                transform: `rotate(${crack.rotation}deg) scale(${crack.scale})`,
                opacity: crackOpacity,
                borderRadius: 2,
                boxShadow: '0 0 10px rgba(139, 69, 19, 0.5)'
              }}
            />
          )
        })}
      </div>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: bgCracksOpacity * exitOpacity * 0.3,
        background: `
          radial-gradient(circle at 20% 30%, rgba(212, 101, 26, 0.2) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 60% 20%, rgba(245, 200, 66, 0.1) 0%, transparent 40%)
        `,
        zIndex: 3
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${Math.min(textScale, 1.2) * breatheScale})`,
        opacity: textOpacity * exitOpacity,
        zIndex: 100,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderRadius: 12,
        padding: '24px 36px',
        border: `2px solid rgba(212, 101, 26, 0.6)`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
      }}>
        <h1 style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#FFFFFF',
          margin: 0,
          lineHeight: 1.2,
          textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
          letterSpacing: '-1px'
        }}>
          Não conseguir sustentar
        </h1>
        <h2 style={{
          fontSize: 56,
          fontWeight: 800,
          color: '#D4651A',
          margin: '12px 0 0 0',
          lineHeight: 1.2,
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          a própria família
        </h2>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: textOpacity * exitOpacity * 0.6,
        zIndex: 8
      }}>
        <div style={{
          width: 200,
          height: 3,
          backgroundColor: '#8B4513',
          borderRadius: 2,
          transform: `scaleX(${Math.min(textScale, 1)})`
        }} />
      </div>

    </AbsoluteFill>
  )
}