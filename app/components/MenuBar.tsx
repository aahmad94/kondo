'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import LanguageSelector from './LanguageSelector';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

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
    return <div className="text-foreground">Loading...</div>
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
      <nav className="bg-card border-b border-border shadow-md flex justify-between items-center w-full">
        <Link 
          className="flex items-center text-2xl pt-2 pl-4 text-card-foreground"
          href="/"
          onClick={handleLogoClick}
        >
          <Image
            src="/icon.png"
            alt="Kondo Logo"
            width={42}
            height={42}
            className={`mr-2 transition-all duration-200 ${theme === 'light' ? 'brightness-0 saturate-100' : ''}`}
          />
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
                className="rounded-full m-2 border-2 border-avatar cursor-pointer"
                src={session.user.image}
                alt="User Avatar"
                width={40}
                height={40}
                onClick={() => setShowDropdown(!showDropdown)}
              />
              {showDropdown && (
                <div className="absolute right-0 mt-2 min-w-[100px] w-max rounded-md shadow-lg bg-popover ring-1 ring-border z-[60]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        toggleTheme();
                        setShowDropdown(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
                    >
                      <div className="flex-col w-[110px] text-wrap">
                        <span>{theme === 'light' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}</span>
                        {theme === 'dark' && <span className="text-xs text-muted-foreground">BETA</span>}
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowLogoutModal(true);
                      }}
                      className="block w-full px-4 py-2 text-sm text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-card rounded-sm p-6 max-w-sm w-full mx-4 border border-border shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-card-foreground">Confirm Logout</h2>
            <p className="text-muted-foreground mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-muted-foreground hover:text-card-foreground hover:bg-accent rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
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
