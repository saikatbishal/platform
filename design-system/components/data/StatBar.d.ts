/**
 * The map's totals strip: kilometres, stations, states, longest.
 *
 * @startingPoint section="Data" subtitle="Totals strip in cream tabular figures" viewport="700x150"
 */
export interface Stat {
  label: string;
  value: string;
  /** 'warn' renders the cell in --oxide on --surface-2 — the uncounted-journeys cell. */
  tone?: 'warn';
}
export interface StatBarProps { stats?: Stat[] }
export declare function StatBar(props: StatBarProps): JSX.Element;
