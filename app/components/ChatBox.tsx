import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';

interface ChatBoxProps {
  selectedBookmarkId: string | null;
}

interface BookmarkResponse {
  content: string;
}

export default function ChatBox({ selectedBookmarkId }: ChatBoxProps) {
  const instructions = `
  - Enter a phrase or sentence to breakdown in Japanese, no need to include "translate" in your prompt.
  - Use "verb" followed by a verb to get a tense table with formal and informal forms of the verb.
  - Use "terms" followed by a word to receive a list of related words in Japanese.
  - Use "random" for a daily-use sentence translated to Japanese.
  - Use "katakana" for a table showing the katakana alphabet with hiragana and romaji.
  - use an asterisk "*" followed by a question to inquire about anything else.
`;
  const { data: session, status } = useSession()
  const [bookmarkResponses, setBookmarkResponses] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedBookmarkId && session?.userId) {
      fetchBookmarkResponses(session.userId, selectedBookmarkId);
    } else {
      setBookmarkResponses([]);
    }
  }, [selectedBookmarkId, session]);

  const fetchBookmarkResponses = async (userId: string, bookmarkId: string) => {
    try {
      const res = await fetch(`/api/getBookmarkResponses?userId=${userId}&bookmarkId=${bookmarkId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setBookmarkResponses(data.map((response: BookmarkResponse) => response.content));
    } catch (error) {
      console.error('Error fetching bookmark responses:', error);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [responses, bookmarkResponses]);

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
      setResponses(prevResponses => [...prevResponses, data.result]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setResponses(prevResponses => [...prevResponses, 'An error occurred while fetching the response.']);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 bg-gray-900 min-h-screen">
      <div 
        ref={chatContainerRef}
        className={`flex-grow overflow-y-auto relative ${
          selectedBookmarkId 
            ? 'max-h-[85vh]' 
            : ' md:max-h-[77vh] max-h-[75vh]'
        }`}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {/* Instructions message when no bookmark is selected */}
        {!selectedBookmarkId && (
          <GPTResponse
            response={instructions}
            selectedBookmarkId={selectedBookmarkId}
          />
        )}
        
        {selectedBookmarkId ? (
          bookmarkResponses.map((response, index) => (
            <GPTResponse
              key={index}
              response={response}
              selectedBookmarkId={selectedBookmarkId}
            />
          ))
        ) : (
          responses.map((response, index) => (
            <GPTResponse
              key={index}
              response={response}
              selectedBookmarkId={selectedBookmarkId}
            />
          ))
        )}
      </div>
      {!selectedBookmarkId && (
        <div className="mt-4">
          <UserInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
