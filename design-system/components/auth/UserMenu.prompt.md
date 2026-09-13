Top-right chrome once signed in. Replaces the sign-in board.

```jsx
<UserMenu user={{ name: 'Saikat Bishal', email: 'saikat@example.com' }} onSignOut={signOut} />
```

Sign-out is the only destructive-tinted control in the system: `--vermillion` on hover, and only on hover. The fallback initial is `--cream` — a single large glyph, which is what cream is for.
