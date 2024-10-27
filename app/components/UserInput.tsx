import React, { useState, KeyboardEvent } from 'react';
import { useSession } from "next-auth/react"

interface UserInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

export default function UserInput({ onSubmit, isLoading }: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const { data: session } = useSession();

  const handleSubmit = async () => {
    if (prompt.trim() && !isLoading) {
      await onSubmit(prompt);
      setPrompt('');
    }
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
    }
  };
  
  const message = session?.user?.name ? `おはよう, ${session.user.name}!` : "おはよう!";

  return (
    <div className="my-4 relative flex items-center gap-2 bg-[#000000] p-2 rounded-lg">
      <textarea
        className="flex-1 p-3 bg-[#000000] text-white border border-gray-700 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 disabled:opacity-50"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={message}
        rows={1}
        disabled={isLoading}
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !prompt.trim()}
        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-5 h-5"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </div>
  );
}
