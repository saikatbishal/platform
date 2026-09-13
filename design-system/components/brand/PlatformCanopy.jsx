import React from 'react'

/**
 * What the placard hangs under: a platform canopy with its sodium lamps lit.
 * Vector rather than a photograph — this is the one app whose whole argument
 * is that the map is hand-drawn, and it recolours with the theme because
 * every value is a token. Decorative: aria-hidden, nothing to resolve.
 */
export function PlatformCanopy({ height = '58%' }) {
  const id = React.useId().replace(/:/g, '')
  return (
    <div aria-hidden="true" style={{
      pointerEvents: 'none', position: 'absolute', left: 0, right: 0, top: 0,
      height, overflow: 'hidden',
    }}>
      <svg viewBox="0 0 320 244" preserveAspectRatio="xMidYMin slice"
           style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', opacity: 0.4 }}>
        <defs>
          {/* A flat disc reads as a disc. The lamp has to fall off. */}
          <radialGradient id={id}>
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M-10 20 L160 4 L330 20 L330 28 L160 12 L-10 28 Z" fill="var(--steel)" opacity="0.75" />
        {[20, 120, 220, 300].map((x) => (
          <g key={x} fill="var(--steel)" opacity="0.4">
            <rect x={x} y="22" width="2.5" height="222" />
            <path d={`M${x - 13} 30 L${x + 2.5} 22 L${x + 2.5} 35 Z`} />
          </g>
        ))}
        {[66, 254].map((x) => (
          <g key={x}>
            <rect x={x - 0.5} y="10" width="1" height="26" fill="var(--steel)" opacity="0.6" />
            <circle cx={x} cy="40" r="26" fill={`url(#${id})`} />
            <circle cx={x} cy="38" r="3" fill="var(--accent)" opacity="0.95" />
          </g>
        ))}
      </svg>
      {/* Contrast insurance: clear at the top where only the board sits, the
          card's own ground by the time the copy starts. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--surface) 55%, transparent), var(--surface))',
      }} />
    </div>
  )
}
