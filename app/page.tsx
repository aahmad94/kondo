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
  const [selectedDeck, setSelectedDeck] = useState<{ id: string | null, title: string | null }>({ id: null, title: null });
  const [reservedDeckTitles, setReservedDeckTitles] = useState<string[]>(['all responses', 'daily summary', 'community', 'dojo', 'search']);
  const [newDeck, setNewDeck] = useState<{ id: string, title: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isClearingDeck, setIsClearingDeck] = useState(false);
  const [isDecksCollapsed, setIsDecksCollapsed] = useState<boolean>(false);
  const [decksRefreshTrigger, setDecksRefreshTrigger] = useState<number>(0);
  const [isLandingResolved, setIsLandingResolved] = useState(false);
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

  useEffect(() => {
    if (!session?.userId) return;

    // Optimistically apply localStorage value for fast initial render,
    // but always reconcile with DB — the DB is the cross-device source of truth.
    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage) {
      try {
        const { code } = JSON.parse(storedLanguage);
        setSelectedLanguage(code);
      } catch {
        // localStorage value is corrupt; DB fetch below will recover
      }
    }

    // Always fetch from DB to catch changes made on other devices/sessions
    Promise.all([
      fetch(`/api/getUserLanguagePreference?userId=${session.userId}`).then(r => r.json()),
      fetch('/api/getLanguages').then(r => r.json()),
    ])
      .then(([preference, languages]) => {
        if (!preference.languageId) {
          if (!storedLanguage) setSelectedLanguage('ja');
          return;
        }
        const userLanguage = languages.find((lang: any) => lang.id === preference.languageId);
        if (userLanguage) {
          setSelectedLanguage(userLanguage.code);
          localStorage.setItem('preferredLanguage', JSON.stringify({
            code: userLanguage.code,
            id: userLanguage.id,
            name: userLanguage.name,
          }));
        } else if (!storedLanguage) {
          setSelectedLanguage('ja');
        }
      })
      .catch(() => {
        if (!storedLanguage) setSelectedLanguage('ja');
      });
  }, [session?.userId]);

  // Define triggerDecksRefresh before early returns
  const triggerDecksRefresh = useCallback(() => {
    setDecksRefreshTrigger(prev => prev + 1);
  }, []);

  // Sync initial deck from URL or user's landing page preference
  useEffect(() => {
    if (!searchParams || hasSyncedRef.current) return;

    const deckId = searchParams.get('deckId');
    const deckTitle = searchParams.get('deckTitle');

    if (deckId && deckTitle) {
      setSelectedDeck({ id: deckId, title: deckTitle });
      hasSyncedRef.current = true;
      setIsLandingResolved(true);
      return;
    }
    if (deckTitle && reservedDeckTitles.includes(deckTitle)) {
      setSelectedDeck({ id: null, title: deckTitle });
      hasSyncedRef.current = true;
      setIsLandingResolved(true);
      return;
    }

    // No URL params: apply user's landing page preference (wait for session so dojo can resolve deckId)
    if (!session?.userId) return;

    hasSyncedRef.current = true;
    const applyLandingPage = async () => {
      try {
        const res = await fetch('/api/landingPage');
        if (!res.ok) {
          handleDeckSelect(null, null);
          return;
        }
        const { landingPage } = await res.json();
        if (landingPage === 'create') {
          handleDeckSelect(null, null);
          return;
        }
        if (landingPage === 'community') {
          handleDeckSelect(null, 'community');
          return;
        }
        if (landingPage === 'dojo') {
          const bookmarksRes = await fetch(`/api/getBookmarks?userId=${session.userId}`);
          if (!bookmarksRes.ok) {
            handleDeckSelect(null, null);
            return;
          }
          const decks = await bookmarksRes.json();
          const dailySummaryDeck = decks.find((d: { title: string }) => d.title === 'daily summary');
          if (dailySummaryDeck) {
            handleDeckSelect(dailySummaryDeck.id, dailySummaryDeck.title);
          } else {
            handleDeckSelect(null, null);
          }
          return;
        }
        handleDeckSelect(null, null);
      } catch {
        handleDeckSelect(null, null);
      } finally {
        setIsLandingResolved(true);
      }
    };

    applyLandingPage();
  }, [searchParams, reservedDeckTitles, handleDeckSelect, session?.userId]);


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

  // While we're resolving the initial landing page / deck selection,
  // render the header and a centered spinner instead of mounting ChatBox/Decks.
  if (!isLandingResolved) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <MenuBar
          onClearDeck={handleClearDeck}
          onLanguageChange={handleLanguageChange}
        />
        <div className="flex-1 bg-background flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
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