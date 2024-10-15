import React from 'react';
import { useSession } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'

const MenuBar: React.FC = () => {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <nav className="bg-white shadow-md p-2 flex justify-between items-center w-full">
      <div className="text-2xl flex text-black">
        <Link href="/">Kondo</Link>
      </div>
      {session?.user?.image && (
          <Image
            src={session.user.image}
            alt="User Avatar"
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
    </nav>
  )
}

export default MenuBar
