import React, { useState } from 'react';

interface UserInputProps {
  onSubmit: (prompt: string) => Promise<void>;
}

export default function UserInput({ onSubmit }: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(prompt);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="my-4">
      <textarea
        className="text-black w-full p-2 border border-gray-300 rounded"
        value={prompt}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
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
  );
}
