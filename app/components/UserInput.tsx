import React, { useState, KeyboardEvent } from 'react';
import { useSession } from "next-auth/react"

interface UserInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

export default function UserInput({ onSubmit, isLoading }: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const { data: session } = useSession();

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isLoading) {
        await onSubmit(prompt);
        setPrompt('');
      }
    }
  };
  
  const message = session?.user?.name ? `おはよう, ${session.user.name}! Write your prompt here...` : "おはよう! Write your prompt here...";

  return (
    <div className="my-4 relative">
      <textarea
        className="w-full p-3 bg-gray-900 text-white border border-gray-700 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 disabled:opacity-50"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={message}
        rows={1}
        disabled={isLoading}
      />
    </div>
  );
}
