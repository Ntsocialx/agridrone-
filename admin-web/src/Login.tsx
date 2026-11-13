import { useState, type FormEvent } from "react";
import { ApiError, api, type User } from "./api";
import { Button, Field } from "./ui";

export function Login({ onSignedIn, notice }: { onSignedIn: (token: string, user: User) => void; notice: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>("/auth/login", { body: { email: email.trim(), password } });
      // Convenience only: the server checks the admin role on every admin request.
      if (user.role !== "admin") {
        setError("This website is for AgricDrone Hub admins. Pilots and farm owners use the mobile app.");
        return;
      }
      onSignedIn(token, user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit} noValidate>
        <img src="/logo-agriseta.png" alt="AgriSETA" className="login-logo" />
        <p className="eyebrow">AgricDrone Hub</p>
        <h1>Admin sign-in</h1>
        <p className="muted">For AgricDrone Hub staff. Admin accounts are created by the system owner and can't be signed up for.</p>

        {notice ? <div className="banner">{notice}</div> : null}

        <div className="stack">
          <Field label="Email address" type="email" placeholder="email@example.com" value={email} onChange={setEmail} autoComplete="username" autoFocus />
          <Field label="Password" type="password" placeholder="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>

        {error ? <div className="alert" role="alert">{error}</div> : null}

        <Button type="submit" variant="dark" busy={busy} className="btn-block">Sign in to admin console</Button>
        <p className="hint">The server may take up to a minute to wake up on the first sign-in.</p>
      </form>
      <footer className="legal">
        <a href="/terms" target="_blank" rel="noreferrer">Terms and Conditions</a>
        <span aria-hidden>|</span>
        <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a>
        <span aria-hidden>|</span>
        <span>Powered by 4IR</span>
      </footer>
    </main>
  );
}
