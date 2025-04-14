import AdminLayout from "@/components/dashboard/AdminDashboard/AdminLayout";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
