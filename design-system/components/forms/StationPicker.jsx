import React from 'react'
import { FieldLabel } from './TextField.jsx'

/**
 * Station search with a result list, and the picked state it collapses to.
 *
 * Deliberately a <div> and not a <label>: a label labels one control, this
 * holds eight, and a click inside a label is forwarded to its labelable
 * descendant — which used to run onPick(null) on the "Change" button and wipe
 * the selection in the same tick the result was chosen.
 */
export function StationPicker({ label, value, onPick, results = [], query = '', onQuery, placeholder = 'Station name or code' }) {
  const id = React.useId()
  const [focus, setFocus] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const hits = open && query ? results : []
  return (
    <div style={{ position: 'relative' }}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: 'var(--border-hair) solid var(--line)', background: 'var(--surface-2)',
        }}>
          <span style={{ minWidth: 0 }}>
            <span className="tabular" style={{ marginRight: 8, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>{value.code}</span>
            <span style={{ color: 'var(--ink)' }}>{value.name}</span>
            <span style={{ marginLeft: 8, fontSize: 'var(--text-sm)', color: 'var(--ink-faint)' }}>{value.state}</span>
          </span>
          <button type="button" onClick={() => { onPick && onPick(null); setOpen(true) }} style={{
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            fontSize:'var(--text-label)',fontWeight:'var(--weight-semibold)',letterSpacing:'var(--tracking-label)',textTransform:'uppercase', color: 'var(--ink-faint)',
          }}>Change</button>
        </div>
      ) : (
        <input id={id} role="combobox" aria-expanded={hits.length > 0} value={query}
          placeholder={placeholder} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          onChange={(e) => { onQuery && onQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setFocus(true); setOpen(true) }} onBlur={() => setFocus(false)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            borderRadius: 'var(--radius-sm)', border: `var(--border-hair) solid ${focus ? 'var(--accent)' : 'var(--line)'}`,
            background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)', outline: 'none',
          }} />
      )}
      {hits.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 10, marginTop: 4, listStyle: 'none', padding: 0,
          maxHeight: 240, width: '100%', overflow: 'auto', borderRadius: 'var(--radius-sm)',
          border: 'var(--border-hair) solid var(--line)', background: 'var(--surface)',
        }}>
          {hits.map((h, i) => (
            <li key={h.code}>
              {/* Selection stays on click so the keyboard still works, but the
                  press is swallowed: without this the input blurs on pointer-down
                  and, on touch, the click can land on whatever the re-render moved
                  under the finger. */}
              <button type="button" onPointerDown={(e) => e.preventDefault()}
                onClick={() => { onPick && onPick(h); setOpen(false) }}
                style={{
                  display: 'flex', width: '100%', alignItems: 'baseline', gap: 8, textAlign: 'left',
                  padding: '10px 12px', background: 'none', cursor: 'pointer',
                  border: 'none', borderBottom: i === hits.length - 1 ? 'none' : 'var(--border-hair) solid var(--line)',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
                }}>
                <span className="tabular" style={{ width: 56, flexShrink: 0, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>{h.code}</span>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--ink)' }}>{h.name}</span>
                <span style={{ flexShrink: 0, fontSize: 'var(--text-sm)', color: 'var(--ink-faint)' }}>{h.state}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
