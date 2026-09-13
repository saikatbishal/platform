import React from 'react'

/**
 * The bracket the board hangs from: two steel hangers over a mounting rail.
 * preserveAspectRatio is off on purpose — the rail stretches to the card,
 * the hangers must not thicken with it.
 */
export function BoardBracket() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 14" preserveAspectRatio="none"
         style={{ display: 'block', height: 14, width: '100%', color: 'var(--board-frame)' }}>
      <rect x="0" y="0" width="200" height="3" fill="currentColor" opacity="0.9" />
      <rect x="34" y="3" width="3" height="11" fill="currentColor" opacity="0.75" />
      <rect x="163" y="3" width="3" height="11" fill="currentColor" opacity="0.75" />
    </svg>
  )
}
