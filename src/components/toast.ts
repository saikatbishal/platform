/**
 * The app's one message queue — for a thing that went wrong somewhere the
 * person is not looking, and that they are owed an account of; and for an
 * add or a delete, where the message carries the Undo.
 *
 * A module store rather than context or a state library (docs/00-decisions.md
 * rejects one): a toast is raised from wherever the failure surfaces — an
 * async callback in a hook, long after the click that caused it — and the
 * only reader is `<Toaster>`, once, at the root. `useSyncExternalStore` there
 * is the whole subscription.
 *
 * Not for success alone. A message that only says "done" is filler; one that
 * names what was done and offers the way back has a job. Sync stays silent
 * when it works, the rule the sync banner keeps.
 */

export interface ToastAction {
  /** Uppercase label text, as written — a verb for what it will do. */
  label: string
  run: () => void
}

export interface Toast {
  /**
   * Same id replaces rather than stacks, so a failure that recurs — the same
   * delete failing twice, the account read on every reconnect — is one
   * message, restarted, not a column of copies.
   */
  id: string
  message: string
  action?: ToastAction
}

export interface ShownToast extends Toast {
  /** Bumped on every show, so a replaced toast remounts and its timer starts
      over rather than expiring on the old message's clock. */
  seq: number
}

/** Older ones give way: three is as many as fit above a phone's sheet. */
const MAX = 3

let shown: readonly ShownToast[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function showToast(toast: Toast): void {
  seq += 1
  shown = [...shown.filter((t) => t.id !== toast.id), { ...toast, seq }].slice(-MAX)
  emit()
}

export function dismissToast(id: string): void {
  if (!shown.some((t) => t.id === id)) return
  shown = shown.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getToasts(): readonly ShownToast[] {
  return shown
}
