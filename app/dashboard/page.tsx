// File: app/dashboard/page.tsx
// Description: Reads the session and 302s into the right sub‐dashboard

import { getServerSession } from "next-auth";
import { authOptions }       from "@/lib/auth";
import { redirect }          from "next/navigation";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  if (!session) return redirect("/login");

  const roles = (session.user.roles || []).map((r) => r.toLowerCase());

  if (roles.includes("superadmin") || roles.includes("admin")) {
    return redirect("/dashboard/admin-dashboard");
  }
  if (roles.includes("staff")) {
    return redirect("/dashboard/staff-dashboard");
  }
  if (roles.includes("server")) {
    return redirect("/dashboard/server-dashboard");
  }
  if (roles.includes("cashier")) {
    return redirect("/dashboard/cashier-dashboard");
  }
  if (roles.includes("driver")) {
    return redirect("/dashboard/driver-dashboard");
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>No Dashboard Available</h1>
      <p>Please contact your administrator.</p>
    </div>
  );
}
