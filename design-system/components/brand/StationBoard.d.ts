/**
 * The Indian Railways station name board — the app's identity object.
 */
export interface StationBoardProps {
  /** Devanagari line — top, as on the real board. */
  devanagari?: string;
  /** Latin line — the largest type on the board. */
  latin: string;
  /** The state-language line. Optional: some boards carry only two. */
  regional?: string;
  /** Station code, stencilled bottom-left. */
  code?: string;
  /** Bottom-right strip — zone on a real board. Keep it short. */
  zone?: string;
  /** 'md' uses the fluid board step; 'sm' is for list rows and headers. */
  size?: 'sm' | 'md';
}
export declare function StationBoard(props: StationBoardProps): JSX.Element;
