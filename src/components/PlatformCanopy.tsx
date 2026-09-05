/**
 * What the placard hangs under: a platform canopy with its sodium lamps lit.
 *
 * A photograph was the first plan and it is the wrong answer here. It sits
 * behind live type at under a quarter opacity, where a photo contributes
 * nothing but weight and a JPEG's dark-area banding — and it would be the one
 * raster in an app whose whole argument is that the map is hand-drawn. This is
 * about a kilobyte of vector, sharp on every screen, and it recolours with the
 * theme because every value is a token.
 *
 * It occupies only the top of the card, behind the board and nothing else. An
 * earlier version drew the whole platform — coach, edge stripe, ballast — and
 * all of it landed behind body copy, where it had to be scrimmed until it was
 * invisible. Drawing less made it visible.
 *
 * Decorative: `aria-hidden`, no text, nothing the eye must resolve.
 */
export function PlatformCanopy() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[58%] overflow-hidden">
      <svg
        viewBox="0 0 320 244"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-0 h-full w-full opacity-40"
      >
        <defs>
          {/* A flat disc reads as a disc. The lamp has to fall off. */}
          <radialGradient id="pc-glow">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* the canopy: a shallow pitch, cropped left and right by the card */}
        <path d="M-10 20 L160 4 L330 20 L330 28 L160 12 L-10 28 Z" className="fill-steel" opacity="0.75" />
        {[20, 120, 220, 300].map((x) => (
          <g key={x} className="fill-steel" opacity="0.4">
            <rect x={x} y="22" width="2.5" height="222" />
            <path d={`M${x - 13} 30 L${x + 2.5} 22 L${x + 2.5} 35 Z`} />
          </g>
        ))}

        {/* two sodium lamps on their drops. They sit just above the board, so
            what actually reaches the eye is the spill around its top corners —
            which is the whole effect wanted, and costs 200 bytes. */}
        {[66, 254].map((x) => (
          <g key={x}>
            <rect x={x - 0.5} y="10" width="1" height="26" className="fill-steel" opacity="0.6" />
            <circle cx={x} cy="40" r="26" fill="url(#pc-glow)" />
            <circle cx={x} cy="38" r="3" className="fill-accent" opacity="0.95" />
          </g>
        ))}
      </svg>

      {/* Contrast insurance: clear at the top where only the board sits, the
          card's own ground by the time the copy starts. */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-surface/55 to-surface" />
    </div>
  )
}
