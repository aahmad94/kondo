import React from 'react';
import { useSession } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'


interface MenuBarProps {
  onBookmarkSelect: (bookmarkId: string) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onBookmarkSelect }: MenuBarProps) => {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onBookmarkSelect('');
  };

  return (
    <nav className="bg-gray-800 shadow-md flex justify-between items-center w-full">
      <Link 
            className="text-2xl pt-2 pl-4 text-white"
            href="/"
            onClick={handleLogoClick}>Kondo
      </Link>
      {session?.user?.image && (
        <Image
          className="rounded-full m-2 mr-4 border-2 border-blue-500"
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
