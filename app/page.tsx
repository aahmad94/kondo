'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from 'next/navigation';
import MenuBar from './components/MenuBar';
import ChatBox from './components/ChatBox';
import Bookmarks from './components/Bookmarks';
import { parseAsString, useQueryStates } from 'nuqs';

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [{ bookmarkId, bookmarkTitle }, setQueryStates] = useQueryStates({
    bookmarkId: parseAsString,
    bookmarkTitle: parseAsString,
  });
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(bookmarkId || null);
  const [selectedBookmarkTitle, setSelectedBookmarkTitle] = useState<string | null>(bookmarkTitle || null);
  const [reservedBookmarkTitles, setReservedBookmarkTitles] = useState<string[]>(['all responses', 'daily summary']);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  // Update selected bookmark when query params change
  useEffect(() => {
    setSelectedBookmarkId(bookmarkId || null);
    setSelectedBookmarkTitle(bookmarkTitle || null);
  }, [bookmarkId, bookmarkTitle]);

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  const handleBookmarkSelect = async (newBookmarkId: string | null, newBookmarkTitle: string | null) => {
    setSelectedBookmarkId(newBookmarkId);
    setSelectedBookmarkTitle(newBookmarkTitle);
    
    // Update URL query params
    await setQueryStates({
      bookmarkId: newBookmarkId,
      bookmarkTitle: newBookmarkTitle,
    });
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