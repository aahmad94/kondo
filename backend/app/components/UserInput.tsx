import React, { useState, KeyboardEvent } from 'react';
import { useSession } from "next-auth/react"
import { InformationCircleIcon } from '@heroicons/react/24/solid';

interface UserInputProps {
  onSubmit: (prompt: string) => Promise<void>;
}

export default function UserInput({ onSubmit }: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { data: session, status } = useSession();

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !loading) {
        setLoading(true);
        await onSubmit(prompt);
        setPrompt('');
        setLoading(false);
      }
    }
  };
  
  const message = session?.user?.name ? `おはよう, ${session.user.name}! write a phrase to get started...` : "おはよう! Write a phrase to get started...";

  return (
    <div className="my-4 relative">
      <textarea
        className="w-full p-3 bg-gray-900 text-white border border-gray-700 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={message}
        rows={1}
        disabled={loading}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-full">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}
