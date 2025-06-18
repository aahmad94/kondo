import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"

interface UserInputProps {
  onSubmit: (prompt: string, model?: string) => Promise<void>;
  isLoading: boolean;
  defaultPrompt?: string|null;
  onUserInputOffset: (offset: number) => void;
  onQuoteToNull: () => void;
  selectedLanguage: string;
}

export default function UserInput({ onSubmit, isLoading, defaultPrompt, onUserInputOffset, onQuoteToNull, selectedLanguage }: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaMaxHeight = 120;
  const textareaMinHeight = 50;
  const jaGreeting = 'おはよう';
  const koGreeting = '안녕하세요';
  const esGreeting = '¡Hola';
  const arGreeting = 'مرحباً';
  const zhGreeting = '你好';


  // Adjust the height of the textarea when the component is mounted
  useEffect(() => {
    setTimeout(() => {
      adjustHeight();
    }, 0);
  }, []);

  // Adjust the height of the textarea based on the user's input
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to min to get accurate scrollHeight
      textarea.style.height = `${textareaMinHeight}px`;
      
      if (textarea.value.trim() === '') {
        onUserInputOffset(0);
      } else {
        let newHeight = Math.max(textarea.scrollHeight, textareaMinHeight);

        // If the user has not entered more than 20 characters, set the height to the minimum height
        if (textarea.value.length < 20) {
          newHeight = textareaMinHeight;
        }

        // Ensure we don't exceed maxHeight
        newHeight = Math.min(newHeight, textareaMaxHeight);

        // Adjust the offset based on the height of the textarea
        if (newHeight > textareaMinHeight) {
          textarea.style.height = newHeight + 'px';
          onUserInputOffset(newHeight - textareaMinHeight);
        } else {
          textarea.style.height = `${textareaMinHeight}px`;
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
  
  const getGreeting = () => {
    const userName = session?.user?.name ? `, ${session.user.name}` : '';
    switch (selectedLanguage) {
      case 'ko':
        return `${koGreeting}${userName}!`;
      case 'es':
        return `${esGreeting}${userName}!`;
      case 'ar':
        return `${arGreeting}${userName}!`;
      case 'zh':
        return `${zhGreeting}${userName}!`;
      default:
        return `${jaGreeting}${userName}!`;
    }
  };

  return (
    <div className="flex items-center bg-[#000000] rounded-sm">
      <textarea
        ref={textareaRef}
        className={`flex-grow m-2 px-4 py-2 bg-[#111111] text-white border border-gray-700 rounded-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 disabled:opacity-50 min-h-[${textareaMinHeight}px] h-[${textareaMinHeight}px] max-h-[${textareaMaxHeight}px] overflow-y-auto leading-[1.5]`}
        value={prompt}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={getGreeting()}
        disabled={isLoading}
      />
      <div className="flex-none mr-2">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[38px] w-[38px] items-center justify-center"
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
    </div>
  );
}
