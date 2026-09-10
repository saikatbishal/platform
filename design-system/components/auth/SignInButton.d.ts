/** The single sign-in control. Neutral by design; the card around it carries the brand. */
export interface SignInButtonProps {
  /** 'google' shows the official mark; 'demo' drops it and explains the local session. */
  mode?: 'google' | 'demo';
  busy?: boolean;
  onSignIn?: () => void;
}
export declare function SignInButton(props: SignInButtonProps): JSX.Element;
