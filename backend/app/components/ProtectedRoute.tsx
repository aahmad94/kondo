import React, { useEffect } from "react"
import { useSession, signIn } from "next-auth/react"

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return // Do nothing while loading
    if (!session) signIn() // Redirect to sign-in if not authenticated
  }, [session, status])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return <>{children}</>
}
