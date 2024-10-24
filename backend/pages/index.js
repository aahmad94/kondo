// pages/index.js
import React from 'react';
import Chatbox from '../app/components/ChatBox';
import Menubar from '../app/components/MenuBar';
import Bookmarks from '../app/components/Bookmarks';
import { getSession, useSession } from "next-auth/react"
import ProtectedRoute from "../app/components/ProtectedRoute"


export default function HomePage() {
	const { data: session, status } = useSession()

  return (
    <ProtectedRoute>
      <Menubar />
      <div className="flex h-screen bg-gray-900">
        <Bookmarks />
        <div className="flex-1 flex flex-col justify-end">
          <Chatbox />
        </div>
      </div>
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
