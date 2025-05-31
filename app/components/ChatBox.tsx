'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';
import { getLanguageInstructions } from '../../lib/languageService';
import SearchBar from './SearchBar';
import { trackBreakdownClick, trackSpeakerClick, trackPauseToggle, trackChangeRank } from '../../lib/amplitudeService';

interface ChatBoxProps {
  selectedBookmark: { id: string | null, title: string | null };
  reservedBookmarkTitles: string[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  onBookmarkSelect: (id: string | null, title: string | null) => void;
  onBookmarkCreated: (newBookmark: { id: string, title: string }) => void;
}

interface Response {
  id: string | null;
  content: string;
  rank: number;
  isPaused?: boolean;
  bookmarks?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  onBookmarkCreated?: (newBookmark: { id: string, title: string }) => void;

}

interface BookmarkResponse {
  id: string;
  content: string;
  rank: number;
  isPaused?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const formatStats = (stats: {
  total: number;
  rank1: { count: number; percentage: number };
  rank2: { count: number; percentage: number };
  rank3: { count: number; percentage: number };
}) => {
  const padLeft = (str: string, length: number) => str.padStart(length);
  const padRight = (str: string, length: number) => str.padEnd(length);
  
  const rank1Str = `**${stats.rank1.count}**`;
  const rank2Str = `**${stats.rank2.count}**`;
  const rank3Str = `**${stats.rank3.count}**`;
  const totalStr = `**${stats.total}**`;
  const pct1Str = `**${stats.rank1.percentage}**%`;
  const pct2Str = `**${stats.rank2.percentage}**%`;
  const pct3Str = `**${stats.rank3.percentage}**%`;

  return `**Current stats**\n` +
         `${padRight('hard', 15)} ${padLeft(rank1Str, 8)} ${padLeft(pct1Str, 6)}\n` +
         `${padRight('medium', 15)} ${padLeft(rank2Str, 8)} ${padLeft(pct2Str, 6)}\n` +
         `${padRight('easy', 15)} ${padLeft(rank3Str, 8)} ${padLeft(pct3Str, 6)}\n` +
         `${padRight('total', 15)} ${padLeft(totalStr, 8)}`;
};

// Add sortResponses function
const sortResponses = (responses: Response[]): Response[] => {
  return responses.sort((a: Response, b: Response) => {
    // First sort by rank (ascending: 1, 2, 3)
    const rankComparison = a.rank - b.rank;
    if (rankComparison !== 0) return rankComparison;
    // Within same rank, sort by updatedAt (newest first)
    const updatedAtComparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    const createdAtComparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (updatedAtComparison !== 0) return updatedAtComparison;
    return createdAtComparison;
  });
};

export default function ChatBox({ 
  selectedBookmark, 
  reservedBookmarkTitles,
  selectedLanguage,
  onLanguageChange,
  onBookmarkSelect,
  onBookmarkCreated
}: ChatBoxProps) {
  const { data: session, status } = useSession()
  const router = useRouter();
  const [bookmarkResponses, setBookmarkResponses] = useState<Record<string, Response>>({});
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [responseQuote, setResponseQuote] = useState<string|null>(null);
  const [userInputOffset, setUserInputOffset] = useState<number>(0);
  const [baseUserInputOffset, setBaseUserInputOffset] = useState<number>(140);
  const [instructions, setInstructions] = useState({ main: '', dailySummary: '' });
  const [responseStats, setResponseStats] = useState<{
    total: number;
    rank1: { count: number; percentage: number };
    rank2: { count: number; percentage: number };
    rank3: { count: number; percentage: number };
  } | null>(null);
  const [dailySummaryCache, setDailySummaryCache] = useState<Record<string, Response> | null>(null);
  const [searchResultsCache, setSearchResultsCache] = useState<Record<string, Response> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryTimestamp, setSummaryTimestamp] = useState<Date | null>(null);
  // Add ref to track previous language
  const previousLanguageRef = useRef(selectedLanguage);
  // Add ref to track ongoing rank updates to prevent duplicates
  const ongoingRankUpdatesRef = useRef<Set<string>>(new Set());

  const bookmarkContainerHeight = () => {
    return window.innerWidth < 768 ? 'h-[80%]' : 'h-[91%]';
  };

  useEffect(() => {
    const handleResize = () => {
      initBaseUserInputOffset();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update instructions when language changes
  useEffect(() => {
    const updateInstructions = async () => {
      if (session?.userId) {
        const languageInstructions = await getLanguageInstructions(session.userId, selectedLanguage);
        setInstructions(languageInstructions);
        // Only clear responses if the language actually changed
        if (selectedLanguage !== previousLanguageRef.current) {
          // Clear ChatBox responses and URL params
          setResponses({});
          // Clear search and dojo caches
          setSearchResultsCache(null);
          setDailySummaryCache(null);
          setSearchQuery('');
          router.push('/');
          // Update the previous language
          previousLanguageRef.current = selectedLanguage;
        }
      }
    };
    updateInstructions();
  }, [session, selectedLanguage]);


  // When the selected bookmark changes, fetch the responses
  useEffect(() => {
    // Only proceed if we have a session
    if (!session?.userId) return;

    // If we have a selected bookmark, fetch its responses
    if (selectedBookmark.id) {
      if (selectedBookmark.id === "all") {
        fetchAllResponses(session.userId);
      } else if (selectedBookmark.title === 'daily summary') {
        fetchResponseStats();
        // Use cached summary if available, otherwise fetch
        if (dailySummaryCache) {
          setBookmarkResponses(dailySummaryCache);
        } else {
          handleGenerateSummary(false);
        }
      } else if (selectedBookmark.title === 'search') {
        // Use cached search results if available, otherwise fetch
        if (searchResultsCache) {
          setBookmarkResponses(searchResultsCache);
        } else {
          setBookmarkResponses({});
        }
      } else {
        fetchBookmarkResponses(session.userId, selectedBookmark.id);
      }
    }
    // Only clear responses if we explicitly don't have a selected bookmark
    else if (selectedBookmark.id === null) {
      setBookmarkResponses({});
    }
  }, [selectedBookmark, selectedLanguage]);

  // Scroll to bottom when new responses are added or quote is clicked in main chat
  useEffect(() => {
    if (!selectedBookmark.id && (Object.values(responses).length > 0 || responseQuote)) {
      scrollToBottom();
    }
  }, [responses, responseQuote, selectedBookmark.id]);


  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current && selectedBookmark.title && !reservedBookmarkTitles.includes(selectedBookmark.title)) {
        chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
        });
      } else if (chatContainerRef.current && !selectedBookmark.title) {
        chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
        });
      }

      }, 500);
  }


  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }
  }

  const fetchResponseStats = async () => {
    if (session?.userId) {
      try {
        const res = await fetch(`/api/getUserResponseStats?userId=${session.userId}&language=${selectedLanguage}`);
        if (res.ok) {
          const stats = await res.json();
          setResponseStats(stats);
        }
      } catch (error) {
        console.error('Error fetching response stats:', error);
      }
    }
  };


  // Fetch bookmark responses from database and sets responses in ascending order by id, then descending by rank
  const fetchBookmarkResponses = async (userId: string, bookmarkId: string) => {
    // Skip fetching for reserved bookmarks
    if (reservedBookmarkTitles.includes(bookmarkId)) {
      setBookmarkResponses({});
      return;
    }

    try {
      setBookmarkResponses({});
      setIsLoading(true);
      const res = await fetch(`/api/getBookmarkResponses?userId=${userId}&bookmarkId=${bookmarkId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      scrollToTop();
      const data = await res.json();      
      
      // Transform the response data
      const transformedResponses = data.map((response: BookmarkResponse) => ({
        id: response.id,
        content: response.content,
        rank: response.rank,
        isPaused: response.isPaused,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      }));

      // Sort responses using the new function
      const sortedResponses = sortResponses(transformedResponses);

      // Convert to dictionary
      const dict = Object.fromEntries((sortedResponses as Response[]).map((r: Response) => [r.id, r]));
      setBookmarkResponses(dict);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching bookmark responses:', error);
    }
  };

  const fetchAllResponses = async (userId: string) => {
    setBookmarkResponses({});
    setIsLoading(true);
    try {
      const res = await fetch(`/api/getUserResponses?userId=${userId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      scrollToTop();
      const data = await res.json();
      const dict = Object.fromEntries(data.map((response: Response) => [response.id, {
        id: response.id,
        content: response.content,
        rank: response.rank,
        isPaused: response.isPaused,
        bookmarks: response.bookmarks,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt)
      }]));
      setBookmarkResponses(dict);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching all responses:', error);
    } finally {
      scrollToBottom();
    }
  }

  // Handle the user's input, does not save to database
  const handleSubmit = async (prompt: string, model?: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          languageCode: selectedLanguage || 'ja',
          model: model || 'gpt-4o' // Default to gpt-4o if no model is specified
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: { result: string } = await res.json();
      // Generate a temporary id for client-side responses
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setResponses(prevResponses => ({
        ...prevResponses,
        [tempId]: {
          id: tempId,
          content: data.result,
          rank: 1,
          isPaused: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));
      setResponseQuote('');
    } catch (error) {
      console.error('Error fetching data:', error);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setResponses(prevResponses => ({
        ...prevResponses,
        [tempId]: {
          id: tempId,
          content: 'An error occurred while fetching the response.',
          rank: 1,
          isPaused: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Adjusts the user input offset when the user input changes
  const handleUserInputOffset = (offset: number) => {
    setUserInputOffset(offset);
  };

  // Initializes the base user input offset based on the user's browser
  function initBaseUserInputOffset() {
    const userAgent = navigator.userAgent;
  
    if (/Mobile/i.test(userAgent)) {
      setBaseUserInputOffset(250);
    } else {
      setBaseUserInputOffset(140);
    }
  }
  

  // Deletes response from database and updates state locally
  const handleResponseDelete = async (responseId: string, bookmarks?: Record<string, string>) => {
    if (!session?.userId) return;
    
    try {
      const res = await fetch(
        `/api/deleteGPTResponse`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gptResponseId: responseId,
            bookmarks: bookmarks || {}
          })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete response');
      }

      // Update bookmarkResponses (delete single item)
      setBookmarkResponses(prev => {
        const copy = { ...prev };
        delete copy[responseId];
        return copy;
      });

      // Update search results cache
      setSearchResultsCache(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        delete copy[responseId];
        return copy;
      });

      // Update daily summary cache
      setDailySummaryCache(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        delete copy[responseId];
        return copy;
      });
      
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };

  const handleResponseQuote = (response: string, type: 'submit' | 'breakdown' | 'input' = 'input') => {
    const submitResponse = `* Breakdown the following phrase:\n\n${response}`;
    const quoteResponse = `${response}\n\n* Replace this text to ask anything about the quoted response above...`

    if (type === 'breakdown') {
      handleSubmit(submitResponse, 'gpt-4o-mini');
    } else {
      setResponseQuote(quoteResponse);
    }
  };

  const setResponseQuoteToNull = () => {
    setResponseQuote(null);
  };

  const handleRankUpdate = async (responseId: string, newRank: number) => {
    if (!session?.userId) return;
    
    const oldRank = responses[responseId]?.rank || bookmarkResponses[responseId]?.rank;
    if (oldRank === undefined) return;

    // Create a unique key for this rank update operation
    const updateKey = `${responseId}-${oldRank}-${newRank}`;
    
    // Check if this exact update is already in progress
    if (ongoingRankUpdatesRef.current.has(updateKey)) {
      return;
    }

    // Mark this update as in progress
    ongoingRankUpdatesRef.current.add(updateKey);

    try {
      const response = await fetch('/api/updateGPTResponseRank', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gptResponseId: responseId,
          rank: newRank,
        }),
      });

      if (response.ok) {        
        // Update responses state
        setResponses(prev => {
          const updated = { ...prev };
          if (updated[responseId]) {
            updated[responseId] = {
              ...updated[responseId],
              rank: newRank,
            };
          }
          return updated;
        });

        // Update bookmarkResponses state
        setBookmarkResponses(prev => {
          const updated = { ...prev };
          if (updated[responseId]) {
            updated[responseId] = {
              ...updated[responseId],
              rank: newRank,
            };
          }
          return updated;
        });

        // Update local stats to reflect the rank change
        setResponseStats(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          
          // Decrease count for old rank
          if (oldRank === 1) {
            updated.rank1.count = Math.max(0, updated.rank1.count - 1);
          } else if (oldRank === 2) {
            updated.rank2.count = Math.max(0, updated.rank2.count - 1);
          } else if (oldRank === 3) {
            updated.rank3.count = Math.max(0, updated.rank3.count - 1);
          }
          
          // Increase count for new rank
          if (newRank === 1) {
            updated.rank1.count = updated.rank1.count + 1;
          } else if (newRank === 2) {
            updated.rank2.count = updated.rank2.count + 1;
          } else if (newRank === 3) {
            updated.rank3.count = updated.rank3.count + 1;
          }
          
          // Recalculate percentages
          const total = updated.total;
          if (total > 0) {
            updated.rank1.percentage = Math.round((updated.rank1.count / total) * 100);
            updated.rank2.percentage = Math.round((updated.rank2.count / total) * 100);
            updated.rank3.percentage = Math.round((updated.rank3.count / total) * 100);
          }
          
          return updated;
        });

        // Track the change (moved outside of state setter to avoid duplicates)
        trackChangeRank(responseId, oldRank, newRank);
      }
    } catch (error) {
      console.error('Error updating rank:', error);
    } finally {
      // Remove the update from the ongoing set after a short delay
      setTimeout(() => {
        ongoingRankUpdatesRef.current.delete(updateKey);
      }, 1000);
    }
  };

  const handlePauseToggle = async (responseId: string, isPaused: boolean) => {    
    if (!session?.userId) return;

    try {
      const response = await fetch('/api/toggleResponsePause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.userId,
          responseId,
          isPaused,
        }),
      });

      if (response.ok) {
        // Update responses state
        setResponses(prev => {
          const updated = { ...prev };
          if (updated[responseId]) {
            updated[responseId] = {
              ...updated[responseId],
              isPaused,
            };
          }
          return updated;
        });

        // Update bookmarkResponses state
        setBookmarkResponses(prev => {
          const updated = { ...prev };
          if (updated[responseId]) {
            updated[responseId] = {
              ...updated[responseId],
              isPaused,
            };
          }
          return updated;
        });

        // Update dailySummaryCache if it exists
        setDailySummaryCache(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated[responseId]) {
            updated[responseId] = {
              ...updated[responseId],
              isPaused,
            };
          }
          return updated;
        });

        trackPauseToggle(isPaused);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleGenerateSummary = async (forceRefresh: boolean = false) => {
    if (!session?.userId) return;
    
    try {
      setIsLoading(true);
      const res = await fetch(`/api/getDailySummary?userId=${session.userId}&forceRefresh=${forceRefresh}`);
      
      if (!res.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await res.json();
      
      if (data.success && data.responses) {
        // set state for summary timestamp
        if (data.createdAt) {
          setSummaryTimestamp(data.createdAt);      
        }
        
        const transformedResponses = data.responses.map((response: Response) => ({
          id: response.id,
          content: response.content,
          rank: response.rank,
          createdAt: new Date(response.createdAt),
          isPaused: response.isPaused,
          bookmarks: response.bookmarks
        }));

        // Sort responses using the new function
        const sortedResponses = sortResponses(transformedResponses);

        // Cache the summary data as a dictionary
        const dict = Object.fromEntries(sortedResponses.map((r: Response) => [r.id, r]));
        setDailySummaryCache(dict);
        setBookmarkResponses(dict);
      } else {
        setBookmarkResponses({});
        setDailySummaryCache(null);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setBookmarkResponses({});
      setDailySummaryCache(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Compiles the instructions for the daily summary
  const compileDojoInstructions = (stats: any, timestamp: Date | null) => {
    // modify timestamp format to be more readable (Month Day, Year, hour:minute)
    const formattedTimestamp = timestamp ? format(new Date(timestamp), 'h:mm a MMMM d, yyyy') : '';
    const compiledInstructions = {
      dailySummary: instructions.dailySummary,
      stats: stats ? formatStats(stats) : undefined,
      summaryTimestamp: timestamp ? `*Last generated at ${formattedTimestamp}*` : ''
    }

    // iterate over compiledInstructions and return all non-undefined values separated by '\n\n'
    return Object.values(compiledInstructions).filter(Boolean).join('\n\n');
  }


  const handleSearch = async (query: string) => {
    if (!session?.userId || !query.trim()) {
      setSearchResultsCache(null);
      return;
    }

    // Replace all spaces with ' & ' for to_tsquery compatibility
    const formattedQuery = query.trim().replace(/\s+/g, ' & ');

    try {
      setIsSearching(true);
      const res = await fetch(`/api/searchResponses?query=${encodeURIComponent(formattedQuery)}&languageCode=${selectedLanguage}`);
      if (!res.ok) {
        throw new Error('Failed to search responses');
      }
      const data = await res.json();
      const dict = Object.fromEntries(data.map((r: Response) => [r.id, r]));
      setSearchResultsCache(dict);
      setBookmarkResponses(dict);
    } catch (error) {
      console.error('Error searching responses:', error);
      setSearchResultsCache(null);
      setBookmarkResponses({});
    } finally {
      setIsSearching(false);
    }
  };


  if (status === "loading") {
    return <div>Loading...</div>
  }
  

  return (
    <div className="container mx-auto bg-[#000000] h-screen flex flex-col max-w-[calc(100vw-48px)]">
      <div 
        ref={chatContainerRef}
        className={`overflow-y-auto relative mb-2 ${
          selectedBookmark.id ? bookmarkContainerHeight() : ''
        }`}
        style={{ 
          height: selectedBookmark.id ? undefined : `calc(100% - ${baseUserInputOffset + userInputOffset}px)`,
          paddingBottom: 'env(safe-area-inset-bottom)' 
        }}
      >
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#000000] bg-opacity-50 z-[60]">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {selectedBookmark.title === 'search' && (
          <div>
            <SearchBar
              onSearch={handleSearch}
              selectedLanguage={selectedLanguage}
              value={searchQuery}
              onChange={setSearchQuery}
            />
            {isSearching ? (
              <div className="fixed inset-0 flex items-center justify-center bg-[#000000] bg-opacity-50 z-[60]">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : Object.values(bookmarkResponses).length > 0 ? (
              Object.values(bookmarkResponses).map((response: Response, index: number) => (
                <GPTResponse
                  key={index}
                  response={response.content}
                  selectedBookmarkId={response.id}
                  selectedBookmarkTitle={selectedBookmark.title}
                  reservedBookmarkTitles={reservedBookmarkTitles}
                  responseId={response.id}
                  rank={response.rank}
                  createdAt={response.createdAt}
                  isPaused={response.isPaused}
                  bookmarks={response.bookmarks}
                  onQuote={handleResponseQuote}
                  onRankUpdate={handleRankUpdate}
                  onDelete={handleResponseDelete}
                  onPauseToggle={handlePauseToggle}
                  onBookmarkSelect={onBookmarkSelect}
                  selectedLanguage={selectedLanguage}
                  onLoadingChange={setIsLoading}
                  onBreakdownClick={() => trackBreakdownClick(response.id!)}
                  onSpeakerClick={() => trackSpeakerClick(response.id!)}
                />
              ))
            ) : null}
          </div>
        )}
        
        {!selectedBookmark.id && (
          <GPTResponse
            type="instruction"
            response={instructions.main}
            selectedBookmarkId={selectedBookmark.id}
            selectedBookmarkTitle={selectedBookmark.title ?? ''}
            reservedBookmarkTitles={reservedBookmarkTitles}
            responseId={null}
            onBookmarkSelect={onBookmarkSelect}
            selectedLanguage={selectedLanguage}
            onLoadingChange={setIsLoading}
          />
        )}
        
        {selectedBookmark.title === 'daily summary' && (
          <GPTResponse
            type="instruction"
            response={compileDojoInstructions(responseStats, summaryTimestamp)}
            selectedBookmarkId={selectedBookmark.id}
            selectedBookmarkTitle="daily summary"
            reservedBookmarkTitles={reservedBookmarkTitles}
            onGenerateSummary={handleGenerateSummary}
            onRankUpdate={handleRankUpdate}
            onDelete={handleResponseDelete}
            onPauseToggle={handlePauseToggle}
            onBookmarkSelect={onBookmarkSelect}
            selectedLanguage={selectedLanguage}
            onLoadingChange={setIsLoading}
          />
        )}
        
        {/* if we're in a selected bookmark, show bookmarkResponses */}
        {/* don't show bookmarkResponses or responses if we're in 'search' */}
        {/* only show chatbox responses if we're not in a selected bookmark */}
        {selectedBookmark.id && selectedBookmark.id !== 'search' ? (
          Object.values(bookmarkResponses).map((response: Response, index: number) => (
            <GPTResponse
              key={response.id || index}
              response={response.content}
              selectedBookmarkId={selectedBookmark.id}
              selectedBookmarkTitle={selectedBookmark.title ?? ''}
              reservedBookmarkTitles={reservedBookmarkTitles}
              responseId={response.id}
              rank={response.rank}
              createdAt={response.createdAt}
              isPaused={response.isPaused}
              bookmarks={response.bookmarks}
              onQuote={handleResponseQuote}
              onRankUpdate={handleRankUpdate}
              onDelete={handleResponseDelete}
              onPauseToggle={handlePauseToggle}
              onBookmarkSelect={onBookmarkSelect}
              selectedLanguage={selectedLanguage}
              onLoadingChange={setIsLoading}
              onBreakdownClick={() => trackBreakdownClick(response.id!)}
              onSpeakerClick={() => trackSpeakerClick(response.id!)}
            />
          ))
        ) : // show chatbox responses as long as we're not in 'search'
        selectedBookmark.id !== 'search' ? (
          Object.values(responses).map((response, index) => (
            <GPTResponse
              key={response.id || index}
              response={response.content}
              selectedBookmarkId={selectedBookmark.id}
              selectedBookmarkTitle={selectedBookmark.title ?? ''}
              reservedBookmarkTitles={reservedBookmarkTitles}
              responseId={response.id}
              isPaused={response.isPaused}
              onDelete={handleResponseDelete}
              onQuote={handleResponseQuote}
              onRankUpdate={handleRankUpdate}
              onBookmarkSelect={onBookmarkSelect}
              selectedLanguage={selectedLanguage}
              onLoadingChange={setIsLoading}
              onBookmarkCreated={onBookmarkCreated}
            />
          ))
        ) : null}
      </div>
      {!selectedBookmark.id && (
        <UserInput 
          onSubmit={handleSubmit} 
          isLoading={isLoading} 
          defaultPrompt={responseQuote}
          onUserInputOffset={handleUserInputOffset}
          onQuoteToNull={setResponseQuoteToNull}
          selectedLanguage={selectedLanguage}
        />
      )}
    </div>
  );
}
