import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';

interface ChatBoxProps {
  selectedBookmarkId: string | null;
}

interface Response {
  id: string | null;
  content: string;
  rank: number;
  createdAt: Date;
}

interface BookmarkResponse {
  id: string;
  content: string;
  rank: number;
  createdAt: Date;
}

export default function ChatBox({ selectedBookmarkId }: ChatBoxProps) {
  const instructions = `
  Enter a phrase or sentence to translate into Japanese; use the **reply button** on a response to get a more detailed breakdown.  

  **Bookmark features:**
  **(+) button** - save response to save it to a bookmark.
  **up or down chevron (^)** - rank each response in a bookmark.

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/jpn) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Japanese.
  4 - **"katakana"** - table of hiragana/katakana and romaji.
  5 - **"asterisk (*)" + question** - inquire about anything else.
`;
  const { data: session, status } = useSession()
  const [bookmarkResponses, setBookmarkResponses] = useState<Response[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [responseQuote, setResponseQuote] = useState<string|null>(null);
  const [userInputOffset, setUserInputOffset] = useState<number>(0);
  const [baseUserInputOffset, setBaseUserInputOffset] = useState<number>(140);

  const bookmarkContainerHeight = () => {
    return window.innerWidth < 768 ? 'h-[81.5%]' : 'h-[92.5%]';
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

  // When the selected bookmark changes, fetch the responses and scroll when they're loaded
  useEffect(() => {
    if (selectedBookmarkId && selectedBookmarkId !== "all" && session?.userId) {
      fetchBookmarkResponses(session.userId, selectedBookmarkId);
    } else if (selectedBookmarkId === "all" && session?.userId) {
      fetchAllResponses(session.userId);
    } else {
      setBookmarkResponses([]);
    }

    // Scroll to bottom when responses are loaded
    if (chatContainerRef.current && selectedBookmarkId) {
      const intervalId = setInterval(() => {
        if (bookmarkResponses.length > 0) {
          chatContainerRef.current!.scrollTo({
            top: chatContainerRef.current!.scrollHeight,
            behavior: 'smooth'
          });
          clearInterval(intervalId);
        }
      }, 200);

      // Cleanup interval on unmount or when selectedBookmarkId changes
      return () => clearInterval(intervalId);
    }
  }, [selectedBookmarkId, session]);


  // Scroll to bottom when new responses are added or quote is clicked
  useEffect(() => {
    if (chatContainerRef.current && !selectedBookmarkId && (responses.length > 0 || responseQuote)) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [responses, responseQuote, selectedBookmarkId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
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
      setBookmarkResponses(data.map((response: BookmarkResponse) => ({
        id: response.id,
        content: response.content,
        rank: response.rank,
        createdAt: new Date(response.createdAt)
      })));
    } catch (error) {
      console.error('Error fetching bookmark responses:', error);
    } finally {
      scrollToBottom();
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
        createdAt: new Date(response.createdAt)
      })));
    } catch (error) {
      console.error('Error fetching all responses:', error);
    } finally {
      scrollToBottom();
    }
  }

  // Handle the user's input, does not save to database
  const handleSubmit = async (prompt: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: { result: string } = await res.json();
      setResponses(prevResponses => [...prevResponses, { id: null, content: data.result, rank: 1, createdAt: new Date() }]);
      setResponseQuote('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setResponses(prevResponses => [...prevResponses, { 
        id: null, 
        content: 'An error occurred while fetching the response.',
        rank: 1,
        createdAt: new Date()
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
  const handleResponseDelete = async (responseId: string) => {
    if (!session?.userId || !selectedBookmarkId) return;
    
    try {
      const res = await fetch(
        `/api/deleteGPTResponse?gptResponseId=${responseId}&bookmarkId=${selectedBookmarkId}`,
        {
          method: 'DELETE',
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

  const handleResponseQuote = (response: string) => {
    const quotedResponse = `${response}\n\n* Breakdown the above phrase.`;
    setResponseQuote(quotedResponse);
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
      console.log("Updated response:", updatedResponse);

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

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
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
            response={instructions}
            selectedBookmarkId={selectedBookmarkId}
            responseId={null}
          />
        )}
        
        {selectedBookmarkId ? (
          bookmarkResponses.map((response, index) => (
            <GPTResponse
              key={index}
              response={response.content}
              selectedBookmarkId={selectedBookmarkId}
              responseId={response.id}
              rank={response.rank}
              createdAt={response.createdAt}
              onDelete={handleResponseDelete}
              onQuote={handleResponseQuote}
              onRankUpdate={handleRankUpdate}
            />
          ))
        ) : (
          responses.map((response, index) => (
            <GPTResponse
              key={index}
              response={response.content}
              selectedBookmarkId={selectedBookmarkId}
              responseId={response.id}
              onDelete={handleResponseDelete}
              onQuote={handleResponseQuote}
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
        />
    )}
    </div>
  );
}
