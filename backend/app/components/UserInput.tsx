import React, { useState, KeyboardEvent } from 'react';
import { useSession } from "next-auth/react"

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
  
  const message = session?.user?.name ? `こんにちは, ${session.user.name}! write a phrase or sentence to breakdown in Japanese...` : "こんにちは, ゲスト!";
  return (
    <div className="my-4">
      <textarea
        className="w-full p-3 bg-gray-900 text-white border border-gray-700 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={message}
        rows={1}
        disabled={loading}
      />
    </div>
  );
}
