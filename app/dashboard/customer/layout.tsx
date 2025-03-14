// app/dashboard/customer/layout.tsx
import ProtectedRoute from '../../../components/ProtectedRoute/ProtectedRoute';
import SidebarCart from '../../../components/SidebarCart/SidebarCart'; // Example sidebar component

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="flex">
        <SidebarCart />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
