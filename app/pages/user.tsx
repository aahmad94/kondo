'use client';

import ProtectedRoute from '../components/ProtectedRoute';
import AliasManagement from '../components/AliasManagement';

export default function UserPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-card-foreground mb-2">User Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences and community settings.</p>
            </div>
            
            <AliasManagement />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
