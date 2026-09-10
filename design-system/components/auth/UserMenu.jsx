import React from 'react'

/** Avatar chip in the corner; opens a small panel with the account and sign-out. */
export function UserMenu({ user = { name: '', email: '' }, onSignOut, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [hover, setHover] = React.useState(false)
  const [hoverOut, setHoverOut] = React.useState(false)
  const initial = (user.name || '?').trim().charAt(0).toUpperCase()
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" aria-expanded={open} aria-label={`Account: ${user.name}`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: 'grid', placeItems: 'center', height: 44, width: 44, cursor: 'pointer',
          borderRadius: 'var(--radius-round)', background: 'var(--surface)',
          border: `var(--border-hair) solid ${hover ? 'var(--accent)' : 'var(--line-strong)'}`,
          transition: 'border-color var(--duration-fast) var(--ease-standard)',
        }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" style={{ height: 32, width: 32, borderRadius: '50%' }} />
          : <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--cream)' }}>{initial}</span>}
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 30, marginTop: 8, width: 240,
          padding: 4, borderRadius: 'var(--radius-sm)', border: 'var(--border-hair) solid var(--line)',
          background: 'var(--surface)', boxShadow: 'var(--shadow-sheet)',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: 'var(--border-hair) solid var(--line)' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--ink)' }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--ink-faint)' }}>{user.email}</p>
          </div>
          <button type="button" role="menuitem" onClick={onSignOut}
            onMouseEnter={() => setHoverOut(true)} onMouseLeave={() => setHoverOut(false)}
            style={{
              marginTop: 4, width: '100%', textAlign: 'left', padding: '10px 12px', cursor: 'pointer',
              borderRadius: 'var(--radius-sm)', border: 'none',
              background: hoverOut ? 'var(--surface-2)' : 'transparent',
              color: hoverOut ? 'var(--vermillion)' : 'var(--ink-soft)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            }}>Sign out</button>
        </div>
      )}
    </div>
  )
}
