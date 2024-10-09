// pages/dashboard.js
import { getSession, useSession } from "next-auth/react"
import ProtectedRoute from "../app/components/ProtectedRoute"
import Menubar from "../app/components/menubar"

export default function Chatbox() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute>
      
      <div>
        <Menubar className="w-full h-[100px] flex justify-end" />
        <h1>
          Welcome to your chatbox, {session?.user?.name || 'Guest'}!
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
