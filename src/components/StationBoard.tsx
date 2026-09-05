/**
 * The station name board — the most recognisable object on any Indian
 * platform, and per `docs/04-palette.md` the one component worth building
 * early because it is free identity.
 *
 * It is three lines of type on yellow enamel inside a white border, bolted at
 * the corners, with a code strip along the bottom. Real boards carry the name
 * in Devanagari, Latin and the state language, in that order, and that order
 * is load-bearing — reversing it is the giveaway that nobody looked at one.
 *
 * The paint does not follow the page theme (see the --board block in
 * tokens.css): a board is the same yellow in both. Navy on it is 7.8:1.
 *
 * Sized for a 390px phone first: the Latin line is fluid between 22 and 30px
 * so the longest name still sits on one line inside a 320px card, and every
 * fixed measurement below is a hairline that must not scale away.
 */
interface Props {
  /** Devanagari line — top, as on the real board. */
  devanagari: string
  /** Latin line — the largest type on the board. */
  latin: string
  /** The state-language line. Optional: some boards carry only two. */
  regional?: string
  /** Station code, stencilled bottom-left. */
  code: string
  /** Bottom-right strip — zone on a real board. Keep it short. */
  zone?: string
}

/** The corner bolts. Four of them, and they are visibly countersunk. */
function Bolt({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute size-2 rounded-full bg-board-ink/25 ring-1 ring-board-ink/15 ${className}`}
    />
  )
}

export function StationBoard({ devanagari, latin, regional, code, zone }: Props) {
  return (
    <div className="relative select-none rounded-[2px] bg-board p-[3px] shadow-[0_2px_0_0_rgba(18,40,63,0.35)]">
      {/* The white enamel border is a separate ring inside the yellow, not a
          CSS border on it — on a real board the yellow runs past the white on
          all four sides, and a plain border loses that. */}
      <div className="rounded-[1px] border-2 border-board-edge px-4 py-3.5 text-center">
        <p className="m-0 text-[0.8125rem] leading-tight text-board-ink/85">{devanagari}</p>
        <p className="m-0 mt-0.5 text-[clamp(1.375rem,7vw,1.875rem)] leading-[1.1] font-extrabold tracking-[0.12em] text-board-ink uppercase">
          {latin}
        </p>
        {regional && (
          <p className="m-0 mt-0.5 text-[0.8125rem] leading-tight text-board-ink/85">{regional}</p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-board-ink/25 pt-2">
          <span className="tabular text-[0.6875rem] leading-none font-bold tracking-[0.2em] text-board-ink">
            {code}
          </span>
          {zone && (
            <span className="text-[0.6875rem] leading-none font-semibold tracking-[0.2em] text-board-ink/75">
              {zone}
            </span>
          )}
        </div>
      </div>

      <Bolt className="top-1.5 left-1.5" />
      <Bolt className="top-1.5 right-1.5" />
      <Bolt className="bottom-1.5 left-1.5" />
      <Bolt className="bottom-1.5 right-1.5" />
    </div>
  )
}

/**
 * The bracket the board hangs from. Two steel hangers over a mounting rail —
 * drawn rather than photographed so it stays 400 bytes and crisp on a phone.
 * `preserveAspectRatio` is off on purpose: the rail should stretch to the
 * card, the hangers should not thicken with it.
 */
export function BoardBracket() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      className="block h-3.5 w-full text-board-frame"
    >
      <rect x="0" y="0" width="200" height="3" fill="currentColor" opacity="0.9" />
      <rect x="34" y="3" width="3" height="11" fill="currentColor" opacity="0.75" />
      <rect x="163" y="3" width="3" height="11" fill="currentColor" opacity="0.75" />
    </svg>
  )
}
