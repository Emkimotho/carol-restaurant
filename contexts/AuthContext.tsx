// File: contexts/AuthContext.tsx
// ----------------------------------------------------------------------
//  Client-side Auth Provider – now reads `phone` from session.user and
//  exposes it to all consumers (OrderContext, etc.).
// ----------------------------------------------------------------------

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

/* ───────── Types ───────── */
export interface User {
  id:    number;
  name:  string;
  email: string;
  phone?: string;            // ← NEW
  roles: string[];
  isVerified: boolean;

  /* Address fields (already present) */
  streetAddress?: string;
  aptSuite?:      string;
  city?:          string;
  state?:         string;
  zip?:           string;
  country?:       string;
}

interface AuthContextType {
  user:   User | null;
  login:  (u: User) => void;
  logout: () => void;
}

/* ───────── Context ───────── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ───────── Provider ───────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [user, setUser]   = useState<User | null>(null);

  /* Sync the NextAuth session into our React context */
  useEffect(() => {
    if (session?.user) {
      const su = session.user as any; // session.user carries extra props
      const id = parseInt(su.id, 10);

      setUser({
        id,
        name:   su.name   || "",
        email:  su.email  || "",
        phone:  su.phone  || "",       // ← NEW
        roles:  su.roles  || [],
        isVerified: su.isVerified || false,

        /* Address fields */
        streetAddress: su.streetAddress || "",
        aptSuite:      su.aptSuite      || "",
        city:          su.city          || "",
        state:         su.state         || "",
        zip:           su.zip           || "",
        country:       su.country       || "",
      });
    } else {
      setUser(null);
    }
  }, [session]);

  /* Manual login/logout helpers (rarely used with NextAuth) */
  const login  = (u: User) => setUser(u);
  const logout = ()       => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ───────── Hook ───────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
