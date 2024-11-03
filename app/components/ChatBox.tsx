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
  const instructions = "1 \- Enter a phrase or sentence to breakdown in Japanese, no need to include \"translate\" in your prompt.\n2 \- Use **\"random\"** for a daily-use sentence translated to Japanese.\n3 \- Use **\"verb\"** followed by a verb (English or Japanese) to get a tense table with formal and informal forms of the verb.\n4 \- Use **\"terms\"** followed by a word to receive a list of related words in Japanese.\n5 \- Use **\"katakana\"** for a table showing the katakana alphabet with hiragana and romaji.\n6 \- Use an **asterisk (*)** followed by a question to inquire about anything else.\n\n Lastly, use the **(+) icon** at the top right of each response to save it to your bookmarks.";
  const { data: session, status } = useSession()
  const [bookmarkResponses, setBookmarkResponses] = useState<Response[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [responseQuote, setResponseQuote] = useState<string|null>(null);
  const [userInputOffset, setUserInputOffset] = useState<number>(0);
  const [baseUserInputOffset, setBaseUserInputOffset] = useState<number>(140);

  useEffect(() => {
    const handleResize = () => {
      initBaseUserInputOffset();
    };

    // Set the initial value based on the current window width
    handleResize();

    // Add event listener to handle window resize
    window.addEventListener('resize', handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // When the selected bookmark changes, fetch the responses from the database
  useEffect(() => {
    if (selectedBookmarkId && session?.userId) {
      fetchBookmarkResponses(session.userId, selectedBookmarkId);
    } else {
      setBookmarkResponses([]);
    }

  }, [selectedBookmarkId, session]);

  // Scrolls to the bottom of the chat container when either a new response is added or a user clicks on response quote
  useEffect(() => {
    if (chatContainerRef.current && !selectedBookmarkId) {
      setTimeout(() => {
        chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
      }, 100);
    }
  }, [responses, bookmarkResponses, responseQuote]);

  // Fetch bookmark responses from database and sets responses in ascending order by id, then descending by rank
  const fetchBookmarkResponses = async (userId: string, bookmarkId: string) => {
    try {
      const res = await fetch(`/api/getBookmarkResponses?userId=${userId}&bookmarkId=${bookmarkId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("Data:", data)
      
      setBookmarkResponses(data.map((response: BookmarkResponse) => ({
        id: response.id,
        content: response.content,
        rank: response.rank,
        createdAt: new Date(response.createdAt)
      })));
    } catch (error) {
      console.error('Error fetching bookmark responses:', error);
    }
  };

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
    const quotedResponse = `${response}\n\n* In the above phrase... `;
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
          selectedBookmarkId ? 'h-[87.5%]' : ''
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
