import { useSession } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'

const Menubar = () => {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between w-full">
      <div className="text-2xl text-black w-1/2">
        <Link href="/">Kondo</Link>
      </div>
      <div className="flex-1 flex justify-end items-center space-x-4 w-1/2">
        {session?.user?.image && (
          <Image
            src={session.user.image}
            alt="User Avatar"
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
      </div>
    </nav>
  )
}

export default Menubar