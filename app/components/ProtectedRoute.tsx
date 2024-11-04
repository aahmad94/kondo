'use client';

import { useSession } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Do nothing while loading
    if (!session) router.push('/api/auth/signin') // Redirect to login if not authenticated
  }, [session, status, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return session ? <>{children}</> : null
}
