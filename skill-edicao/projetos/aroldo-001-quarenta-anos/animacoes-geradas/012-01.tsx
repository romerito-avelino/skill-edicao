import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  
  const phase1End = 36
  const phase2End = 81
  const phase3End = 144
  
  const paperEnter = spring({
    frame: frame - 0,
    fps,
    config: { stiffness: 140, damping: 16 }
  })
  
  const textOpacity = interpolate(
    frame,
    [phase1End, phase2End],
    [0, 1],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
  )
  
  const textScale = spring({
    frame: frame - phase1End,
    fps,
    config: { stiffness: 150, damping: 15 }
  })
  
  const breathe = interpolate(
    frame,
    [0, 60, 120, 180],
    [1, 1.02, 1, 0.98],
    { easing: Easing.bezier(0.4, 0, 0.6, 1) }
  )
  
  const exitOpacity = interpolate(
    frame,
    [phase3End, 180],
    [1, 0],
    { extrapolateRight: 'clamp', easing: Easing.ease }
  )
  
  const paperCreases = Array.from({ length: 12 }, (_, i) => {
    const delay = i * 3
    const crease = spring({
      frame: frame - delay,
      fps,
      config: { stiffness: 120, damping: 18 }
    })
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${15 + i * 7}%`,
          top: `${10 + (i % 3) * 30}%`,
          width: '2px',
          height: `${40 + i * 5}px`,
          backgroundColor: '#8B4513',
          opacity: crease * 0.3 * exitOpacity,
          transform: `rotate(${-20 + i * 8}deg) scaleY(${crease})`,
          transformOrigin: 'top',
          zIndex: 2
        }}
      />
    )
  })
  
  const workSymbols = ['⚒', '🔧', '🛠', '📋'].map((symbol, i) => {
    const symbolSpring = spring({
      frame: frame - (10 + i * 8),
      fps,
      config: { stiffness: 160, damping: 14 }
    })
    
    const float = interpolate(
      frame,
      [0, 90, 180],
      [0, 15, 0],
      { easing: Easing.bezier(0.4, 0, 0.6, 1) }
    )
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${20 + i * 20}%`,
          top: `${100 + Math.sin(i) * 50}px`,
          fontSize: '24px',
          opacity: symbolSpring * 0.6 * exitOpacity,
          transform: `translateY(${float}px) scale(${symbolSpring})`,
          zIndex: 5
        }}
      >
        {symbol}
      </div>
    )
  })
  
  const dedicationRings = Array.from({ length: 6 }, (_, i) => {
    const ringDelay = i * 6
    const ringSpring = spring({
      frame: frame - ringDelay,
      fps,
      config: { stiffness: 130, damping: 17 }
    })
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${100 + i * 30}px`,
          height: `${100 + i * 30}px`,
          border: '1px solid #F5C842',
          borderRadius: '50%',
          opacity: ringSpring * (0.4 - i * 0.05) * exitOpacity,
          transform: `translate(-50%, -50%) scale(${ringSpring * breathe})`,
          zIndex: 3
        }}
      />
    )
  })
  
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #2C1810 0%, #1A0F08 50%, #0D0603 100%)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 30%, rgba(212, 101, 26, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(245, 200, 66, 0.08) 0%, transparent 35%)
          `,
          opacity: paperEnter * exitOpacity,
          zIndex: 1
        }}
      />
      
      {paperCreases}
      {workSymbols}
      {dedicationRings}
      
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${textScale * breathe})`,
          textAlign: 'center',
          zIndex: 100
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '12px',
            padding: '20px 32px',
            border: '1px solid #F5C842',
            opacity: textOpacity * exitOpacity
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#FFFFFF',
              marginBottom: '12px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              lineHeight: 1.2
            }}
          >
            Bom homem
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 500,
              color: '#F5C842',
              marginBottom: '8px',
              textShadow: '1px 1px 3px rgba(0,0,0,0.7)'
            }}
          >
            trabalhador, dedicado
          </div>
        </div>
      </div>
      
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: `translateX(-50%) scale(${breathe})`,
          width: '200px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #D4651A, transparent)',
          opacity: textOpacity * exitOpacity,
          zIndex: 10
        }}
      />
    </AbsoluteFill>
  )
}