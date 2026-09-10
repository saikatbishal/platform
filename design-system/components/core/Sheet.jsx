import React from 'react'

/**
 * The one overlay pattern: full-bleed bottom sheet on a phone, centred modal
 * from sm up. Scrim is --ground at 60% with a 2px blur — enough to push the
 * map back without hiding what the sheet is about.
 */
export function Sheet({ title, open = true, onClose, children, width = 448 }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 20, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'color-mix(in srgb, var(--ground) 60%, transparent)', backdropFilter: 'blur(2px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxHeight: '88%', width: '100%', maxWidth: width, overflow: 'auto', padding: 20,
        borderRadius: 'var(--radius-sheet)', border: 'var(--border-hair) solid var(--line)',
        background: 'var(--surface)', boxShadow: 'var(--shadow-sheet)',
      }}>
        {title && (
          <h2 style={{
            margin: '0 0 16px', fontSize:'var(--text-label)',fontWeight:'var(--weight-semibold)',letterSpacing:'var(--tracking-label)',textTransform:'uppercase',lineHeight:1,
            color: 'var(--ink-faint)',
          }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
