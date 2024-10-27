'use client';

import ProtectedRoute from '../components/ProtectedRoute'

export default function UserPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>User Page</h1>
        {/* Protected content here */}
      </div>
    </ProtectedRoute>
  )
}
