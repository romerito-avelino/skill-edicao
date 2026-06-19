import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const crumpledPaper1 = spring({
    frame: frame - 10,
    fps,
    config: { stiffness: 380, damping: 10 }
  })

  const crumpledPaper2 = spring({
    frame: frame - 5,
    fps,
    config: { stiffness: 350, damping: 12 }
  })

  const crumpledPaper3 = spring({
    frame: frame - 15,
    fps,
    config: { stiffness: 320, damping: 8 }
  })

  const textOpacity = interpolate(
    frame,
    [36, 80],
    [0, 1],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
  )

  const textScale = spring({
    frame: frame - 36,
    fps,
    config: { stiffness: 400, damping: 10 }
  })

  const crackLine1 = interpolate(
    frame,
    [80, 144],
    [0, 100],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.68, -0.55, 0.265, 1.55) }
  )

  const crackLine2 = interpolate(
    frame,
    [85, 150],
    [0, 100],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.68, -0.55, 0.265, 1.55) }
  )

  const breathingOffset = interpolate(
    frame,
    [0, 60],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) * Math.sin(frame * 0.15) * 3

  const exitOpacity = interpolate(
    frame,
    [144, 180],
    [1, 0],
    { extrapolateRight: 'clamp', easing: Easing.ease }
  )

  const tearEffect1X = interpolate(
    frame,
    [90, 140],
    [960, 800],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.7, 0, 0.84, 0) }
  )

  const tearEffect2X = interpolate(
    frame,
    frame > 95 ? [95, 145] : [0, 1],
    frame > 95 ? [960, 1120] : [960, 960],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.7, 0, 0.84, 0) }
  )

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: tearEffect1X - 100,
          width: 200,
          height: 100,
          background: `linear-gradient(45deg, ${crampedOpacity > 0 ? '#D4651A' : 'transparent'} 0%, #8B4513 50%, transparent 100%)`,
          clipPath: 'polygon(0% 20%, 60% 20%, 100% 0%, 80% 50%, 100% 80%, 40% 80%, 0% 100%, 20% 50%)',
          opacity: exitOpacity,
          zIndex: 5
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 20 + crumpledPaper1 * 30,
          left: 100 + crumpledPaper1 * 50,
          width: 300,
          height: 120,
          background: `radial-gradient(circle, #D4651A 0%, #8B4513 70%, transparent 100%)`,
          clipPath: 'polygon(20% 0%, 80% 10%, 100% 35%, 90% 70%, 60% 90%, 20% 85%, 0% 50%, 10% 20%)',
          opacity: exitOpacity * 0.8,
          transform: `rotate(${crumpledPaper1 * 15 - 7.5}deg)`,
          zIndex: 3
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 80,
          right: tearEffect2X - 150,
          width: 250,
          height: 80,
          background: `linear-gradient(135deg, #8B4513 0%, #D4651A 100%)`,
          clipPath: 'polygon(0% 15%, 85% 0%, 100% 25%, 85% 45%, 100% 70%, 70% 85%, 15% 100%, 0% 75%, 15% 55%, 0% 30%)',
          opacity: exitOpacity * 0.6,
          zIndex: 4
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 900 + crumpledPaper2 * 20,
          left: 200 + crumpledPaper2 * 40,
          width: 400,
          height: 150,
          background: `conic-gradient(from 45deg, #8B4513 0%, #D4651A 50%, #8B4513 100%)`,
          clipPath: 'polygon(15% 5%, 75% 0%, 95% 20%, 85% 45%, 100% 75%, 80% 95%, 25% 100%, 5% 80%, 0% 50%, 10% 25%)',
          opacity: exitOpacity * 0.7,
          transform: `rotate(${crumpledPaper2 * -12 + 6}deg)`,
          zIndex: 2
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 930,
          right: 150 + crumpledPaper3 * 30,
          width: 350,
          height: 120,
          background: `linear-gradient(45deg, transparent 0%, #D4651A 30%, #8B4513 70%, transparent 100%)`,
          clipPath: 'polygon(10% 10%, 90% 5%, 95% 35%, 85% 60%, 95% 85%, 70% 95%, 30% 90%, 5% 65%, 0% 35%, 15% 15%)',
          opacity: exitOpacity * 0.5,
          transform: `rotate(${crumpledPaper3 * 18 - 9}deg)`,
          zIndex: 1
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 200 + breathingOffset,
          left: 0,
          width: crackLine1 + '%',
          height: 2,
          backgroundColor: '#F5C842',
          boxShadow: '0 0 8px #F5C842',
          opacity: exitOpacity,
          zIndex: 8
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 700 + breathingOffset * 0.5,
          right: 0,
          width: crackLine2 + '%',
          height: 3,
          backgroundColor: '#F5C842',
          boxShadow: '0 0 12px #F5C842',
          opacity: exitOpacity * 0.8,
          zIndex: 8
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${0.3 + textScale * 0.7}) translateY(${breathingOffset}px)`,
          zIndex: 100,
          opacity: textOpacity * exitOpacity
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: '12px',
            padding: '24px 48px',
            textAlign: 'center',
            border: '2px solid #D4651A',
            boxShadow: '0 0 20px rgba(212, 101, 26, 0.5)'
          }}
        >
          <h1
            style={{
              fontSize: '58px',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.2,
              textShadow: '3px 3px 6px rgba(0,0,0,0.8), 0 0 20px #F5C842'
            }}
          >
            Escolhas erradas trilham
            <br />
            <span style={{ color: '#F5C842' }}>caminhos diferentes</span>
          </h1>
        </div>
      </div>
    </AbsoluteFill>
  )
}