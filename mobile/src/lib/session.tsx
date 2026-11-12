import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import { ApiError, api, session, type Role, type User } from "./api";

type Session = {
  user: User | null;
  ready: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

// Admins use the admin website, so the app never signs them in (see login.tsx).
export const homeFor = (role: Role): Href => (role === "operator" ? "/operator-home" : role === "farm_owner" ? "/my-jobs" : "/");

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    await session.clear();
    setUser(null);
    router.replace("/");
  }, []);

  useEffect(() => {
    session.setUnauthorizedHandler(() => {
      void signOut();
    });
    session
      .load()
      .then(async (saved) => {
        // An admin session saved by an older app version: admins now use the website.
        if (saved?.user.role === "admin") {
          await session.clear();
          return setUser(null);
        }
        setUser(saved?.user ?? null);
      })
      .finally(() => setReady(true));
  }, [signOut]);

  const signIn = async (token: string, newUser: User) => {
    await session.save(token, newUser);
    setUser(newUser);
  };

  const updateUser = async (newUser: User) => {
    await session.updateUser(newUser);
    setUser(newUser);
  };

  return <SessionContext.Provider value={{ user, ready, signIn, signOut, updateUser }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

/** Signed-in screens only; the API sends you back to Welcome if the token expired. */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useUser called while signed out");
  return user;
}

/** Loads `path` and reloads whenever the screen comes back into focus. Pass null to skip. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, loading, reload, setData };
}
