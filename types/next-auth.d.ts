/* ────────────────────────────────────────────────────────────
 *  File: types/next-auth.d.ts
 *  Purpose: Extend NextAuth session & user objects so they
 *           carry strongly‑typed id and roles properties.
 * ─────────────────────────────────────────────────────────── */

import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  /** Additional fields on Session.user */
  interface Session {
    user: {
      /** Database PK (always number in this project) */
      id: number;
      /** Role codes, e.g. ['ADMIN'] | ['DRIVER'] */
      roles: string[];
    } & DefaultSession['user'];
  }

  /** Additional fields persisted on the User model */
  interface User extends DefaultUser {
    id: number;
    roles: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:    number;
    roles: string[];
  }
}
