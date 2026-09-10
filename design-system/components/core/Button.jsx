import React from 'react'

/**
 * The app's button, in the three treatments it actually uses:
 *
 *   primary   accent fill, ground-coloured label — the one commit action
 *             in a sheet. Yellow is a fill; the label on it is never yellow.
 *   outline   hairline on --surface, ink label. Every persistent control on
 *             the map sits at this weight. Hover lifts to --surface-2 and
 *             turns the label --accent.
 *   quiet     no chrome at all: an uppercase label that turns accent on
 *             hover. "Change", "Remove", "+ Add times".
 *
 * All labels are uppercase --text-label with --tracking-label, which is what
 * makes 11px legible. Minimum height is --tap-min on primary and outline.
 */
export function Button({ variant = 'outline', size = 'md', disabled, children, onClick, type = 'button', style, ...rest }) {
  const [hover, setHover] = React.useState(false)
  const base = {
    fontSize:'var(--text-label)',fontWeight:'var(--weight-semibold)',letterSpacing:'var(--tracking-label)',textTransform:'uppercase',lineHeight:1,
    fontFamily: 'var(--font-body)', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
    opacity: disabled ? (variant === 'primary' ? 0.4 : 0.5) : 1,
  }
  const pad = size === 'sm' ? '8px 12px' : '12px 16px'
  const looks = {
    primary: {
      background: 'var(--accent)', color: 'var(--ground)', border: 'none',
      borderRadius: 'var(--radius-sm)', padding: pad, minHeight: 'var(--tap-min)',
    },
    outline: {
      background: hover && !disabled ? 'var(--surface-2)' : 'var(--surface)',
      color: hover && !disabled ? 'var(--accent)' : 'var(--ink)',
      border: 'var(--border-hair) solid var(--line)',
      borderRadius: 'var(--radius-sm)', padding: pad, minHeight: 'var(--tap-min)',
    },
    quiet: {
      background: 'none', border: 'none', padding: 0,
      color: hover && !disabled ? 'var(--accent)' : 'var(--ink-faint)',
    },
  }[variant]
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...looks, ...style }} {...rest}>{children}</button>
  )
}
