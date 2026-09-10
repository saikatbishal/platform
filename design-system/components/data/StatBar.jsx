import React from 'react'

/**
 * The totals strip. A row of cells divided by hairlines inside one shell:
 * label above in --ink-faint, the figure below in --cream at --text-xl.
 * Cream is for large numerals only, which is exactly what these are.
 *
 * A cell marked tone="warn" is the "Not drawn" count — journeys the rail
 * graph could not route. It is --oxide on --surface-2 and sits at the end,
 * because a journey contributing 0 km to a figure labelled "Kilometres"
 * makes that figure wrong, not incomplete.
 */
export function StatBar({ stats = [] }) {
  return (
    <section aria-label="Your totals" style={{
      display: 'flex', overflow: 'hidden', width: 'fit-content',
      borderRadius: 'var(--radius-sm)', border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface)',
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          display: 'flex', flexDirection: 'column-reverse', alignItems: s.tone ? 'center' : 'flex-start',
          padding: '12px', borderRight: i === stats.length - 1 ? 'none' : 'var(--border-hair) solid var(--line)',
          background: s.tone ? 'var(--surface-2)' : 'transparent',
        }}>
          <span style={{
            marginTop: 6, fontSize: 'var(--text-label)', fontWeight: 'var(--weight-semibold)',
            letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', lineHeight: 1,
            color: 'var(--ink-faint)', whiteSpace: 'nowrap',
          }}>{s.label}</span>
          <span className="tabular" style={{
            fontSize: s.tone ? 'var(--text-base)' : 'var(--text-xl)', lineHeight: 1,
            color: s.tone === 'warn' ? 'var(--oxide)' : 'var(--cream)',
          }}>{s.value}</span>
        </div>
      ))}
    </section>
  )
}
