import React from 'react';
import { useSession } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'

const MenuBar: React.FC = () => {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  return (
    <nav className="bg-gray-800 shadow-md py-2 flex justify-between items-center w-full">
      <Link 
            className="text-2xl pt-2 pl-2 text-white"
            href="/">Kondo
      </Link>
      {session?.user?.image && (
        <Image
          className="rounded-full border-2 border-blue-500"
          src={session.user.image}
          alt="User Avatar"
          width={40}
          height={40}
          />
        )}
    </nav>
  )
}

export default MenuBar
