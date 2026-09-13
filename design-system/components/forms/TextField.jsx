import React from 'react'

/** The label every control in the app wears: 11px, uppercase, tracked, faint. */
export function FieldLabel({ children, htmlFor, optional }) {
  return (
    <label htmlFor={htmlFor} style={{
      display: 'block', marginBottom: 6, fontSize:'var(--text-label)',fontWeight:'var(--weight-semibold)',letterSpacing:'var(--tracking-label)',textTransform:'uppercase',
      lineHeight: 1, color: 'var(--ink-faint)',
    }}>
      {children}{optional && <span style={{ color: 'var(--ink-faint)' }}> — optional</span>}
    </label>
  )
}

const control = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  borderRadius: 'var(--radius-sm)', border: 'var(--border-hair) solid var(--line)',
  background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)', outline: 'none',
}

/** Text, date or time input with the app's label above it. */
export function TextField({ label, optional, type = 'text', placeholder, value, onChange, max, id }) {
  const auto = React.useId()
  const fid = id || auto
  const [focus, setFocus] = React.useState(false)
  return (
    <div>
      {label && <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>}
      <input id={fid} type={type} placeholder={placeholder} value={value} max={max}
        autoComplete="off" spellCheck={false}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...control, borderColor: focus ? 'var(--accent)' : 'var(--line)' }} />
    </div>
  )
}

/** Native select, styled to match TextField. */
export function SelectField({ label, optional, value, onChange, options = [], id }) {
  const auto = React.useId()
  const fid = id || auto
  const [focus, setFocus] = React.useState(false)
  return (
    <div>
      {label && <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>}
      <select id={fid} value={value} onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...control, borderColor: focus ? 'var(--accent)' : 'var(--line)' }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/**
 * The empty/hint slot that stands in for a control which cannot exist yet —
 * the train list before both stations are picked. Dashed when it is waiting
 * on the user, solid when it is stating a fact about the data.
 */
export function FieldNote({ children, waiting }) {
  return (
    <p style={{
      margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
      border: `var(--border-hair) ${waiting ? 'dashed' : 'solid'} var(--line)`,
      fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-sm)', color: 'var(--ink-faint)',
    }}>{children}</p>
  )
}
