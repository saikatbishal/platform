/**
 * Bottom sheet on a phone, centred modal from sm up.
 */
export interface SheetProps {
  /** Uppercase label-scale heading. Omit for an untitled sheet. */
  title?: string;
  open?: boolean;
  onClose?: () => void;
  /** Max width in px at desktop. Default 448. */
  width?: number;
  children?: React.ReactNode;
}
export declare function Sheet(props: SheetProps): JSX.Element | null;
