import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react"
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';

interface ChatBoxProps {
  selectedBookmarkId: string | null;
}

export default function ChatBox({ selectedBookmarkId }: ChatBoxProps) {
  const { data: session, status } = useSession()
  const [response, setResponse] = useState<string>('');
  const [bookmarkResponses, setBookmarkResponses] = useState<string[]>([]);

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

  const handleSubmit = async (prompt: string) => {
    setResponse('');

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
      setResponse(data.result);
    } catch (error) {
      console.error('Error fetching data:', error);
      setResponse('An error occurred while fetching the response.');
    }
  };

  if (status === "loading") {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 bg-gray-900 min-h-screen">
      {selectedBookmarkId ? (
        bookmarkResponses.map((response, index) => (
          <GPTResponse key={index} response={response} />
        ))
      ) : (
        <>
          {response && <GPTResponse response={response} />}
          <UserInput onSubmit={handleSubmit} />
        </>
      )}
    </div>
  );
}
