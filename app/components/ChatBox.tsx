'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';
import { getLanguageInstructions } from '../../lib/languageService';

interface ChatBoxProps {
  selectedBookmarkId: string | null;
  selectedBookmarkTitle: string | null;
  reservedBookmarkTitles: string[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
}

interface Response {
  id: string | null;
  content: string;
  rank: number;
  createdAt: Date;
  isPaused?: boolean;
  bookmarks?: Record<string, string>;
}

interface BookmarkResponse {
  id: string;
  content: string;
  rank: number;
  createdAt: Date;
  isPaused?: boolean;
}

const DOJO_INSTRUCTIONS = `
Everyday, this tool creates a new report at 12:01 AM Eastern Standard Time.\n
A report includes the following:\n\n

- 3 less familiar responses\n\n
- 2 familiar responses\n\n
- 1 very familiar response

Click the **refresh** button above to manually create a new report.
`;

export default function ChatBox({ 
  selectedBookmarkId, 
  selectedBookmarkTitle, 
  reservedBookmarkTitles,
  selectedLanguage,
  onLanguageChange 
}: ChatBoxProps) {
  const { data: session, status } = useSession()
  const [bookmarkResponses, setBookmarkResponses] = useState<Response[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [responseQuote, setResponseQuote] = useState<string|null>(null);
  const [userInputOffset, setUserInputOffset] = useState<number>(0);
  const [baseUserInputOffset, setBaseUserInputOffset] = useState<number>(140);
  const [instructions, setInstructions] = useState({ main: '', dailySummary: '' });

  // Add ref to track previous language
  const previousLanguageRef = useRef(selectedLanguage);

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

  useEffect(() => {
    const fetchLanguageData = async () => {
      if (session?.userId) {
        try {
          // Get user's current language preference
          const preferenceResponse = await fetch(`/api/getUserLanguagePreference?userId=${session.userId}`);
          if (preferenceResponse.ok) {
            const { languageId } = await preferenceResponse.json();
            const languageResponse = await fetch(`/api/getLanguages`);
            if (languageResponse.ok) {
              const languages = await languageResponse.json();
              const language = languages.find((lang: any) => lang.id === languageId);
              if (language && language.code !== selectedLanguage) {
                onLanguageChange(language.code);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching language data:', error);
        }
      }
    };
    fetchLanguageData();
  }, [session]);

  // Update instructions when language changes
  useEffect(() => {
    const updateInstructions = async () => {
      if (session?.userId) {
        const languageInstructions = await getLanguageInstructions(session.userId, selectedLanguage);
        setInstructions(languageInstructions);
        // Only clear responses if the language actually changed
        if (selectedLanguage !== previousLanguageRef.current) {
          setResponses([]);
          previousLanguageRef.current = selectedLanguage;
        }
      }
    };
    updateInstructions();
  }, [session, selectedLanguage]);

  // When the selected bookmark changes, fetch the responses and scroll when they're loaded
  useEffect(() => {
    if (selectedBookmarkId && selectedBookmarkId !== "all" && session?.userId) {
      if (selectedBookmarkTitle === 'daily summary') {
        handleGenerateSummary(false); // Load latest summary without force refresh
      } else {
        fetchBookmarkResponses(session.userId, selectedBookmarkId);
      }
    } else if (selectedBookmarkId === "all" && session?.userId) {
      fetchAllResponses(session.userId);
    } else {
      setBookmarkResponses([]);
    }
  }, [selectedBookmarkId, session, selectedLanguage]);

  // Scroll to bottom when new responses are added or quote is clicked in main chat
  useEffect(() => {
    if (!selectedBookmarkId && (responses.length > 0 || responseQuote)) {
      scrollToBottom();
    }
  }, [responses, responseQuote, selectedBookmarkId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current && selectedBookmarkTitle && !reservedBookmarkTitles.includes(selectedBookmarkTitle)) {
        chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
        });
      } else if (chatContainerRef.current && !selectedBookmarkTitle) {
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

  // Fetch bookmark responses from database and sets responses in ascending order by id, then descending by rank
  const fetchBookmarkResponses = async (userId: string, bookmarkId: string) => {
    try {
      const res = await fetch(`/api/getBookmarkResponses?userId=${userId}&bookmarkId=${bookmarkId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      scrollToTop();
      const data = await res.json();      
      
      // Transform the response data and sort by rank and date
      const transformedResponses = data.map((response: BookmarkResponse) => ({
        id: response.id,
        content: response.content,
        rank: response.rank,
        createdAt: new Date(response.createdAt),
        isPaused: response.isPaused
      }));

      // Sort responses by rank (ascending) and then by date (newest first) within each rank
      const sortedResponses = transformedResponses.sort((a: Response, b: Response) => {
        // First sort by rank (ascending: 1, 2, 3)
        const rankComparison = a.rank - b.rank;
        if (rankComparison !== 0) return rankComparison;
        // Within same rank, sort by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setBookmarkResponses(sortedResponses);
    } catch (error) {
      console.error('Error fetching bookmark responses:', error);
    }
  };

  const fetchAllResponses = async (userId: string) => {
    try {
      const res = await fetch(`/api/getUserResponses?userId=${userId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      scrollToTop();
      const data = await res.json();
      setBookmarkResponses(data.map((response: Response) => ({
        id: response.id,
        content: response.content,
        rank: response.rank,
        createdAt: new Date(response.createdAt),
        isPaused: response.isPaused,
        bookmarks: response.bookmarks
      })));
    } catch (error) {
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
      setResponses(prevResponses => [...prevResponses, { id: null, content: data.result, rank: 1, createdAt: new Date(), isPaused: false }]);
      setResponseQuote('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setResponses(prevResponses => [...prevResponses, { 
        id: null, 
        content: 'An error occurred while fetching the response.',
        rank: 1,
        createdAt: new Date(),
        isPaused: false
      }]);
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

      // Update the state locally instead of reloading the page
      setBookmarkResponses(prevResponses => 
        prevResponses.filter(response => response.id !== responseId)
      );
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

    try {
      const response = await fetch('/api/updateGPTResponseRank', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gptResponseId: responseId,
          rank: newRank
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rank');
      }

      const updatedResponse = await response.json();

      setBookmarkResponses(prevResponses => {
        // First update the rank of the modified response
        return prevResponses.map(response => 
          response.id === updatedResponse.id 
            ? { ...response, rank: updatedResponse.rank }
            : response
        );
      });
    } catch (error) {
      console.error('Error updating rank:', error);
    }
  };

  const handlePauseToggle = async (responseId: string, isPaused: boolean) => {    
    try {
      const res = await fetch('/api/toggleResponsePause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseId, isPaused }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        // Update the responses in place with the new isPaused value
        if (selectedBookmarkId) {
          // Updating bookmarkResponses with new isPaused value
          setBookmarkResponses(prevResponses => {
            const updatedResponses = prevResponses.map(response => 
              response.id === responseId ? { ...response, isPaused } : response
            );
            return updatedResponses;
          });
        } else {
          // Updating responses with new isPaused value
          setResponses(prevResponses => {
            const updatedResponses = prevResponses.map(response => 
              response.id === responseId ? { ...response, isPaused } : response
            );
            return updatedResponses;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling response pause state:', error);
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
        // Sort responses by rank (ascending) and then by date (newest first) within each rank
        const sortedResponses = data.responses.sort((a: Response, b: Response) => {
          // First sort by rank (ascending: 1, 2, 3)
          const rankComparison = a.rank - b.rank;
          if (rankComparison !== 0) return rankComparison;
          // Within same rank, sort by date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setBookmarkResponses(sortedResponses.map((response: Response) => ({
          id: response.id,
          content: response.content,
          rank: response.rank,
          createdAt: new Date(response.createdAt),
          isPaused: response.isPaused,
          bookmarks: response.bookmarks
        })));
      } else {
        setBookmarkResponses([]);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setBookmarkResponses([]);
    } finally {
      setIsLoading(false);
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
          selectedBookmarkId ? bookmarkContainerHeight() : ''
        }`}
        style={{ 
          height: selectedBookmarkId ? undefined : `calc(100% - ${baseUserInputOffset + userInputOffset}px)`,
          paddingBottom: 'env(safe-area-inset-bottom)' 
        }}
      >
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#000000] bg-opacity-50 z-50">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {!selectedBookmarkId && (
          <GPTResponse
            type="instruction"
            response={instructions.main}
            selectedBookmarkId={selectedBookmarkId}
            selectedBookmarkTitle={selectedBookmarkTitle ?? ''}
            reservedBookmarkTitles={reservedBookmarkTitles}
            responseId={null}
          />
        )}
        
        {selectedBookmarkTitle === 'daily summary' && (
          <GPTResponse
            type="instruction"
            response={instructions.dailySummary}
            selectedBookmarkId={selectedBookmarkId}
            selectedBookmarkTitle="daily summary"
            reservedBookmarkTitles={reservedBookmarkTitles}
            onGenerateSummary={handleGenerateSummary}
            onRankUpdate={handleRankUpdate}
            onDelete={handleResponseDelete}
            onPauseToggle={handlePauseToggle}
          />
        )}
        
        {selectedBookmarkId ? (
          bookmarkResponses.map((response, index) => (
            <GPTResponse
              key={index}
              response={response.content}
              selectedBookmarkId={selectedBookmarkId}
              selectedBookmarkTitle={selectedBookmarkTitle ?? ''}
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
            />
          ))
        ) : (
          responses.map((response, index) => (
            <GPTResponse
              key={index}
              response={response.content}
              selectedBookmarkId={selectedBookmarkId}
              selectedBookmarkTitle={selectedBookmarkTitle ?? ''}
              reservedBookmarkTitles={reservedBookmarkTitles}
              responseId={response.id}
              isPaused={response.isPaused}
              onDelete={handleResponseDelete}
              onQuote={handleResponseQuote}
              onRankUpdate={handleRankUpdate}
            />
          ))
        )}
      </div>
      {!selectedBookmarkId && (
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
