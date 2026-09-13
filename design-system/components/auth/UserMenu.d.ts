/** Corner avatar chip with an account panel. Click-outside and Escape close it. */
export interface AuthUser { name: string; email: string; avatarUrl?: string }
export interface UserMenuProps {
  user?: AuthUser;
  onSignOut?: () => void;
  /** Open on mount — for specimen cards only. */
  defaultOpen?: boolean;
}
export declare function UserMenu(props: UserMenuProps): JSX.Element;
