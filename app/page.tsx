'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from 'next/navigation';
import MenuBar from './components/MenuBar';
import ChatBox from './components/ChatBox';
import Bookmarks from './components/Bookmarks';
import { initAmplitude, trackLanguageChange, trackClearBookmark, trackBookmarkSelect } from '@/lib/analytics';

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedBookmark, setSelectedBookmark] = useState<{ id: string | null, title: string | null }>({ id: null, title: null });
  const [reservedBookmarkTitles, setReservedBookmarkTitles] = useState<string[]>(['all responses', 'daily summary', 'community', 'dojo', 'search']);
  const [newBookmark, setNewBookmark] = useState<{ id: string, title: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
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

  // Add this useEffect after the other useEffects
  useEffect(() => {
    if (session?.userId) {
      // First check local storage
      const storedLanguage = localStorage.getItem('preferredLanguage');
      if (storedLanguage) {
        try {
          const { code } = JSON.parse(storedLanguage);
          setSelectedLanguage(code);
          return; // Exit early if we found a stored language
        } catch (error) {
          console.error('Error parsing stored language:', error);
          // Continue to fetch from DB if parsing fails
        }
      }

      // If no stored language or parsing failed, fetch from DB
      fetch(`/api/getUserLanguagePreference?userId=${session.userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.languageId) {
            // Fetch the language code for this ID
            fetch('/api/getLanguages')
              .then(res => res.json())
              .then(languages => {
                const userLanguage = languages.find((lang: any) => lang.id === data.languageId);
                if (userLanguage) {
                  setSelectedLanguage(userLanguage.code);
                  // Store the fetched language in local storage
                  localStorage.setItem('preferredLanguage', JSON.stringify({
                    code: userLanguage.code,
                    id: userLanguage.id,
                    name: userLanguage.name
                  }));
                } else {
                  setSelectedLanguage('ja'); // Fallback to Japanese if language not found
                }
              });
          } else {
            setSelectedLanguage('ja'); // Fallback to Japanese if no preference found
          }
        })
        .catch(() => {
          setSelectedLanguage('ja'); // Fallback to Japanese on error
        });
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="bg-background h-screen w-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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

  const handleBookmarkCreated = (newBookmark: { id: string, title: string }) => {
    console.log('****handleBookmarkCreated****', { newBookmark });
    setNewBookmark(newBookmark);
  }

  const handleLanguageChange = (languageCode: string) => {
    trackLanguageChange(selectedLanguage || 'ja', languageCode);
    setSelectedLanguage(languageCode);
    handleBookmarkSelect(null, null);
  };
  
  return (
    <div className="flex flex-col h-dvh bg-background">
      <MenuBar
        onClearBookmark={handleClearBookmark}
        onLanguageChange={handleLanguageChange}
      />
      <div className="flex flex-1 overflow-hidden bg-background">
        <Bookmarks 
          changeSelectedBookmark={handleBookmarkSelect}
          onClearBookmark={handleClearBookmark}
          selectedBookmark={selectedBookmark}
          reservedBookmarkTitles={reservedBookmarkTitles}
          selectedLanguage={selectedLanguage || 'ja'}
          newBookmark={newBookmark}
        />
        <div className="flex-1 overflow-hidden bg-background">
          <ChatBox 
            selectedBookmark={selectedBookmark}
            reservedBookmarkTitles={reservedBookmarkTitles}
            selectedLanguage={selectedLanguage || 'ja'}
            onLanguageChange={handleLanguageChange}
            onBookmarkSelect={handleBookmarkSelect}
            onBookmarkCreated={handleBookmarkCreated}
          />
        </div>
      </div>
    </div>
  );
} 