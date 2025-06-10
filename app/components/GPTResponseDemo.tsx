'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, PauseCircleIcon, PlayCircleIcon, PlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import BreakdownModalDemo from './BreakdownModalDemo';
import { useIsMobile } from '../hooks/useIsMobile';
import Tooltip from './Tooltip';
import { addFurigana, containsKanji } from '../../lib/furiganaService';
import FuriganaText from './FuriganaText';
import RankContainer from './ui/RankContainer';
import BreakdownButton from './ui/BreakdownButton';
import SpeakerButton from './ui/SpeakerButton';
import { extractJapaneseFromDemo } from '../../lib/audioUtils';

interface DemoResponse {
  id: string;
  bookmark: string;
  content: {
    japanese: string;
    hiragana: string;
    romanized: string;
    english: string;
    furigana?: string;
  };
  breakdown: string;
  rank: number;
  isPaused: boolean;
  createdAt: string;
  audio?: {
    success: boolean;
    audio: string;
    mimeType: string;
  };
}

interface GPTResponseDemoProps {
  response: DemoResponse;
}

export default function GPTResponseDemo({ response }: GPTResponseDemoProps) {
  const [rank, setRank] = useState(response.rank);
  const [isPaused, setIsPaused] = useState(response.isPaused);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [furiganaText, setFuriganaText] = useState<string>(response.content.furigana || '');
  const [isLoadingFurigana, setIsLoadingFurigana] = useState(false);
  const { isMobile } = useIsMobile();
  const [isPauseHovered, setIsPauseHovered] = useState(false);

  const [isPlusHovered, setIsPlusHovered] = useState(false);
  const [isBookmarkHovered, setIsBookmarkHovered] = useState(false);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = useRef<HTMLButtonElement>(null);
  const speakerButtonRef = useRef<HTMLButtonElement>(null);

  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);

  // Furigana toggle state
  const [isFuriganaEnabled, setIsFuriganaEnabled] = useState(false);
  const [showFuriganaDropdown, setShowFuriganaDropdown] = useState(false);
  const furiganaDropdownRef = useRef<HTMLDivElement>(null);

  // Phonetic toggle state
  const [isPhoneticEnabled, setIsPhoneticEnabled] = useState(true);

  // Kana toggle state
  const [isKanaEnabled, setIsKanaEnabled] = useState(true);

  // Check if we should use furigana (Japanese text with kanji)
  const shouldUseFurigana = containsKanji(response.content.japanese) && isFuriganaEnabled;

  // Use pre-generated furigana from dummy data, fallback to API if not available
  useEffect(() => {
    const generateFurigana = async () => {
      if (!shouldUseFurigana) return;
      
      // If we already have furigana in the dummy data, use it
      if (response.content.furigana) {
        setFuriganaText(response.content.furigana);
        return;
      }

      // Fallback to API call if furigana is not in dummy data
      setIsLoadingFurigana(true);
      try {
        const furiganaResult = await addFurigana(response.content.japanese, response.content.hiragana, response.id);
        setFuriganaText(furiganaResult);
      } catch (error) {
        console.error('Error generating furigana:', error);
        // On error, don't use furigana - fall back to original 4-line format
        setFuriganaText('');
      } finally {
        setIsLoadingFurigana(false);
      }
    };

    generateFurigana();
  }, [response.content.japanese, response.content.hiragana, response.content.furigana, shouldUseFurigana, response.id]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (furiganaDropdownRef.current && !furiganaDropdownRef.current.contains(event.target as Node)) {
        setShowFuriganaDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle furigana toggle
  const handleFuriganaToggle = () => {
    setIsFuriganaEnabled(!isFuriganaEnabled);
    // Only close dropdown for non-Japanese languages (Japanese has multiple options)
    // Note: GPTResponseDemo is always Japanese, so we keep it open
    // setShowFuriganaDropdown(false);
  };

  // Handle phonetic toggle
  const handlePhoneticToggle = () => {
    setIsPhoneticEnabled(!isPhoneticEnabled);
    // Only close dropdown for non-Japanese languages (Japanese has multiple options)
    // Note: GPTResponseDemo is always Japanese, so we keep it open
    // setShowFuriganaDropdown(false);
  };

  // Handle kana toggle
  const handleKanaToggle = () => {
    setIsKanaEnabled(!isKanaEnabled);
    // Only close dropdown for non-Japanese languages (Japanese has multiple options)
    // Note: GPTResponseDemo is always Japanese, so we keep it open
    // setShowFuriganaDropdown(false);
  };



  const onRankClick = (increment: boolean) => {
    const newRank = increment ? Math.min(rank + 1, 3) : Math.max(rank - 1, 1);
    setRank(newRank);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleBreakdownClick = () => {
    setIsBreakdownOpen(true);
  };





  // Extract Japanese expressions for highlighting
  function extractExpressions(response: string): string[] {
    const expressions: string[] = [];
    const regex = /([一-龯ひらがなカタカナ]+)/g;
    let match;
    
    while ((match = regex.exec(response)) !== null) {
      if (match[1].length > 1) {
        expressions.push(match[1]);
      }
    }
    
    return expressions.slice(0, 5); // Limit to 5 expressions
  }

  const expressions = extractExpressions(response.content.japanese);

  return (
    <>
      <div className="pl-3 pt-3 rounded text-white w-full border-b border-[#222222]" style={{ backgroundColor: '#000000' }}>
        {/* Header */}
        <div className="header flex justify-between mb-2 pb-1">          
          <div className="flex items-center gap-3">
            {/* Rank container */}
            <RankContainer 
              rank={rank} 
              onRankClick={onRankClick}
            />



            {/* Breakdown button */}
            <BreakdownButton 
              onBreakdownClick={handleBreakdownClick}
              tooltipContent="Analyze content and generate grammar walkthrough"
              buttonRef={breakdownButtonRef}
            />

            {/* Speaker button */}
            {response.audio?.success && (
              <SpeakerButton
                responseId={response.id}
                textToSpeak={extractJapaneseFromDemo(response.content)}
                selectedLanguage="ja"
                cachedAudio={response.audio ? {
                  audio: response.audio.audio,
                  mimeType: response.audio.mimeType
                } : null}
                buttonRef={speakerButtonRef}
                onError={(error) => {
                  alert(error);
                }}
              />
            )}
          </div>

          {/* Right side - Plus button */}
          <div className="flex items-center gap-3">
            {/* Language options dropdown */}
            <div className="relative flex flex-col justify-center" ref={furiganaDropdownRef}>
              <button
                onClick={() => setShowFuriganaDropdown(!showFuriganaDropdown)}
                className="text-white hover:text-gray-300 transition-colors duration-200"
              >
                <ChevronDownIcon className="h-6 w-6" />
              </button>
              {showFuriganaDropdown && (
                <div className={`absolute left-1/2 transform -translate-x-1/2 top-full mt-2 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-[60] ${
                  isMobile 
                    ? 'min-w-[80px] w-[100px] max-w-[100px]' 
                    : 'min-w-[120px] w-max'
                }`}>
                  <div className="py-1">
                    {/* Furigana toggle - only for Japanese */}
                    <button
                      onClick={handleFuriganaToggle}
                      className={`flex items-center w-full px-3 py-1.5 text-xs text-left text-gray-200 hover:bg-gray-700 ${
                        isMobile ? 'whitespace-normal' : 'whitespace-nowrap'
                      }`}
                    >
                      <span>
                        {isFuriganaEnabled ? (
                          <span>Hide furigana</span>
                        ) : (
                          <span>Show furigana</span>
                        )}
                      </span>
                    </button>
                    
                    {/* Kana toggle - only for Japanese */}
                    <button
                      onClick={handleKanaToggle}
                      className={`flex items-center w-full px-3 py-1.5 text-xs text-left text-gray-200 hover:bg-gray-700 ${
                        isMobile ? 'whitespace-normal' : 'whitespace-nowrap'
                      }`}
                    >
                      <span className={isMobile ? 'truncate' : ''}>
                        {isKanaEnabled ? (
                          <span>Hide kana</span>
                        ) : (
                          <span>Show kana</span>
                        )}
                      </span>
                    </button>

                    {/* Phonetic toggle */}
                    <button
                      onClick={handlePhoneticToggle}
                      className={`flex items-center w-full px-3 py-1.5 text-xs text-left text-gray-200 hover:bg-gray-700 ${
                        isMobile ? 'whitespace-normal' : 'whitespace-nowrap'
                      }`}
                    >
                      <span className={isMobile ? 'truncate' : ''}>
                        {isPhoneticEnabled ? (
                          <span>Hide romanization</span>
                        ) : (
                          <span>Show romanization</span>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Plus button */}
            {!isMobile ? (
              <Tooltip
                content="Add to a bookmark to organize study material"
                isVisible={isPlusHovered}
                buttonRef={plusButtonRef}
              >
                <button 
                  ref={plusButtonRef}
                  onMouseEnter={() => setIsPlusHovered(true)}
                  onMouseLeave={() => setIsPlusHovered(false)}
                  className="text-white hover:text-blue-400 transition-colors duration-200 pr-3"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={plusButtonRef}
                className="text-white hover:text-blue-400 transition-colors duration-200 pr-3"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Response content */}
        <div className="whitespace-pre-wrap overflow-x-auto w-[95%]">
          <div className="pr-3" style={{ color: '#b59f3b' }}>
            <div className="space-y-2">
              {shouldUseFurigana ? (
                <>
                  {/* Japanese text with furigana */}
                  <div className="text-xl font-medium">
                    {furiganaText && !isLoadingFurigana ? (
                      <FuriganaText furiganaHtml={furiganaText} fontSize="1.25rem" />
                    ) : (
                      <span>{response.content.japanese}</span>
                    )}
                  </div>

                  {/* Hiragana reading (show/hide based on kana toggle) */}
                  {isKanaEnabled && (
                    <div className="text-sm opacity-80">
                      {response.content.hiragana}
                    </div>
                  )}

                  {/* Romanized text */}
                  {isPhoneticEnabled && (
                    <div className="text-sm opacity-80 italic" style={{ color: 'rgb(181, 159, 59, 0.60)' }}>
                      {response.content.romanized}
                    </div>
                  )}

                  {/* English translation */}
                  <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
                    {response.content.english}
                  </span>
                </>
              ) : (
                <>
                  {/* Japanese text without furigana */}
                  <div className="text-xl font-medium">
                    {response.content.japanese}
                  </div>

                  {/* Hiragana reading (show/hide based on kana toggle) */}
                  {isKanaEnabled && (
                    <div className="text-sm opacity-80">
                      {response.content.hiragana}
                    </div>
                  )}

                  {/* Romanized text */}
                  {isPhoneticEnabled && (
                    <div className="text-sm opacity-80 italic" style={{ color: 'rgb(181, 159, 59, 0.60)' }}>
                      {response.content.romanized}
                    </div>
                  )}

                  {/* English translation */}
                  <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
                    {response.content.english}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bookmark badge and pause toggle at bottom */}
        <div className="mt-2 pt-1 flex items-center gap-2">
          {/* Bookmark badge */}
          {!isMobile ? (
            <Tooltip
              content="View bookmark that this content is from"
              isVisible={isBookmarkHovered}
              buttonRef={bookmarkButtonRef}
            >
              <button 
                ref={bookmarkButtonRef}
                className="text-xs px-2 py-1 bg-blue-500 rounded-sm cursor-pointer hover:bg-blue-600 transition-colors duration-200 active:bg-blue-700 max-w-[120px] truncate text-white"
                onMouseEnter={() => setIsBookmarkHovered(true)}
                onMouseLeave={() => setIsBookmarkHovered(false)}
              >
                {response.bookmark}
              </button>
            </Tooltip>
          ) : (
            <button className="text-xs px-2 py-1 bg-blue-500 rounded-sm cursor-pointer hover:bg-blue-600 transition-colors duration-200 active:bg-blue-700 max-w-[120px] truncate text-white">
              {response.bookmark}
            </button>
          )}
          
          {/* Pause toggle */}
          {!isMobile ? (
            <Tooltip
              content={isPaused 
                ? "Resume cycling this response in dojo" 
                : "Pause cycling this response in dojo"
              }
              isVisible={isPauseHovered}
              buttonRef={pauseButtonRef}
            >
              <button 
                ref={pauseButtonRef}
                onClick={handlePauseToggle}
                onMouseEnter={() => setIsPauseHovered(true)}
                onMouseLeave={() => setIsPauseHovered(false)}
                className={`transition-colors duration-200 ${
                  isPaused 
                    ? 'text-green-500 hover:text-green-700' 
                    : 'text-yellow-500 hover:text-yellow-700'
                }`}
              >
                {isPaused ? (
                  <PlayCircleIcon className="h-5 w-5" />
                ) : (
                  <PauseCircleIcon className="h-5 w-5" />
                )}
              </button>
            </Tooltip>
          ) : (
            <button 
              ref={pauseButtonRef}
              onClick={handlePauseToggle}
              className={`transition-colors duration-200 ${
                isPaused 
                  ? 'text-green-500 hover:text-green-700' 
                  : 'text-yellow-500 hover:text-yellow-700'
              }`}
            >
              {isPaused ? (
                <PlayCircleIcon className="h-5 w-5" />
              ) : (
                <PauseCircleIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="pb-2"></div>
      </div>

      {/* Breakdown Modal */}
      <BreakdownModalDemo
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        breakdown={response.breakdown}
        rank={rank}
        isPaused={isPaused}
        responseId={response.id}
        audio={response.audio}
        onRankUpdate={(responseId: string, newRank: number) => {
          setRank(newRank);
          return Promise.resolve();
        }}
        onPauseToggle={(responseId: string, isPaused: boolean) => {
          setIsPaused(isPaused);
          return Promise.resolve();
        }}
      />
    </>
  );
} 