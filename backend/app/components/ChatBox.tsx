import React, { useState } from 'react';
import { useSession } from "next-auth/react"
import UserInput from './UserInput';

export default function ChatBox() {
  const { data: session, status } = useSession()
  const [response, setResponse] = useState<string>('');

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
    return <div>Loading...</div>
  }

  const formatResponse = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="container mx-auto p-4">
      {response && (
          <div className="mt-4 p-4 border border-gray-300 rounded">
          <h2 className="font-bold">AI Response:</h2>
          <div className="whitespace-pre-wrap">{formatResponse(response)}</div>
        </div>
      )}
      <UserInput onSubmit={handleSubmit} />
    </div>
  );
}