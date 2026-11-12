import { useEffect, useState } from "react";
import { loadSession, onUnauthorized, saveSession, setToken, type User } from "./api";
import { Console } from "./Console";
import { Login } from "./Login";

export function App() {
  const [user, setUser] = useState<User | null>(() => loadSession()?.user ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = (message: string | null = null) => {
    saveSession(null);
    setToken(null);
    setUser(null);
    setNotice(message);
  };

  useEffect(() => {
    onUnauthorized(() => signOut("Your session ended. Please sign in again."));
  }, []);

  if (!user) {
    return (
      <Login
        notice={notice}
        onSignedIn={(token, signedIn) => {
          saveSession({ token, user: signedIn });
          setToken(token);
          setNotice(null);
          setUser(signedIn);
        }}
      />
    );
  }
  return <Console user={user} onSignOut={() => signOut()} />;
}
