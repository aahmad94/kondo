// pages/index.js
import React from 'react';
import Chatbox from '../app/components/ChatBox';
import Menubar from '../app/components/MenuBar';
import { getSession, useSession } from "next-auth/react"
import ProtectedRoute from "../app/components/ProtectedRoute"


export default function HomePage() {
	const { data: session, status } = useSession()

  return (
    <ProtectedRoute>
				<Menubar/>
				<div className="h-full bg-gray-900 flex flex-col justify-end">
					<Chatbox />
				</div>
				{/* Add more content or components here */}
    </ProtectedRoute>
  );
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