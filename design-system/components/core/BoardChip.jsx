import React from 'react'

/**
 * The collapsed station board: a code strip, a hairline divider and a label,
 * painted in board yellow. It is what the sign-in card folds down to, and the
 * only control in the system that carries the board's paint.
 */
export function BoardChip({ code = 'PF', children, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10,
        minHeight: 'var(--tap-min)', padding: '8px 14px', cursor: 'pointer',
        borderRadius: 'var(--radius-hair)', background: 'var(--board)', border: 'none',
        boxShadow: 'var(--shadow-board), inset 0 0 0 2px var(--board-edge)',
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'transform var(--duration-fast) var(--ease-standard)',
      }}>
      <span className="tabular" style={{
        fontSize: 'var(--text-label)', fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-code)', color: 'var(--board-ink)',
      }}>{code}</span>
      <span style={{ height: 14, width: 1, background: 'rgba(18,40,63,0.3)' }} />
      <span style={{
        fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-black)',
        letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--board-ink)',
      }}>{children}</span>
    </button>
  )
}
