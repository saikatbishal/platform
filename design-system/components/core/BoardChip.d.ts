/** A board-painted button: station code, divider, label. */
export interface BoardChipProps {
  /** Station code in the left strip. Default 'PF'. */
  code?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}
export declare function BoardChip(props: BoardChipProps): JSX.Element;
