'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from 'next/navigation';
import MenuBar from './components/MenuBar';
import ChatBox from './components/ChatBox';
import Decks from './components/Decks';
import { initAmplitude, trackLanguageChange, trackClearDeck, trackDeckSelect } from '@/lib/analytics';

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedDeck, setSelectedDeck] = useState<{ id: string | null, title: string | null }>({ id: null, title: 'community' });
  const [reservedDeckTitles, setReservedDeckTitles] = useState<string[]>(['all responses', 'daily summary', 'community', 'dojo', 'search']);
  const [newDeck, setNewDeck] = useState<{ id: string, title: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isClearingDeck, setIsClearingDeck] = useState(false);
  const [isDecksCollapsed, setIsDecksCollapsed] = useState<boolean>(false);
  const [decksRefreshTrigger, setDecksRefreshTrigger] = useState<number>(0);
  const hasSyncedRef = useRef(false);

  // Define handleDeckSelect early with useCallback, before any hooks or early returns (around line 22, after state declarations)
  const handleDeckSelect = useCallback((id: string | null, title: string | null) => {
    setSelectedDeck({ id, title });
    trackDeckSelect(id, title);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (id) params.set('deckId', id); else params.delete('deckId');
    if (title) params.set('deckTitle', title); else params.delete('deckTitle');
    router.push(`/?${params.toString()}`);
  }, [router, searchParams, setSelectedDeck]);

  // Initialize Amplitude
  useEffect(() => {
    if (session?.user?.email) {
      initAmplitude(session.user.email);
    } else {
      initAmplitude();
    }
  }, [session]);

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

  // Define triggerDecksRefresh before early returns
  const triggerDecksRefresh = useCallback(() => {
    setDecksRefreshTrigger(prev => prev + 1);
  }, []);

  // Then place the useEffect after other top-level hooks but before early returns (around original position ~32)
  useEffect(() => {
    if (searchParams && !hasSyncedRef.current) {
      const deckId = searchParams.get('deckId');
      const deckTitle = searchParams.get('deckTitle');
      
      if (deckId && deckTitle) {
        // Regular deck with ID and title
        setSelectedDeck({ id: deckId, title: deckTitle });
      } else if (deckTitle && reservedDeckTitles.includes(deckTitle)) {
        // Reserved deck (community, daily summary, etc.) with only title
        setSelectedDeck({ id: null, title: deckTitle });
      } else {
        // No params - default to community
        handleDeckSelect(null, 'community');
      }
      hasSyncedRef.current = true;
    }
    // Do NOT sync from URL again after initial load
  }, [searchParams, reservedDeckTitles, handleDeckSelect, setSelectedDeck]);


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

  const handleClearDeck = () => {
    setIsClearingDeck(true);
    setSelectedDeck({ id: null, title: null });
    trackClearDeck();
    setTimeout(() => setIsClearingDeck(false), 250);
  }

  const handleDeckCreated = (newDeck: { id: string, title: string }) => {
    console.log('****handleDeckCreated****', { newDeck });
    setNewDeck(newDeck);
  }

  const handleLanguageChange = (languageCode: string) => {
    trackLanguageChange(selectedLanguage || 'ja', languageCode);
    setSelectedLanguage(languageCode);
    handleDeckSelect(null, null);
  };
  
  return (
    <div className="flex flex-col h-dvh bg-background">
      <MenuBar
        onClearDeck={handleClearDeck}
        onLanguageChange={handleLanguageChange}
      />
      <div className="flex flex-1 overflow-hidden bg-background">
        <Decks 
          changeSelectedDeck={handleDeckSelect}
          onClearDeck={handleClearDeck}
          selectedDeck={selectedDeck}
          reservedDeckTitles={reservedDeckTitles}
          selectedLanguage={selectedLanguage || 'ja'}
          newDeck={newDeck}
          isCollapsed={isDecksCollapsed}
          onCollapseChange={setIsDecksCollapsed}
          refreshTrigger={decksRefreshTrigger}
        />
        <div className="flex-1 overflow-hidden bg-background">
          <ChatBox 
            selectedDeck={selectedDeck}
            reservedDeckTitles={reservedDeckTitles}
            selectedLanguage={selectedLanguage || 'ja'}
            onLanguageChange={handleLanguageChange}
            onDeckSelect={handleDeckSelect}
            onDeckCreated={handleDeckCreated}
            isDecksCollapsed={isDecksCollapsed}
            onDecksRefresh={triggerDecksRefresh}
          />
        </div>
      </div>
    </div>
  );
} 