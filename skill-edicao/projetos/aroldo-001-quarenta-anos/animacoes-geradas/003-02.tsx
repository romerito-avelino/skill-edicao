import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const phase1End = 36
  const phase2End = 81
  const phase3End = 144
  const totalFrames = 180

  const backgroundOpacity = interpolate(frame, [0, phase1End], [0, 1], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
  })

  const crackOffset1 = spring({ 
    frame: frame - 10, 
    fps, 
    config: { stiffness: 380, damping: 10 } 
  })
  
  const crackOffset2 = spring({ 
    frame: frame - 20, 
    fps, 
    config: { stiffness: 350, damping: 9 } 
  })

  const textOpacity = interpolate(frame, [phase1End, phase2End], [0, 1], { 
    extrapolateRight: 'clamp', 
    easing: Easing.out(Easing.quad) 
  })

  const textShake = spring({ 
    frame: frame - phase1End, 
    fps, 
    config: { stiffness: 400, damping: 8 } 
  })

  const breathe = interpolate(
    frame,
    [phase2End, phase2End + 30, phase3End],
    [1, 1.02, 1],
    { extrapolateRight: 'clamp' }
  )

  const exitOpacity = interpolate(frame, [phase3End, totalFrames], [1, 0], { 
    extrapolateRight: 'clamp' 
  })

  const fragment1Y = spring({ 
    frame: frame - phase1End - 5, 
    fps, 
    config: { stiffness: 320, damping: 12 } 
  })

  const fragment2Y = spring({ 
    frame: frame - phase1End - 15, 
    fps, 
    config: { stiffness: 340, damping: 11 } 
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill 
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(212, 101, 26, 0.3) 0%, rgba(139, 69, 19, 0.2) 40%, rgba(0,0,0,0.9) 80%)',
          opacity: backgroundOpacity * exitOpacity
        }}
      />

      <AbsoluteFill style={{ zIndex: 3, opacity: exitOpacity }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${15 + i * 8}%`,
              top: `${10 + (i % 3) * 25}px`,
              width: `${120 + i * 15}px`,
              height: '2px',
              backgroundColor: i % 2 === 0 ? '#D4651A' : '#8B4513',
              transform: `translateX(${crackOffset1 * (20 + i * 5)}px) rotate(${-15 + i * 8}deg)`,
              opacity: 0.7
            }}
          />
        ))}
      </AbsoluteFill>

      <AbsoluteFill style={{ zIndex: 4, opacity: exitOpacity }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              right: `${10 + i * 12}%`,
              top: `${900 + i * 15}px`,
              width: `${80 + i * 20}px`,
              height: '3px',
              backgroundColor: '#F5C842',
              transform: `translateX(${-crackOffset2 * (15 + i * 4)}px) rotate(${10 + i * 12}deg)`,
              opacity: 0.6
            }}
          />
        ))}
      </AbsoluteFill>

      <AbsoluteFill style={{ zIndex: 5, opacity: exitOpacity }}>
        <div
          style={{
            position: 'absolute',
            left: '5%',
            top: '100px',
            width: '200px',
            height: '80px',
            backgroundColor: 'rgba(212, 101, 26, 0.4)',
            transform: `translateY(${-fragment1Y * 40}px) rotate(-8deg)`,
            clipPath: 'polygon(0% 20%, 80% 0%, 100% 70%, 15% 100%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '8%',
            top: '60px',
            width: '150px',
            height: '100px',
            backgroundColor: 'rgba(139, 69, 19, 0.5)',
            transform: `translateY(${-fragment2Y * 60}px) rotate(12deg)`,
            clipPath: 'polygon(20% 0%, 100% 30%, 90% 100%, 0% 80%)'
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill 
        style={{
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '162px',
          paddingBottom: '324px',
          opacity: textOpacity * exitOpacity
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: '12px',
            padding: '24px 36px',
            border: '2px solid rgba(212, 101, 26, 0.6)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            transform: `scale(${breathe}) translateX(${textShake * 3 - 1.5}px)`
          }}
        >
          <div
            style={{
              fontSize: '58px',
              fontWeight: 900,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.2,
              textShadow: '3px 3px 8px rgba(0,0,0,0.9)',
              letterSpacing: '-0.5px'
            }}
          >
            Não conseguir sustentar
          </div>
          <div
            style={{
              fontSize: '58px',
              fontWeight: 900,
              color: '#F5C842',
              textAlign: 'center',
              lineHeight: 1.2,
              textShadow: '3px 3px 8px rgba(0,0,0,0.9)',
              letterSpacing: '-0.5px',
              marginTop: '8px'
            }}
          >
            a própria família
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ zIndex: 6, opacity: exitOpacity }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${20 + i * 15}%`,
              bottom: `${30 + i * 8}px`,
              width: '4px',
              height: `${60 + i * 20}px`,
              backgroundColor: 'rgba(245, 196, 66, 0.8)',
              transform: `translateY(${fragment1Y * (10 + i * 5)}px) skewX(-15deg)`,
              opacity: 0.7
            }}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}