import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"

interface UserInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
  defaultPrompt?: string;
  onUserInputOffset: (offset: number) => void;
}

export default function UserInput({ onSubmit, isLoading, defaultPrompt, onUserInputOffset }: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (defaultPrompt) {
      setPrompt(defaultPrompt);
      setTimeout(adjustHeight, 0);

      // Focus on the textarea and scroll to the bottom
      if (textareaRef.current) {
        textareaRef.current.focus();
        setTimeout(() => {
          textareaRef.current!.scrollTop = textareaRef.current!.scrollHeight;
        }, 50);
      }
    }
  }, [defaultPrompt]);


  // Adjust the height of the textarea based on the user's input
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      if (textarea.value.trim() === '') {
        textarea.style.height = '50px';
        onUserInputOffset(0);
      } else {
        const newHeight = Math.max(textarea.scrollHeight, 50);
        textarea.style.height = newHeight + 'px';

        // Adjust the offset based on the height of the textarea
        if (newHeight > 50 && newHeight < 100) {
          onUserInputOffset((newHeight % 50));
        } else if (newHeight > 100) {
          onUserInputOffset(50);
        } else {
          onUserInputOffset(0);
        }
      }
    }
  };

  // Update the state and adjust the height of the textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    adjustHeight();
  };

  // Submit the user's input
  const handleSubmit = async () => {
    if (prompt.trim() && !isLoading) {
      await onSubmit(prompt);
      setPrompt('');
      textareaRef.current!.value = '';
      adjustHeight();
    }
  };

  // Handle the Enter key press
  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
    }
  };
  
  const message = session?.user?.name ? `おはよう, ${session.user.name}!` : "おはよう!";

  return (
    <div className="relative flex items-end gap-2 bg-[#000000] p-2 rounded-lg">
      <textarea
        ref={textareaRef}
        className="flex-1 p-2 bg-[#000000] text-black border border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 disabled:opacity-50 min-h-[50px] h-[50px] max-h-[100px] overflow-y-auto leading-[1.5]"
        value={prompt}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={message}
        disabled={isLoading}
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !prompt.trim()}
        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[38px] w-[38px] flex-shrink-0 flex items-center justify-center mb-2"
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
