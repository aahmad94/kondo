'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from 'next/navigation';
import MenuBar from './components/MenuBar';
import ChatBox from './components/ChatBox';
import Bookmarks from './components/Bookmarks';
import { initAmplitude, trackLanguageChange, trackClearBookmark, trackBookmarkSelect } from '../lib/amplitudeService';

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedBookmark, setSelectedBookmark] = useState<{ id: string | null, title: string | null }>({ id: null, title: null });
  const [reservedBookmarkTitles, setReservedBookmarkTitles] = useState<string[]>(['all responses', 'daily summary', 'search']);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');
  const [isClearingBookmark, setIsClearingBookmark] = useState(false);
  const hasSyncedRef = useRef(false);

  // Initialize Amplitude
  useEffect(() => {
    if (session?.user?.email) {
      initAmplitude(session.user.email);
    } else {
      initAmplitude();
    }
  }, [session]);

  useEffect(() => {
    if (searchParams && !hasSyncedRef.current) {
      const bookmarkId = searchParams.get('bookmarkId');
      const bookmarkTitle = searchParams.get('bookmarkTitle');
      if (bookmarkId && bookmarkTitle) {
        setSelectedBookmark({ id: bookmarkId, title: bookmarkTitle });
      }
      hasSyncedRef.current = true;
    }
    // Do NOT sync from URL again after initial load
  }, [searchParams]);
  

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

  const handleBookmarkSelect = (id: string | null, title: string | null) => {
    console.log('****handleBookmarkSelect****', { id, title });
    setSelectedBookmark({ id, title });
    trackBookmarkSelect(id, title);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (id) params.set('bookmarkId', id); else params.delete('bookmarkId');
    if (title) params.set('bookmarkTitle', title); else params.delete('bookmarkTitle');
    router.push(`/?${params.toString()}`);
  };


  const handleClearBookmark = () => {
    setIsClearingBookmark(true);
    setSelectedBookmark({ id: null, title: null });
    trackClearBookmark();
    setTimeout(() => setIsClearingBookmark(false), 250);
  }

  const handleLanguageChange = (languageCode: string) => {
    trackLanguageChange(selectedLanguage, languageCode);
    setSelectedLanguage(languageCode);
    handleBookmarkSelect(null, null);
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#000000]">
      <MenuBar
        onClearBookmark={handleClearBookmark}
        onLanguageChange={handleLanguageChange}
      />
      <div className="flex flex-1 overflow-hidden bg-[#000000]">
        <Bookmarks 
          changeSelectedBookmark={handleBookmarkSelect}
          onClearBookmark={handleClearBookmark}
          selectedBookmark={selectedBookmark}
          reservedBookmarkTitles={reservedBookmarkTitles}
          selectedLanguage={selectedLanguage}
        />
        <div className="flex-1 overflow-hidden bg-[#000000]">
          <ChatBox 
            selectedBookmark={selectedBookmark}
            reservedBookmarkTitles={reservedBookmarkTitles}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            onBookmarkSelect={handleBookmarkSelect}
          />
        </div>
      </div>
    </div>
  );
} 