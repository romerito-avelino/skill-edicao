import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const crackOpacity = interpolate(frame, [0, 27, 135], [0, 1, 0.3], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.85, 0, 0.15, 1) 
  })

  const paperScale = spring({ 
    frame, 
    fps, 
    config: { stiffness: 380, damping: 10 },
    from: 0.8,
    to: 1.2
  })

  const textOpacity = interpolate(frame, [27, 61, 108, 135], [0, 1, 1, 0], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
  })

  const textShake = spring({ 
    frame: frame - 27, 
    fps, 
    config: { stiffness: 350, damping: 8 }
  }) * Math.sin(frame * 0.8) * 2

  const debris1Y = interpolate(frame, [0, 27, 135], [-50, 200, 800], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.9, 0, 0.1, 1) 
  })

  const debris2Y = interpolate(frame, [5, 32, 135], [-80, 150, 750], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.85, 0, 0.15, 1) 
  })

  const debris3Y = interpolate(frame, [10, 37, 135], [-30, 300, 900], { 
    extrapolateRight: 'clamp', 
    easing: Easing.bezier(0.8, 0, 0.2, 1) 
  })

  const pulseIntensity = interpolate(frame, [27, 61, 108], [0, 1, 0.6], { 
    extrapolateRight: 'clamp' 
  })

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
      
      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(212,101,26,0.1) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(139,69,19,0.15) 0%, transparent 40%),
          linear-gradient(45deg, rgba(245,196,66,0.05) 0%, transparent 60%)
        `,
        transform: `scale(${paperScale})`,
        filter: `contrast(${1 + pulseIntensity * 0.8})`,
        zIndex: 1
      }} />

      <div style={{
        position: 'absolute',
        top: '50px',
        left: '200px',
        width: '300px',
        height: '3px',
        backgroundColor: '#D4651A',
        opacity: crackOpacity,
        transform: `rotate(15deg) scaleX(${1 + Math.sin(frame * 0.3) * 0.2})`,
        boxShadow: '0 0 20px rgba(212,101,26,0.6)',
        zIndex: 5
      }} />

      <div style={{
        position: 'absolute',
        top: '120px',
        right: '150px',
        width: '200px',
        height: '2px',
        backgroundColor: '#F5C842',
        opacity: crackOpacity * 0.8,
        transform: `rotate(-25deg) scaleX(${1 + Math.sin(frame * 0.4) * 0.3})`,
        zIndex: 5
      }} />

      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '100px',
        width: '400px',
        height: '4px',
        backgroundColor: '#8B4513',
        opacity: crackOpacity,
        transform: `rotate(8deg) scaleX(${1 + Math.sin(frame * 0.2) * 0.4})`,
        boxShadow: '0 0 15px rgba(139,69,19,0.5)',
        zIndex: 5
      }} />

      <div style={{
        position: 'absolute',
        top: `${debris1Y}px`,
        left: '300px',
        width: '20px',
        height: '20px',
        backgroundColor: '#D4651A',
        opacity: crackOpacity * 0.7,
        transform: `rotate(${frame * 8}deg)`,
        zIndex: 8
      }} />

      <div style={{
        position: 'absolute',
        top: `${debris2Y}px`,
        right: '400px',
        width: '15px',
        height: '15px',
        backgroundColor: '#F5C842',
        opacity: crackOpacity * 0.6,
        transform: `rotate(${frame * -6}deg)`,
        zIndex: 8
      }} />

      <div style={{
        position: 'absolute',
        top: `${debris3Y}px`,
        left: '700px',
        width: '25px',
        height: '12px',
        backgroundColor: '#8B4513',
        opacity: crackOpacity * 0.8,
        transform: `rotate(${frame * 10}deg)`,
        zIndex: 8
      }} />

      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) translateX(${textShake}px)`,
        textAlign: 'center',
        zIndex: 100,
        opacity: textOpacity
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.80)',
          borderRadius: '12px',
          padding: '24px 36px',
          border: `3px solid rgba(212,101,26,${pulseIntensity * 0.8})`,
          boxShadow: `0 0 ${20 + pulseIntensity * 30}px rgba(212,101,26,0.4)`
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0',
            textShadow: `2px 2px 8px rgba(0,0,0,0.8), 0 0 ${10 + pulseIntensity * 20}px rgba(245,196,66,0.6)`,
            letterSpacing: '1px',
            lineHeight: '1.2'
          }}>
            Tudo pode desabar de<br />uma hora pra outra
          </h1>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle at center, transparent 60%, rgba(139,69,19,${pulseIntensity * 0.2}))`,
        zIndex: 90,
        opacity: textOpacity
      }} />

    </AbsoluteFill>
  )
}