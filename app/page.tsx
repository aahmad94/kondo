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
  const [isClearingBookmark, setIsClearingBookmark] = useState(false);

  useEffect(() => {
    if (searchParams) {
      const bookmarkId = searchParams.get('bookmarkId');
      const bookmarkTitle = searchParams.get('bookmarkTitle');
  
      // if we have url parameters different from current state
      if ((bookmarkId && bookmarkTitle) && 
          (bookmarkId !== selectedBookmarkId || bookmarkTitle !== selectedBookmarkTitle) &&
          !isClearingBookmark) {
        setSelectedBookmarkId(bookmarkId);
        setSelectedBookmarkTitle(bookmarkTitle);
      }
      // if we have a selected bookmark in current state but no url params
      else if (selectedBookmarkId && selectedBookmarkTitle && 
              (!bookmarkId || !bookmarkTitle) &&
              !isClearingBookmark) {
        handleBookmarkSelect(selectedBookmarkId, selectedBookmarkTitle);
      }
    }
  }, [searchParams, selectedBookmarkId, selectedBookmarkTitle, isClearingBookmark])
  

  // Handle authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="bg-[#000000] h-screen w-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    return null
  }

  const handleBookmarkSelect = (newBookmarkId: string | null, newBookmarkTitle: string | null) => {
    console.log(`new bookmark: ${newBookmarkTitle}`)
    if (!newBookmarkId) {
      setIsClearingBookmark(true);
      router.push('/');
      setSelectedBookmarkId(null);
      setSelectedBookmarkTitle(null);
      // Reset the flag after a short delay to allow the URL update to complete
      setTimeout(() => setIsClearingBookmark(false), 100);
    } else {
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
    }
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
    <div className="flex flex-col h-screen bg-[#000000]">
      <MenuBar 
        onBookmarkSelect={handleBookmarkSelect} 
        onLanguageChange={handleLanguageChange}
      />
      <div className="flex flex-1 overflow-hidden bg-[#000000]">
        <Bookmarks 
          changeSelectedBookmark={handleBookmarkSelect}
          selectedBookmarkId={selectedBookmarkId}
          selectedBookmarkTitle={selectedBookmarkTitle}
          reservedBookmarkTitles={reservedBookmarkTitles}
          onRefetchBookmarks={handleRefetchBookmarks}
          selectedLanguage={selectedLanguage}
        />
        <div className="flex-1 overflow-hidden bg-[#000000]">
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