import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from './useAuth.ts'

interface Props {
  user: AuthUser
  onSignOut: () => Promise<void>
}

/** Avatar chip in the corner; opens a small panel with the account and sign-out. */
export function UserMenu({ user, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Click outside or Escape closes — the two behaviours every popover owes you.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initial = (user.name || '?').trim().charAt(0).toUpperCase()

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        onClick={() => { setOpen((v) => !v) }}
        className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface
                   transition-[border-color] hover:border-accent"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <span className="text-sm font-semibold text-cream">{initial}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 w-60 rounded-sm border border-line bg-surface p-1 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="m-0 truncate text-sm font-semibold">{user.name}</p>
            <p className="m-0 truncate text-xs text-ink-faint">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); void onSignOut() }}
            className="mt-1 w-full rounded-sm px-3 py-2.5 text-left text-sm text-ink-soft
                       hover:bg-surface-2 hover:text-vermillion"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
