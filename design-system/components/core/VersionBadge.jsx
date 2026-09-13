import React from 'react'

/**
 * The corner nameplate: product name and build, split by a hairline inside a
 * single 2px-radius shell. Deliberately quiet — this used to be full-strength
 * accent on a 2px border, which spent the one colour that means "you have
 * travelled this" on a version number. The yellow belongs to the route.
 */
export function VersionBadge({ name = 'Platform', version = 'v0.1' }) {
  const cell = {
    padding: '6px 10px', fontSize: 'var(--text-label)', fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', lineHeight: 1,
  }
  return (
    <div style={{
      display: 'inline-flex', overflow: 'hidden', width: 'fit-content',
      borderRadius: 'var(--radius-hair)', border: 'var(--border-hair) solid var(--line)',
      background: 'color-mix(in srgb, var(--surface) 90%, transparent)', backdropFilter: 'blur(4px)',
    }}>
      <span style={{ ...cell, color: 'var(--ink)' }}>{name}</span>
      <span style={{ ...cell, color: 'var(--ink-faint)', borderLeft: 'var(--border-hair) solid var(--line)' }}>{version}</span>
    </div>
  )
}
