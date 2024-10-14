import { useState } from 'react';
import { getSession, useSession } from "next-auth/react"

export default function Chatbox() {
  const { data: session, status } = useSession()
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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

      const data = await res.json();
      setResponse(data.result);
    } catch (error) {
      console.error('Error fetching data:', error);
      setResponse('An error occurred while fetching the response.');
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>
  }

  const formatResponse = (text) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Learn Japanese</h1>
      <form onSubmit={handleSubmit} className="my-4">
        <textarea
          className="text-black w-full p-2 border border-gray-300 rounded"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your question or sentence in English..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded mt-2"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>

      {response && (
        <div className="mt-4 p-4 border border-gray-300 rounded">
          <h2 className="font-bold">AI Response:</h2>
          <div className="whitespace-pre-wrap">{formatResponse(response)}</div>
        </div>
      )}
    </div>
  );
}
