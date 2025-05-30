'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import LanguageSelector from './LanguageSelector';

interface MenuBarProps {
  onLanguageChange: (languageCode: string) => void;
  onClearBookmark: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onLanguageChange, onClearBookmark }: MenuBarProps) => {
  const { data: session, status } = useSession()
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Clear the query parameters by pushing to the base path
    router.push('/');
    onClearBookmark();
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      <nav className="bg-gray-900 shadow-md flex justify-between items-center w-full">
        <Link 
          className="text-2xl pt-2 pl-4 text-white"
          href="/"
          onClick={handleLogoClick}
        >
          Kondo
        </Link>
        <div className="flex items-center gap-4 mr-4">
          <LanguageSelector 
            onLanguageChange={onLanguageChange} 
            onClearBookmark={onClearBookmark}
          />
          {session?.user?.image && (
            <div className="relative" ref={dropdownRef}>
              <Image
                className="rounded-full m-2 border-2 border-blue-500 cursor-pointer"
                src={session.user.image}
                alt="User Avatar"
                width={40}
                height={40}
                onClick={() => setShowDropdown(!showDropdown)}
              />
              {showDropdown && (
                <div className="absolute right-0 mt-2 min-w-[100px] w-max rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-[60]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowLogoutModal(true);
                      }}
                      className="block w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-700 whitespace-nowrap"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-gray-800 rounded-sm p-6 max-w-sm w-full mx-4 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Confirm Logout</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MenuBar
