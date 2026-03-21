'use client';

import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUserAlias } from '../contexts/UserAliasContext';
import CommandPill from './ui/CommandPill';

type ActiveCommand = 'random' | 'terms' | 'verb' | null;
type Difficulty = 'easy' | 'medium' | 'hard';

const LANGUAGE_NAMES: Record<string, string> = {
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  ar: 'Arabic',
  zh: 'Chinese',
  ur: 'Urdu',
};

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'easy' },
  { value: 'medium', label: 'medium' },
  { value: 'hard', label: 'hard' },
];

interface UserInputProps {
  onSubmit: (prompt: string, model?: string) => Promise<void>;
  isLoading: boolean;
  defaultPrompt?: string | null;
  onUserInputOffset: (offset: number) => void;
  onQuoteToNull: () => void;
  selectedLanguage: string;
}

// --- SVG icons (inline to avoid extra import overhead) ---
const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const TableIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="9" x2="9" y2="21" />
    <line x1="15" y1="9" x2="15" y2="21" />
  </svg>
);

const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
// --------------------------------------------------------

export default function UserInput({
  onSubmit,
  isLoading,
  defaultPrompt,
  onUserInputOffset,
  onQuoteToNull,
  selectedLanguage,
}: UserInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [activeCommand, setActiveCommand] = useState<ActiveCommand>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);

  const { data: session } = useSession();
  const { alias } = useUserAlias();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textareaMaxHeight = 120;
  const textareaMinHeight = 50;

  // Greeting strings
  const greetings: Record<string, string> = {
    ja: 'おはよう',
    ko: '안녕하세요',
    es: '¡Hola',
    ar: 'مرحباً',
    zh: '你好',
    ur: 'السلام علیکم',
  };

  // True when the user has typed into the field without first selecting a command
  const hasTypedWithoutCommand = prompt.trim().length > 0 && activeCommand === null;

  useEffect(() => {
    setTimeout(() => adjustHeight(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;

    if (textarea.value.trim() === '') {
      onUserInputOffset(0);
    } else {
      let newHeight = Math.max(textarea.scrollHeight, textareaMinHeight);
      if (textarea.value.length < 20) newHeight = textareaMinHeight;
      newHeight = Math.min(newHeight, textareaMaxHeight);

      if (newHeight > textareaMinHeight) {
        textarea.style.height = `${newHeight}px`;
        onUserInputOffset(newHeight - textareaMinHeight);
      } else {
        textarea.style.height = `${textareaMinHeight}px`;
        onUserInputOffset(0);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    adjustHeight();
  };

  /** Builds the final prompt string to send, prepending the active command. */
  const buildFinalPrompt = (): string => {
    const text = prompt.trim();
    switch (activeCommand) {
      case 'random': {
        const parts: string[] = ['random'];
        if (text) parts.push(text);
        if (difficulty !== 'medium') parts.push(difficulty);
        return parts.join(' ');
      }
      case 'terms': {
        const parts: string[] = ['terms'];
        if (text) parts.push(text);
        return parts.join(' ');
      }
      case 'verb':
        return `verb ${text}`;
      default:
        return text;
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    const finalPrompt = buildFinalPrompt();
    if (!finalPrompt.trim()) return;
    await onSubmit(finalPrompt);
    setPrompt('');
    setActiveCommand(null);
    setDifficulty('medium');
    if (textareaRef.current) textareaRef.current.value = '';
    adjustHeight();
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
    }
  };

  const handleCommandClick = (command: ActiveCommand) => {
    setActiveCommand(prev => (prev === command ? null : command));
    setIsDifficultyOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const getPlaceholder = (): string => {
    if (activeCommand === 'random') return '[optional] enter topic for a random phrase';
    if (activeCommand === 'terms') {
      const langName = LANGUAGE_NAMES[selectedLanguage] || 'Japanese';
      return `Enter text to get related terms in ${langName}`;
    }
    if (activeCommand === 'verb') return 'Enter verb to get conjugation table';

    // Default greeting
    const base = greetings[selectedLanguage] ?? greetings.ja;
    let displayName = '';
    if (alias) {
      displayName = `, ${alias}`;
    } else if (session?.user?.name) {
      displayName = `, ${session.user.name.split(' ')[0]}`;
    }
    return `${base}${displayName}!`;
  };

  // --- Disabled states ---
  const isRandomDisabled  = hasTypedWithoutCommand || (activeCommand !== null && activeCommand !== 'random');
  const isTermsDisabled   = hasTypedWithoutCommand || (activeCommand !== null && activeCommand !== 'terms');
  const isVerbDisabled    = hasTypedWithoutCommand || (activeCommand !== null && activeCommand !== 'verb');
  // difficulty is only useful with random / terms
  const isDifficultyDisabled = activeCommand !== 'random' && activeCommand !== 'terms';

  // Submit is allowed when:
  //  • random is active (topic is optional)
  //  • any other command is active AND text is present
  //  • no command but text is present
  const canSubmit =
    !isLoading &&
    (activeCommand === 'random' || prompt.trim().length > 0);

  return (
    <div className="flex flex-col bg-background rounded-sm">
      {/* ── Floating command pills ── */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-0 flex-wrap">
        <CommandPill
          label="random"
          isActive={activeCommand === 'random'}
          isDisabled={isRandomDisabled}
          onClick={() => handleCommandClick('random')}
          icon={<ShuffleIcon />}
        />

        <CommandPill
          label="terms"
          isActive={activeCommand === 'terms'}
          isDisabled={isTermsDisabled}
          onClick={() => handleCommandClick('terms')}
          icon={<ListIcon />}
        />

        <CommandPill
          label="verb"
          isActive={activeCommand === 'verb'}
          isDisabled={isVerbDisabled}
          onClick={() => handleCommandClick('verb')}
          icon={<TableIcon />}
        />

        <CommandPill
          label="difficulty"
          isActive={false}
          isDisabled={isDifficultyDisabled}
          onClick={() => {}}
          icon={<SlidersIcon />}
          options={DIFFICULTY_OPTIONS}
          selectedValue={difficulty}
          onValueChange={(val) => setDifficulty(val as Difficulty)}
          isOpen={isDifficultyOpen}
          onToggle={() => setIsDifficultyOpen(prev => !prev)}
        />
      </div>

      {/* ── Text input row ── */}
      <div className="flex items-center bg-background rounded-sm">
        <textarea
          ref={textareaRef}
          className={`flex-grow m-2 px-4 py-2 bg-card text-card-foreground border border-border rounded-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder-muted-foreground disabled:opacity-50 min-h-[${textareaMinHeight}px] h-[${textareaMinHeight}px] max-h-[${textareaMaxHeight}px] overflow-y-auto leading-[1.5]`}
          value={prompt}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={isLoading}
        />
        <div className="flex-none mr-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[38px] w-[38px] items-center justify-center"
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
    </div>
  );
}
