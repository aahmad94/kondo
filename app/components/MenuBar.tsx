'use client';

import React from 'react';
import { useSession } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation';
import LanguageSelector from './LanguageSelector';

interface MenuBarProps {
  onBookmarkSelect: (bookmarkId: string | null, bookmarkTitle: string | null) => void;
  onLanguageChange: (languageCode: string) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onBookmarkSelect, onLanguageChange }: MenuBarProps) => {
  const { data: session, status } = useSession()
  const router = useRouter();
  const searchParams = useSearchParams();

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Clear the query parameters by pushing to the base path
    router.push('/');
    onBookmarkSelect(null, null);
  };

  const handleClearBookmark = () => {
    onBookmarkSelect(null, null);
  };

  return (
    <nav className="bg-gray-800 shadow-md flex justify-between items-center w-full">
      <Link 
        className="text-2xl pt-2 pl-4 text-white"
        href="/"
        onClick={handleLogoClick}
      >
        Kondo
      </Link>
      <div className="flex items-center gap-4 mr-4">
        <LanguageSelector onLanguageChange={onLanguageChange} onClearBookmark={handleClearBookmark} />
        {session?.user?.image && (
          <Image
            className="rounded-full m-2 border-2 border-blue-500"
            src={session.user.image}
            alt="User Avatar"
            width={40}
            height={40}
          />
        )}
      </div>
    </nav>
  )
}

export default MenuBar
