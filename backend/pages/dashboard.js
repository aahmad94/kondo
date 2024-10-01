// pages/dashboard.js
import { getSession, useSession } from "next-auth/react"
import ProtectedRoute from "../app/components/ProtectedRoute"

export default function Dashboard() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute>
      <div>
        <h1>
          Welcome to your dashboard, {session?.user?.name || 'Guest'}!
        </h1>
        {/* Add more dashboard components here */}
      </div>
    </ProtectedRoute>
  )
}

export async function getServerSideProps(context) {
  const session = await getSession(context)
  console.log("Session in getServerSideProps:", session) // Server-side log

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: { session },
  }
}
