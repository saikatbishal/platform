The only way into the app. Sits at the bottom of the sign-in board card.

```jsx
<SignInButton mode="google" busy={redirecting} onSignIn={signIn} />
```

Never restyle the Google "G" or put it on the accent — their brand rules ask for a plain light or dark surface, which is why this button is `--surface-2` and not the app's primary. In `demo` mode the mark disappears entirely.
