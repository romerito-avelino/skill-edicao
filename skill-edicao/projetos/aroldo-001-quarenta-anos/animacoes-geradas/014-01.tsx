import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const paperCrinkleOpacity = interpolate(frame, [0, 27], [0, 0.3], { 
    extrapolateRight: 'clamp', 
    easing: Easing.ease 
  })

  const paperCrinkleScale = spring({
    frame,
    fps,
    config: { stiffness: 140, damping: 16 }
  })

  const textOpacity = interpolate(frame, [27, 60], [0, 1], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
  })

  const textScale = spring({
    frame: frame - 27,
    fps,
    config: { stiffness: 150, damping: 15 }
  })

  const breathingEffect = interpolate(
    Math.sin((frame - 60) * 0.08),
    [-1, 1],
    [0.98, 1.02]
  )

  const exitOpacity = interpolate(frame, [108, 135], [1, 0], { 
    extrapolateRight: 'clamp', 
    easing: Easing.ease 
  })

  const suspenseParticle1 = spring({
    frame,
    fps,
    config: { stiffness: 120, damping: 18 }
  })

  const suspenseParticle2 = spring({
    frame: frame - 15,
    fps,
    config: { stiffness: 130, damping: 17 }
  })

  const suspenseParticle3 = spring({
    frame: frame - 30,
    fps,
    config: { stiffness: 125, damping: 19 }
  })

  const floatingDots = interpolate(
    Math.cos(frame * 0.05),
    [-1, 1],
    [-20, 20]
  )

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 162,
          background: `linear-gradient(135deg, rgba(212, 101, 26, ${paperCrinkleOpacity * 0.4}), rgba(139, 69, 19, ${paperCrinkleOpacity * 0.2}))`,
          transform: `scale(${paperCrinkleScale})`,
          clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
          opacity: exitOpacity,
          zIndex: 5
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 100,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(245, 196, 66, ${paperCrinkleOpacity * 0.6}), transparent)`,
          transform: `scale(${suspenseParticle1}) translate(${floatingDots}px, 0)`,
          opacity: exitOpacity * 0.7,
          zIndex: 3
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 150,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(212, 101, 26, ${paperCrinkleOpacity * 0.5}), transparent)`,
          transform: `scale(${suspenseParticle2}) translate(${-floatingDots}px, 10px)`,
          opacity: exitOpacity * 0.6,
          zIndex: 4
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${textScale * breathingEffect})`,
          opacity: textOpacity * exitOpacity,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.70)',
          borderRadius: 8,
          padding: '12px 24px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          fontSize: 48,
          fontWeight: 600,
          color: '#FFFFFF',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          border: `2px solid rgba(245, 196, 66, 0.3)`
        }}
      >
        Depois de um tempo ele falou
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 200,
          width: 100,
          height: 100,
          background: `conic-gradient(rgba(139, 69, 19, ${paperCrinkleOpacity * 0.4}), rgba(245, 196, 66, ${paperCrinkleOpacity * 0.3}))`,
          transform: `scale(${suspenseParticle3}) rotate(${frame * 2}deg)`,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          opacity: exitOpacity * 0.8,
          zIndex: 6
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 162,
          background: `linear-gradient(45deg, rgba(245, 196, 66, ${paperCrinkleOpacity * 0.3}), rgba(212, 101, 26, ${paperCrinkleOpacity * 0.2}))`,
          transform: `scale(${paperCrinkleScale * 0.9})`,
          clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)',
          opacity: exitOpacity,
          zIndex: 7
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          right: 80,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(245, 196, 66, ${paperCrinkleOpacity * 0.7}), transparent)`,
          transform: `scale(${suspenseParticle1 * 0.8}) translate(${floatingDots * 0.5}px, ${-floatingDots * 0.3}px)`,
          opacity: exitOpacity * 0.9,
          zIndex: 8
        }}
      />
    </AbsoluteFill>
  )
}