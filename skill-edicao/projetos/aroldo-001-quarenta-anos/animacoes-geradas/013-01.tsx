import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const totalFrames = durationInFrames

  const phase1End = totalFrames * 0.20
  const phase2End = totalFrames * 0.45
  const phase3End = totalFrames * 0.80

  // Background texture fade in
  const bgOpacity = interpolate(frame, [0, phase1End], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })

  // Text entry spring
  const textSpring = spring({
    frame: frame - phase1End,
    fps,
    config: { stiffness: 130, damping: 15 }
  })

  const textOpacity = interpolate(frame, [phase1End, phase2End * 0.6], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })

  const textY = interpolate(textSpring, [0, 1], [40, 0], {
    extrapolateRight: 'clamp'
  })

  // Exit fade
  const exitOpacity = interpolate(frame, [phase3End, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })

  const masterOpacity = frame < phase3End ? 1 : exitOpacity

  // Micro-animation breath during stable phase
  const breathCycle = interpolate(
    Math.sin((frame / fps) * Math.PI * 0.6),
    [-1, 1],
    [0, 1]
  )
  const microScale = interpolate(breathCycle, [0, 1], [1, 1.004], {
    extrapolateRight: 'clamp'
  })

  // Decorative line widths
  const lineWidth1 = interpolate(frame, [phase1End * 0.3, phase1End * 0.9], [0, 180], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })
  const lineWidth2 = interpolate(frame, [phase1End * 0.5, phase1End * 1.1], [0, 100], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })

  // Small dot pulse in stable phase
  const dotPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 1.2),
    [-1, 1],
    [0.7, 1]
  )

  // Worry mark opacity - subtle element representing "coisa"
  const worryOpacity = interpolate(frame, [phase2End, phase2End + 20], [0, 0.18], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  })
  const worryExit = interpolate(frame, [phase3End + 10, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  // Texture grain overlay animation
  const grainOffset = interpolate(frame, [0, totalFrames], [0, 40], {
    extrapolateRight: 'clamp'
  })

  // Subtitle word stagger
  const word1Spring = spring({ frame: frame - (phase1End + 8), fps, config: { stiffness: 130, damping: 15 } })
  const word2Spring = spring({ frame: frame - (phase1End + 16), fps, config: { stiffness: 130, damping: 15 } })
  const word3Spring = spring({ frame: frame - (phase1End + 24), fps, config: { stiffness: 130, damping: 15 } })

  const w1Opacity = interpolate(word1Spring, [0, 1], [0, 1], { extrapolateRight: 'clamp' })
  const w2Opacity = interpolate(word2Spring, [0, 1], [0, 1], { extrapolateRight: 'clamp' })
  const w3Opacity = interpolate(word3Spring, [0, 1], [0, 1], { extrapolateRight: 'clamp' })

  const w1Y = interpolate(word1Spring, [0, 1], [20, 0], { extrapolateRight: 'clamp' })
  const w2Y = interpolate(word2Spring, [0, 1], [20, 0], { extrapolateRight: 'clamp' })
  const w3Y = interpolate(word3Spring, [0, 1], [20, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity: masterOpacity, fontFamily: 'Georgia, serif' }}>

      {/* Base cream background */}
      <AbsoluteFill
        style={{
          backgroundColor: '#F5EFE0',
          opacity: bgOpacity
        }}
      />

      {/* Texture layer — subtle linen pattern */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity * 0.55,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(139,69,19,0.04) 2px,
              rgba(139,69,19,0.04) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(139,69,19,0.03) 3px,
              rgba(139,69,19,0.03) 6px
            )
          `,
          backgroundSize: '8px 8px',
          transform: `translateY(${grainOffset * 0.2}px)`
        }}
      />

      {/* Warm vignette */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity * 0.6,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(100,60,20,0.28) 100%)'
        }}
      />

      {/* Top decorative zone — y 0-162px */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 162,
          zIndex: 8,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: 24,
          paddingLeft: 80
        }}
      >
        {/* Top accent lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              width: lineWidth1,
              height: 2,
              backgroundColor: '#D4651A',
              borderRadius: 2,
              opacity: bgOpacity
            }}
          />
          <div
            style={{
              width: lineWidth2,
              height: 1,
              backgroundColor: '#8B4513',
              borderRadius: 2,
              opacity: bgOpacity * 0.6
            }}
          />
        </div>
        {/* Small label */}
        <div
          style={{
            marginTop: 10,
            opacity: interpolate(frame, [phase1End * 0.8, phase1End * 1.2], [0, 0.7], { extrapolateRight: 'clamp' }),
            fontSize: 11,
            letterSpacing: 3.5,
            textTransform: 'uppercase' as const,
            color: '#8B4513',
            fontFamily: 'Georgia, serif',
            fontWeight: 400
          }}
        >
          expressão cotidiana
        </div>
      </div>

      {/* Floating worry element — abstract "something hidden" */}
      <div
        style={{
          position: 'absolute',
          right: 110,
          top: 280,
          zIndex: 9,
          opacity: worryOpacity * worryExit,
          transform: `rotate(-8deg) scale(${microScale})`,
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          alignItems: 'flex-end'
        }}
      >
        {[90, 60, 40, 20].map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 2,
              backgroundColor: '#8B4513',
              borderRadius: 2,
              opacity: 0.7 - i * 0.12
            }}
          />
        ))}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#D4651A',
            marginTop: 3,
            transform: `scale(${dotPulse})`
          }}
        />
      </div>

      {/* Secondary floating dots — left side */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 340,
          zIndex: 9,
          opacity: worryOpacity * 0.7 * worryExit,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: '#8B4513',
              opacity: 0.5 - i * 0.12,
              transform: `scale(${i % 2 === 0 ? dotPulse : 2 - dotPulse})`
            }}
          />
        ))}
      </div>

      {/* Main text zone — y 162-756px */}
      <div
        style={{
          position: 'absolute',
          top: 162,
          left: 0,
          width: '100%',
          height: 756 - 162,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0
        }}
      >
        {/* Quote mark decorative */}
        <div
          style={{
            opacity: interpolate(frame, [phase1End + 5, phase2End * 0.5], [0, 0.15], { extrapolateRight: 'clamp' }),
            fontSize: 120,
            lineHeight: 1,
            color: '#8B4513',
            fontFamily: 'Georgia, serif',
            marginBottom: -20,
            alignSelf: 'flex-start',
            marginLeft: '15%',
            userSelect: 'none' as const
          }}
        >
          "
        </div>

        {/* Main phrase container */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px) scale(${microScale})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            maxWidth: 820,
            textAlign: 'center' as const
          }}
        >
          {/* Background panel */}
          <div
            style={{
              backgroundColor: 'rgba(245,239,224,0.88)',
              borderRadius: 8,
              padding: '28px 52px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 2px 32px rgba(100,60,20,0.10)',
              border: '1px solid rgba(139,69,19,0.12)'
            }}
          >
            {/* Main phrase */}
            <div
              style={{
                fontSize: 52,
                fontWeight: 600,
                color: '#1A1208',
                fontFamily: 'Georgia, serif',
                letterSpacing: 0.5,
                lineHeight: 1.3,
                textAlign: 'center' as const
              }}
            >
              Aquele jeito de quem tá com coisa
            </div>

            {/* Thin separator */}
            <div
              style={{
                width: interpolate(frame, [phase2End * 0.7, phase2End + 10], [0, 200], { extrapolateRight: 'clamp' }),
                height: 1,
                backgroundColor: '#D4651A',
                opacity: 0.6,
                borderRadius: 1
              }}
            />

            {/* Word-staggered subtitle */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  opacity: w1Opacity,
                  transform: `translateY(${w1Y}px)`,
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#8B4513',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic' as const,
                  letterSpacing: 0.8
                }}
              >
                aquele
              </div>
              <div
                style={{
                  opacity: w2Opacity,
                  transform: `translateY(${w2Y}px)`,
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#8B4513',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic' as const,
                  letterSpacing: 0.8
                }}
              >
                silêncio
              </div>
              <div
                style={{
                  opacity: w3Opacity,
                  transform: `translateY(${w3Y}px)`,
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#8B4513',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic' as const,
                  letterSpacing: 0.8
                }}
              >
                que fala
              </div>
            </div>
          </div>
        </div>

        {/* Closing quote */}
        <div
          style={{
            opacity: interpolate(frame, [phase2End * 0.6, phase2End], [0, 0.15], { extrapolateRight: 'clamp' }),
            fontSize: 120,
            lineHeight: 1,
            color: '#8B4513',
            fontFamily: 'Georgia, serif',
            marginTop: -20,
            alignSelf: 'flex-end',
            marginRight: '15%',
            userSelect: 'none' as