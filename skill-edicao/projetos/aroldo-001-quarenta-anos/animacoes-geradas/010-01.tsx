import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  
  const totalFrames = 135
  const phase1End = Math.floor(totalFrames * 0.2)
  const phase2End = Math.floor(totalFrames * 0.45)
  const phase3End = Math.floor(totalFrames * 0.8)
  
  const backgroundOpacity = interpolate(frame, [0, phase1End], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.ease
  })
  
  const textOpacity = interpolate(frame, [phase1End, phase2End], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })
  
  const exitOpacity = interpolate(frame, [phase3End, totalFrames], [1, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.ease
  })
  
  const finalOpacity = Math.min(textOpacity, exitOpacity)
  
  const paperScale = spring({
    frame,
    fps,
    config: { stiffness: 140, damping: 16 }
  })
  
  const breathingScale = interpolate(
    Math.sin((frame - phase2End) * 0.05) * 0.5 + 0.5,
    [0, 1],
    [0.98, 1.02]
  )
  
  const floatingY = interpolate(
    Math.sin((frame - phase2End) * 0.08) * 0.5 + 0.5,
    [0, 1],
    [-3, 3]
  )
  
  const decorativeElements = Array.from({ length: 8 }, (_, i) => {
    const delay = i * 8
    const elementOpacity = interpolate(frame, [delay, delay + 20], [0, 0.6], {
      extrapolateRight: 'clamp',
      easing: Easing.ease
    })
    
    const rotation = interpolate(frame, [delay, totalFrames], [0, 360], {
      extrapolateRight: 'clamp'
    })
    
    const x = 200 + i * 200
    const y = i % 2 === 0 ? 80 : 950
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 40,
          height: 40,
          backgroundColor: i % 2 === 0 ? '#F5C842' : '#D4651A',
          borderRadius: '50%',
          opacity: elementOpacity * backgroundOpacity * exitOpacity,
          transform: `rotate(${rotation}deg) scale(${paperScale})`,
          zIndex: 5
        }}
      />
    )
  })
  
  const paperTexture = Array.from({ length: 12 }, (_, i) => {
    const x = (i % 4) * 480
    const y = Math.floor(i / 4) * 360
    const delay = i * 3
    
    const elementOpacity = interpolate(frame, [delay, delay + 15], [0, 0.3], {
      extrapolateRight: 'clamp'
    })
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 480,
          height: 360,
          backgroundColor: '#8B4513',
          opacity: elementOpacity * backgroundOpacity * exitOpacity,
          transform: `scale(${paperScale * 0.9}) skew(${Math.sin(frame * 0.02 + i) * 2}deg)`,
          borderRadius: '8px',
          zIndex: 1
        }}
      />
    )
  })
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      {paperTexture}
      {decorativeElements}
      
      <div
        style={{
          position: 'absolute',
          top: 162,
          left: 0,
          right: 0,
          bottom: 162,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.70)',
            borderRadius: '8px',
            padding: '12px 24px',
            opacity: finalOpacity,
            transform: `scale(${breathingScale}) translateY(${floatingY}px)`,
            transition: 'all 0.3s ease'
          }}
        >
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 500,
              color: '#FFFFFF',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            Minha rotina de cada dia na varanda
          </h1>
        </div>
      </div>
      
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          right: 50,
          width: 60,
          height: 60,
          backgroundColor: '#F5C842',
          borderRadius: '50%',
          opacity: backgroundOpacity * exitOpacity * 0.8,
          transform: `scale(${paperScale}) rotate(${frame * 2}deg)`,
          zIndex: 8
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 100,
          width: 80,
          height: 4,
          backgroundColor: '#D4651A',
          opacity: backgroundOpacity * exitOpacity * 0.6,
          transform: `scaleX(${paperScale}) rotate(15deg)`,
          zIndex: 6
        }}
      />
    </AbsoluteFill>
  )
}