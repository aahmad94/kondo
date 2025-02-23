'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from 'next/navigation';
import MenuBar from './components/MenuBar';
import ChatBox from './components/ChatBox';
import Bookmarks from './components/Bookmarks';

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [selectedBookmarkTitle, setSelectedBookmarkTitle] = useState<string | null>(null);
  const [reservedBookmarkTitles, setReservedBookmarkTitles] = useState<string[]>(['all responses', 'daily summary']);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');

  useEffect(() => {
    if (searchParams) {
      const bookmarkId = searchParams.get('bookmarkId');
      const bookmarkTitle = searchParams.get('bookmarkTitle');
  
      if (bookmarkId && bookmarkTitle) {
        setSelectedBookmarkId(bookmarkId);
        setSelectedBookmarkTitle(bookmarkTitle);
      }
    }
  }, [searchParams])
  

  // Handle authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  const handleBookmarkSelect = (newBookmarkId: string | null, newBookmarkTitle: string | null) => {
    setSelectedBookmarkId(newBookmarkId);
    setSelectedBookmarkTitle(newBookmarkTitle);
    
    // Update URL query params
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (newBookmarkId) {
      params.set('bookmarkId', newBookmarkId);
    } else {
      params.delete('bookmarkId');
    }
    if (newBookmarkTitle) {
      params.set('bookmarkTitle', newBookmarkTitle);
    } else {
      params.delete('bookmarkTitle');
    }
    router.push(`/?${params.toString()}`);
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    // Clear bookmark selection and query params when language changes
    handleBookmarkSelect(null, null);
  };

  const handleRefetchBookmarks = () => {
    // If we're currently viewing a bookmark that no longer exists, clear it
    if (selectedBookmarkId && selectedBookmarkId !== 'all') {
      handleBookmarkSelect(null, null);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <MenuBar 
        onBookmarkSelect={handleBookmarkSelect} 
        onLanguageChange={handleLanguageChange}
      />
      <div className="flex flex-1 overflow-hidden">
        <Bookmarks 
          changeSelectedBookmark={handleBookmarkSelect}
          selectedBookmarkId={selectedBookmarkId}
          selectedBookmarkTitle={selectedBookmarkTitle}
          reservedBookmarkTitles={reservedBookmarkTitles}
          onRefetchBookmarks={handleRefetchBookmarks}
          selectedLanguage={selectedLanguage}
        />
        <div className="flex-1 overflow-hidden bg-black">
          <ChatBox 
            selectedBookmarkId={selectedBookmarkId}
            selectedBookmarkTitle={selectedBookmarkTitle}
            reservedBookmarkTitles={reservedBookmarkTitles}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>
    </div>
  );
} 