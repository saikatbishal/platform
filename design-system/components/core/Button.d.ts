/**
 * Uppercase-label button in the three treatments the app uses.
 */
export interface ButtonProps {
  /** primary = accent fill (one per sheet); outline = the map's chrome; quiet = a bare label. */
  variant?: 'primary' | 'outline' | 'quiet';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
