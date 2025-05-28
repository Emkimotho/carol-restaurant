"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  isVerified: boolean;
  streetAddress?: string;     // <<< CHANGED
  aptSuite?:     string;       // <<< CHANGED
  city?:         string;       // <<< CHANGED
  state?:        string;       // <<< CHANGED
  zip?:          string;       // <<< CHANGED
  country?:      string;       // <<< CHANGED
}

interface AuthContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (session?.user) {
      // CAST session.user to `any` so TS knows we have the extra address fields
      const su = session.user as any;
      const id = parseInt(su.id, 10);

      setUser({
        id,
        name:         su.name         || "",
        email:        su.email        || "",
        roles:        su.roles        || [],
        isVerified:   su.isVerified   || false,
        streetAddress: su.streetAddress || "",    // <<< CHANGED
        aptSuite:      su.aptSuite      || "",    // <<< CHANGED
        city:          su.city          || "",    // <<< CHANGED
        state:         su.state         || "",    // <<< CHANGED
        zip:           su.zip           || "",    // <<< CHANGED
        country:       su.country       || "",    // <<< CHANGED
      });
    } else {
      setUser(null);
    }
  }, [session]);

  const login  = (u: User) => setUser(u);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
