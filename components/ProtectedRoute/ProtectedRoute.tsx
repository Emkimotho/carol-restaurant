// File: components/ProtectedRoute/ProtectedRoute.tsx

'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { user } = useContext(AuthContext)!;

  useEffect(() => {
    if (!user) {
      router.replace('/unauthorized');
    }
  }, [user, router]);

  if (!user) {
    // Optionally, you can return a loading state or null
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
