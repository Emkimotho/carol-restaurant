// app/dashboard/customer/profile/page.tsx
import React from 'react';
import { useAuth } from '../../../../contexts/AuthContext';

const CustomerProfilePage = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold">Your Profile</h2>
      <form className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input type="text" value={user.name} className="mt-1 block w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" value={user.email} className="mt-1 block w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone Number</label>
          <input type="tel" className="mt-1 block w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Address</label>
          <input type="text" className="mt-1 block w-full border rounded p-2" />
        </div>
        {/* Add more fields as necessary */}
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded">
          Save Changes
        </button>
      </form>
      <button onClick={logout} className="mt-4 text-red-500">
        Logout
      </button>
    </div>
  );
};

export default CustomerProfilePage;
