'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon, LightBulbIcon, SpeakerWaveIcon, PauseCircleIcon, PlayCircleIcon } from '@heroicons/react/24/solid';
import BreakdownModalDemo from './BreakdownModalDemo';

interface DemoResponse {
  id: string;
  content: {
    japanese: string;
    hiragana: string;
    romanized: string;
    english: string;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

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
        <div className="header flex justify-between w-[90%] mb-2 pb-1">
          <div className="flex items-center gap-3">
            {/* Rank container */}
            <div
              className="rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400"
              style={{
                border: `3px solid ${getRankBorderColor(rank)}`,
                backgroundColor: '#111111'
              }}
            >
              <button
                onClick={() => onRankClick(true)}
                disabled={rank >= 3}
                className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
              >
                <ChevronUpIcon className="h-5 w-5" />
              </button>
              <span className="px-1.5 rounded text-xs text-white">
                {rank}
              </span>
              <button
                onClick={() => onRankClick(false)}
                disabled={rank <= 1}
                className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
              >
                <ChevronDownIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Pause button */}
            <button 
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

            {/* Breakdown button */}
            <button 
              onClick={handleBreakdownClick}
              className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
            >
              <LightBulbIcon className="h-6 w-6" />
            </button>

            {/* Speaker button */}
            <button 
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
          </div>
          
          {/* Empty div to maintain flex layout */}
          <div></div>
        </div>

        {/* Response content */}
        <div className="whitespace-pre-wrap overflow-x-auto w-[90%]">
          <div className="pr-3" style={{ color: '#b59f3b' }}>
            <div className="space-y-2">
              {/* Japanese text */}
              <div className="text-lg font-medium">
                {response.content.japanese}
              </div>

              {/* Hiragana reading */}
              <div className="text-sm opacity-80">
                {response.content.hiragana}
              </div>

              {/* Romanized text */}
              <div className="text-sm opacity-60 italic">
                {response.content.romanized}
              </div>

              {/* English translation */}
              <div className="text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
                {response.content.english}
              </div>
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