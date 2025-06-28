// ────────────────────────────────────────────────────────────────
// File: lib/time.ts
//
// Eastern-time helpers (America/New_York) built on Luxon.
//   • ET(...)             → DateTime in America/New_York
//   • ETfromMillis(ms)    → epoch-millis  ➜ EDT
//   • ETfromIsoUTC(iso)   → ISO (UTC)     ➜ EDT
//   • toJS(dt)            → Native Date (handy for Prisma)
//   • pretty(dt, opts)    → Quick Intl formatter
// ----------------------------------------------------------------

import { DateTime } from "luxon";

/** A *type-only* alias for Luxon’s DateTime instance (always valid) */
type LuxonDateTime = ReturnType<typeof DateTime.now>;

const EDT_ZONE = "America/New_York";

/* ------------------------------------------------------------------ */
/*  Primary converters                                                */
/* ------------------------------------------------------------------ */

/** ET() — now *or* convert Date / ISO string to Eastern Time */
export function ET(d?: string | Date | null): LuxonDateTime {
  const base = d ? DateTime.fromJSDate(new Date(d)) : DateTime.now();
  return base.setZone(EDT_ZONE);
}

/** Convert Clover epoch-millis → Eastern Time */
export function ETfromMillis(ms: number): LuxonDateTime {
  return DateTime.fromMillis(ms, { zone: "utc" }).setZone(EDT_ZONE);
}

/** Convert Clover ISO UTC string → Eastern Time */
export function ETfromIsoUTC(iso: string): LuxonDateTime {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(EDT_ZONE);
}

/* ------------------------------------------------------------------ */
/*  Convenience helpers                                               */
/* ------------------------------------------------------------------ */

/** Native JS Date (useful when persisting with Prisma) */
export const toJS = (dt: LuxonDateTime): Date => dt.toJSDate();

/**
 * pretty() — quick Intl formatter.
 *   • default → “Jun 21 2025”
 *   • include `timeStyle` or `hour`/`minute` to add time
 */
export const pretty = (
  dt: LuxonDateTime,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string => {
  const js = dt.toJSDate();
  const hasTime =
    "timeStyle" in opts ||
    "hour"      in opts ||
    "minute"    in opts ||
    "second"    in opts;

  return hasTime
    ? js.toLocaleString(undefined, opts)
    : js.toLocaleDateString(undefined, opts);
};
