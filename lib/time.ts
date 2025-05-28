// File: lib/time.ts
// Eastern‑time helpers (America/New_York) using Luxon.

import { DateTime } from "luxon";

/** ET() — now or convert to America/New_York */
export function ET(d?: string | Date | null) {
  const base = d ? DateTime.fromJSDate(new Date(d)) : DateTime.now();
  return base.setZone("America/New_York");
}

/** Native Date for Prisma */
export const toJS = (dt: ReturnType<typeof ET>) => dt.toJSDate();

/** Pretty‑print helper (handles date‑only or date+time) */
export const pretty = (
  dt: ReturnType<typeof ET>,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) => {
  const js = dt.toJSDate();
  const hasTime =
    "timeStyle" in opts || "hour" in opts || "minute" in opts || "second" in opts;
  return hasTime
    ? js.toLocaleString(undefined, opts)
    : js.toLocaleDateString(undefined, opts);
};
