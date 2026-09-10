import React from 'react'

/**
 * A list, not a wall of badges — locked ones stay visible so there is
 * something to aim at. No confetti on unlock: the map filling in is the
 * reward, this is where you check the honest thresholds.
 */
export function MilestoneList({ milestones = [] }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
      {milestones.map((m) => (
        <li key={m.id || m.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: `var(--border-hair) solid ${m.achieved ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--line)'}`,
          background: m.achieved ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)',
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: m.achieved ? 'var(--ink)' : 'var(--ink-soft)' }}>{m.label}</p>
            <p className="tabular" style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--ink-faint)' }}>{m.detail}</p>
          </div>
          <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 'var(--text-lg)', color: m.achieved ? 'var(--accent)' : 'var(--ink-faint)' }}>
            {m.achieved ? '✓' : '·'}
          </span>
        </li>
      ))}
    </ul>
  )
}
