import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const bgOpacity = interpolate(frame, [0, 36], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
  const paperCrinkle1 = spring({ frame: frame - 10, fps, config: { stiffness: 140, damping: 16 } })
  const paperCrinkle2 = spring({ frame: frame - 15, fps, config: { stiffness: 150, damping: 15 } })
  
  const textOpacity = interpolate(frame, [36, 81], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
  const textScale = spring({ frame: frame - 36, fps, config: { stiffness: 140, damping: 16 } })
  
  const breathe = interpolate(frame, [81, 144], [0, 1], { extrapolateRight: 'clamp' })
  const breatheScale = 1 + Math.sin(breathe * Math.PI * 4) * 0.02
  const floatY = Math.sin(breathe * Math.PI * 3) * 3
  
  const exitOpacity = interpolate(frame, [144, 180], [1, 0], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) })

  const particle1X = interpolate(frame, [0, 180], [200, 1720], { easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
  const particle1Y = 100 + Math.sin(frame * 0.1) * 40
  
  const particle2X = interpolate(frame, [20, 180], [1600, 100], { easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
  const particle2Y = 1000 + Math.cos(frame * 0.08) * 30

  const clockHandRotation = interpolate(frame, [0, 180], [0, 360], { easing: Easing.linear })
  const clockOpacity = interpolate(frame, [0, 36, 144, 180], [0, 0.3, 0.3, 0], { easing: Easing.ease })

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 40% 30%, rgba(212, 101, 26, 0.15) 0%, rgba(139, 69, 19, 0.1) 40%, rgba(0, 0, 0, 0.9) 100%)',
          opacity: bgOpacity * exitOpacity,
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 100,
          width: 300,
          height: 200,
          background: 'linear-gradient(45deg, rgba(245, 196, 66, 0.1), rgba(212, 101, 26, 0.08))',
          borderRadius: 20,
          transform: `scale(${paperCrinkle1}) rotate(${frame * 0.5}deg)`,
          opacity: bgOpacity * exitOpacity * 0.6,
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 150,
          width: 250,
          height: 180,
          background: 'linear-gradient(-30deg, rgba(139, 69, 19, 0.12), rgba(245, 196, 66, 0.06))',
          borderRadius: 15,
          transform: `scale(${paperCrinkle2}) rotate(${-frame * 0.3}deg)`,
          opacity: bgOpacity * exitOpacity * 0.5,
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: particle1Y,
          left: particle1X,
          width: 8,
          height: 8,
          backgroundColor: '#F5C842',
          borderRadius: '50%',
          opacity: bgOpacity * exitOpacity * 0.7,
          boxShadow: '0 0 20px rgba(245, 196, 66, 0.5)',
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: particle2Y,
          left: particle2X,
          width: 6,
          height: 6,
          backgroundColor: '#D4651A',
          borderRadius: '50%',
          opacity: bgOpacity * exitOpacity * 0.6,
          boxShadow: '0 0 15px rgba(212, 101, 26, 0.4)',
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 70,
          right: 200,
          width: 120,
          height: 120,
          border: '3px solid rgba(245, 196, 66, 0.3)',
          borderRadius: '50%',
          opacity: clockOpacity * exitOpacity,
          zIndex: 4,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 40,
            backgroundColor: '#F5C842',
            transformOrigin: 'bottom center',
            transform: `translate(-50%, -100%) rotate(${clockHandRotation}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 1,
            height: 30,
            backgroundColor: '#D4651A',
            transformOrigin: 'bottom center',
            transform: `translate(-50%, -100%) rotate(${clockHandRotation * 12}deg)`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${textScale * breatheScale}) translateY(${floatY}px)`,
          opacity: textOpacity * exitOpacity,
          zIndex: 100,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: 12,
            padding: '20px 40px',
            border: '2px solid rgba(245, 196, 66, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          }}
        >
          <h1
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: '#FFFFFF',
              textAlign: 'center',
              margin: 0,
              textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)',
              lineHeight: 1.2,
            }}
          >
            A hora certa ainda pode{' '}
            <span style={{ color: '#F5C842', textShadow: '0 0 20px rgba(245, 196, 66, 0.5)' }}>
              chegar
            </span>
          </h1>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 150,
          width: 200,
          height: 4,
          background: 'linear-gradient(90deg, transparent 0%, #F5C842 50%, transparent 100%)',
          opacity: bgOpacity * exitOpacity * 0.6,
          transform: `scaleX(${paperCrinkle1})`,
          zIndex: 5,
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          right: 300,
          width: 150,
          height: 3,
          background: 'linear-gradient(90deg, transparent 0%, #D4651A 50%, transparent 100%)',
          opacity: bgOpacity * exitOpacity * 0.5,
          transform: `scaleX(${paperCrinkle2})`,
          zIndex: 5,
        }}
      />
    </AbsoluteFill>
  )
}