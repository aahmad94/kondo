import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';

interface ChatBoxProps {
  selectedBookmarkId: string | null;
}

export default function ChatBox({ selectedBookmarkId }: ChatBoxProps) {
  const instructions = `
  - Enter a phrase or sentence to breakdown in Japanese, no need to include "translate" in your prompt.
    - The response will include a translation in 1/ Japanese with kanji, 2/ hiragana and katakana, and 3/ romaji. 
  - Use "verb" followed by a verb to get a tense table with formal and informal forms of the verb.
  - Use "terms" followed by a word to receive a list of related words in Japanese.
  - Use "random" for a daily-use sentence translated to Japanese.
  - Use "katakana" for a table showing the katakana alphabet with hiragana and romaji.
  - use an asterisk "*" followed by a question to inquire about anything else.
`;
  const { data: session, status } = useSession()
  const [response, setResponse] = useState<string>('');
  const [bookmarkResponses, setBookmarkResponses] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
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
      setBookmarkResponses(data.map((response: any) => response.content));
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
    }
  };

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 bg-gray-900 min-h-screen">
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto"
        style={{ 
          maxHeight: selectedBookmarkId ? '90vh' : '79vh'
        }}
      >
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
          <UserInput onSubmit={handleSubmit} />
        </div>
      )}
    </div>
  );
}
