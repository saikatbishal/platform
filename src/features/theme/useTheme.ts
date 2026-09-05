import { useEffect, useState } from 'react'
import { msUntilNextChange, themeAt, type Theme } from './timeOfDay.ts'

/**
 * Keep the browser's own chrome in step. `index.html` declares two
 * media-scoped `theme-color` metas, and the OS preference is no longer what
 * decides this — so those are switched off and one plain meta carries the
 * resolved `--ground`. Reading the token rather than repeating the hex means
 * it cannot drift out of `tokens.css`.
 */
function syncThemeColor() {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')) {
    meta.media = 'not all'
  }
  let plain = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (!plain) {
    plain = document.createElement('meta')
    plain.name = 'theme-color'
    document.head.appendChild(plain)
  }
  plain.content = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
}

/**
 * Stamps `data-theme` from the clock and keeps it there.
 *
 * Call once, at the root. The attribute is already on `<html>` before this
 * runs — a script in `index.html` puts it there ahead of the first paint — so
 * mounting is a confirmation, not a change, and there is no flash.
 *
 * Two things move it afterwards: a timer set to the next 06:00 or 18:00, and
 * a visibility check. The timer alone is not enough, because a phone that
 * sleeps through the boundary wakes with a timer that was never allowed to
 * fire, which is exactly the case this app is for.
 */
export function useTimeOfDayTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => themeAt(new Date()))

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.style.removeProperty('background')
    syncThemeColor()
  }, [theme])

  useEffect(() => {
    let timer = 0

    const check = () => {
      const now = new Date()
      setTheme(themeAt(now))
      window.clearTimeout(timer)
      timer = window.setTimeout(check, msUntilNextChange(now))
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return theme
}
