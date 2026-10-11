import { useEffect, useState, useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts, type ShownToast } from './toast.ts'

/**
 * How long a message stays without being touched. Long enough to read two
 * lines and reach for the button; it never runs out while a pointer is on it
 * or focus is inside it, so nobody has to race it (WCAG 2.2.1).
 */
const LINGER_MS = 10_000

/**
 * Where failures that happened out of sight are told — see toast.ts.
 *
 * Top on a phone, bottom-right from `sm` up. On a phone the bottom is where
 * the sheets rise from and where the thumb is working; a delete that fails
 * inside the journey sheet would raise its message underneath that sheet.
 * The top strip above a sheet stays visible, so the message lands there, over
 * the nameplate and account chip, for the few seconds it is up. From `sm` up
 * the bottom-right corner is free except for the zoom stack, so the column
 * sits beside it, level with its bottom edge — 3.875rem is the stack's 42px
 * plus its 12px inset plus the 8px gap the chrome uses everywhere.
 *
 * Newest nearest the edge it enters from: top on a phone (column-reverse),
 * bottom on a wider screen.
 *
 * z-40: above the sheets (z-20) and the popovers (z-30), because the delete
 * that fails is pressed inside a sheet.
 *
 * The region is mounted from first paint and stays mounted, empty or not — a
 * live region inserted together with its text is not reliably announced.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-3 top-3 z-40 flex flex-col-reverse items-center gap-2
                 sm:inset-x-auto sm:top-auto sm:right-[3.875rem] sm:bottom-3 sm:flex-col sm:items-end"
    >
      {toasts.map((t) => <ToastRow key={`${t.id}:${t.seq}`} toast={t} />)}
    </div>
  )
}

function ToastRow({ toast }: { toast: ShownToast }) {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (held) return
    const timer = window.setTimeout(() => { dismissToast(toast.id) }, LINGER_MS)
    return () => { window.clearTimeout(timer) }
  }, [held, toast.id])

  return (
    /* The sync banner's surface — hairline, `--surface`, 4px — because these
       are the same kind of thing: an account of what did not happen. The
       shadow is the popovers' (UserMenu, RouteTooltip): this one floats over
       whatever is open, a sheet included, and a hairline alone does not lift
       surface off surface. Not vermillion: everything raised here has left
       the journeys safe, and a red that means "nothing is lost" would teach
       people to ignore the red that means something is. */
    <div
      className="toast pointer-events-auto flex w-full max-w-sm items-center gap-1 rounded-sm border border-line bg-surface py-1 pr-1 pl-3 shadow-lg sm:w-80"
      onPointerEnter={() => { setHeld(true) }}
      onPointerLeave={() => { setHeld(false) }}
      onFocus={() => { setHeld(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false) }}
    >
      <p className="mb-0 flex-1 py-1.5 text-xs leading-relaxed text-ink-soft">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            dismissToast(toast.id)
            toast.action?.run()
          }}
          className="min-h-11 shrink-0 rounded-sm px-2.5 text-label font-semibold tracking-label text-ink uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => { dismissToast(toast.id) }}
        aria-label="Hide this message"
        className="grid size-11 shrink-0 place-items-center rounded-sm text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M1 1 L11 11 M11 1 L1 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
