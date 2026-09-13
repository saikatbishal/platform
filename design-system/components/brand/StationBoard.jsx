import React from 'react'

/** Countersunk corner bolt. Four per board. */
function Bolt({ pos }) {
  return (
    <span aria-hidden="true" style={{
      position: 'absolute', width: 8, height: 8, borderRadius: '50%',
      background: 'rgba(18,40,63,0.25)', boxShadow: '0 0 0 1px rgba(18,40,63,0.15)', ...pos,
    }} />
  )
}

export function StationBoard({ devanagari, latin, regional, code, zone, size = 'md' }) {
  const latinSize = size === 'sm' ? 'var(--text-lg)' : 'var(--text-board)'
  const pad = size === 'sm' ? '10px 12px' : '14px 16px'
  return (
    <div style={{
      position: 'relative', userSelect: 'none', borderRadius: 'var(--radius-hair)',
      background: 'var(--board)', padding: 3, boxShadow: 'var(--shadow-board)',
    }}>
      {/* The white enamel is a ring INSIDE the yellow, not a border on it — on a
          real board the yellow runs past the white on all four sides. */}
      <div style={{
        borderRadius: 1, border: 'var(--border-enamel) solid var(--board-edge)',
        padding: pad, textAlign: 'center',
      }}>
        {devanagari && (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', lineHeight: 1.25, color: 'rgba(18,40,63,0.85)' }}>{devanagari}</p>
        )}
        <p style={{
          margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: latinSize,
          lineHeight: 'var(--leading-board)', fontWeight: 'var(--weight-black)',
          letterSpacing: 'var(--tracking-board)', color: 'var(--board-ink)', textTransform: 'uppercase',
        }}>{latin}</p>
        {regional && (
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', lineHeight: 1.25, color: 'rgba(18,40,63,0.85)' }}>{regional}</p>
        )}
        {(code || zone) && (
          <div style={{
            marginTop: 12, paddingTop: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderTop: '1px solid rgba(18,40,63,0.25)',
          }}>
            <span className="tabular" style={{
              fontSize: 'var(--text-label)', lineHeight: 1, fontWeight: 'var(--weight-semibold)',
              letterSpacing: 'var(--tracking-code)', color: 'var(--board-ink)',
            }}>{code}</span>
            {zone && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-label)', lineHeight: 1,
                letterSpacing: 'var(--tracking-code)', color: 'rgba(18,40,63,0.75)',
              }}>{zone}</span>
            )}
          </div>
        )}
      </div>
      <Bolt pos={{ top: 6, left: 6 }} />
      <Bolt pos={{ top: 6, right: 6 }} />
      <Bolt pos={{ bottom: 6, left: 6 }} />
      <Bolt pos={{ bottom: 6, right: 6 }} />
    </div>
  )
}
