/** Station combobox: code, name, state — and the row it collapses to once picked. */
export interface StationHit { code: string; name: string; state: string }
export interface StationPickerProps {
  label?: string;
  /** The picked station, or null while searching. */
  value?: StationHit | null;
  onPick?: (hit: StationHit | null) => void;
  /** Already-filtered results. The component does no matching itself. */
  results?: StationHit[];
  query?: string;
  onQuery?: (q: string) => void;
  placeholder?: string;
}
export declare function StationPicker(props: StationPickerProps): JSX.Element;
