import type { MilestoneStatus } from './milestones.ts'

interface Props {
  milestones: readonly MilestoneStatus[]
}

/**
 * A list, not a wall of badges — locked ones stay visible so there's
 * something to aim at, per the spec. No confetti on unlock: the map filling
 * in is the reward, this is just where you can check the honest thresholds.
 *
 * Just the list. It lives inside the ledger sheet, which owns the heading
 * and the way out.
 */
export function Milestones({ milestones }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {milestones.map((m) => (
        <li
          key={m.id}
          className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 ${
            m.achieved ? 'border-accent/40 bg-accent/10' : 'border-line bg-surface'
          }`}
        >
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${m.achieved ? 'text-ink' : 'text-ink-soft'}`}>{m.label}</p>
            <p className="tabular mt-0.5 text-sm text-ink-faint">{m.detail}</p>
          </div>
          <span
            aria-hidden="true"
            className={`shrink-0 text-lg ${m.achieved ? 'text-accent' : 'text-ink-faint'}`}
          >
            {m.achieved ? '✓' : '·'}
          </span>
        </li>
      ))}
    </ul>
  )
}
