'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon, SpeakerWaveIcon, PauseCircleIcon, PlayCircleIcon, PlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import BreakdownModalDemo from './BreakdownModalDemo';
import { useIsMobile } from '../hooks/useIsMobile';
import Tooltip from './Tooltip';
import { addFurigana, containsKanji } from '../../lib/furiganaService';
import FuriganaText from './FuriganaText';

interface DemoResponse {
  id: string;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [furiganaText, setFuriganaText] = useState<string>(response.content.furigana || '');
  const [isLoadingFurigana, setIsLoadingFurigana] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMobile } = useIsMobile();
  const [isPauseHovered, setIsPauseHovered] = useState(false);
  const [isBreakdownHovered, setIsBreakdownHovered] = useState(false);
  const [isSpeakerHovered, setIsSpeakerHovered] = useState(false);
  const [isUpChevronHovered, setIsUpChevronHovered] = useState(false);
  const [isDownChevronHovered, setIsDownChevronHovered] = useState(false);
  const [isPlusHovered, setIsPlusHovered] = useState(false);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = useRef<HTMLButtonElement>(null);
  const speakerButtonRef = useRef<HTMLButtonElement>(null);
  const upChevronRef = useRef<HTMLButtonElement>(null);
  const downChevronRef = useRef<HTMLButtonElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

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

  // Handle rank color changes based on rank value
  const getRankBorderColor = (rank: number) => {
    if (rank === 1) return '#d93900'; // red
    if (rank === 2) return '#b59f3b'; // yellow
    if (rank === 3) return '#2ea149'; // green
    return '#666666';
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

  const handleSpeakerClick = async () => {
    if (!response.audio || !response.audio.success) {
      alert('Audio not available for this demo response');
      return;
    }

    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Convert base64 audio to blob and create URL
      const audioBlob = new Blob(
        [Buffer.from(response.audio.audio, 'base64')],
        { type: response.audio.mimeType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;

      await audioRef.current.play();
      setIsPlaying(true);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        alert('Error playing audio');
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      alert('Error playing audio');
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    let isUnmounted = false;
    const audio = audioRef.current;

    if (audio) {
      const handleEnded = () => {
        if (!isUnmounted) setIsPlaying(false);
      };
      const handleError = () => {
        if (!isUnmounted) {
          setIsPlaying(false);
          alert('Error playing audio');
        }
      };
      audio.onended = handleEnded;
      audio.onerror = handleError;
    }

    return () => {
      isUnmounted = true;
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.onended = null;
        audio.onerror = null;
      }
    };
  }, [response]);

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
            <div
              className="rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400"
              style={{
                border: `3px solid ${getRankBorderColor(rank)}`,
                backgroundColor: '#111111'
              }}
            >
              {!isMobile ? (
                <Tooltip
                  content="Rank higher - higher ranked content will surface less"
                  isVisible={isUpChevronHovered}
                  buttonRef={upChevronRef}
                >
                  <button
                    ref={upChevronRef}
                    onClick={() => onRankClick(true)}
                    disabled={rank >= 3}
                    className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                    onMouseEnter={() => setIsUpChevronHovered(true)}
                    onMouseLeave={() => setIsUpChevronHovered(false)}
                  >
                    <ChevronUpIcon className="h-5 w-5" />
                  </button>
                </Tooltip>
              ) : (
                <button
                  ref={upChevronRef}
                  onClick={() => onRankClick(true)}
                  disabled={rank >= 3}
                  className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                >
                  <ChevronUpIcon className="h-5 w-5" />
                </button>
              )}
              <span className="px-1.5 rounded text-xs text-white">
                {rank}
              </span>
              {!isMobile ? (
                <Tooltip
                  content="Rank lower - lower ranked content will surface more"
                  isVisible={isDownChevronHovered}
                  buttonRef={downChevronRef}
                >
                  <button
                    ref={downChevronRef}
                    onClick={() => onRankClick(false)}
                    disabled={rank <= 1}
                    className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                    onMouseEnter={() => setIsDownChevronHovered(true)}
                    onMouseLeave={() => setIsDownChevronHovered(false)}
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </button>
                </Tooltip>
              ) : (
                <button
                  ref={downChevronRef}
                  onClick={() => onRankClick(false)}
                  disabled={rank <= 1}
                  className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Pause button */}
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
                    <PlayCircleIcon className="h-6 w-6" />
                  ) : (
                    <PauseCircleIcon className="h-6 w-6" />
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
                  <PlayCircleIcon className="h-6 w-6" />
                ) : (
                  <PauseCircleIcon className="h-6 w-6" />
                )}
              </button>
            )}

            {/* Breakdown button */}
            {!isMobile ? (
              <Tooltip
                content="Analyze content and generate grammar walkthrough"
                isVisible={isBreakdownHovered}
                buttonRef={breakdownButtonRef}
              >
                <button 
                  ref={breakdownButtonRef}
                  onClick={handleBreakdownClick}
                  onMouseEnter={() => setIsBreakdownHovered(true)}
                  onMouseLeave={() => setIsBreakdownHovered(false)}
                  className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
                >
                  <MagnifyingGlassIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={breakdownButtonRef}
                onClick={handleBreakdownClick}
                className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
              >
                <MagnifyingGlassIcon className="h-6 w-6" />
              </button>
            )}

            {/* Speaker button */}
            {!isMobile ? (
              <Tooltip
                content="Listen to pronunciation"
                isVisible={isSpeakerHovered}
                buttonRef={speakerButtonRef}
              >
                <button 
                  ref={speakerButtonRef}
                  onClick={handleSpeakerClick}
                  onMouseEnter={() => setIsSpeakerHovered(true)}
                  onMouseLeave={() => setIsSpeakerHovered(false)}
                  className={`transition-colors duration-200 ${
                    isPlaying 
                      ? 'text-green-400 hover:text-green-600' 
                      : 'text-blue-400 hover:text-blue-700'
                  }`}
                  disabled={!response.audio?.success}
                >
                  <SpeakerWaveIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={speakerButtonRef}
                onClick={handleSpeakerClick}
                className={`transition-colors duration-200 ${
                  isPlaying 
                    ? 'text-green-400 hover:text-green-600' 
                    : 'text-blue-400 hover:text-blue-700'
                }`}
                disabled={!response.audio?.success}
              >
                <SpeakerWaveIcon className="h-6 w-6" />
              </button>
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