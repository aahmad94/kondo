'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon } from '@heroicons/react/24/solid';
import GPTResponse from './GPTResponse';
import Tooltip from './Tooltip';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAudio } from '../contexts/AudioContext';
import { prepareTextForSpeech } from '@/lib/utils';

interface Response {
  id: string | null;
  content: string;
  rank: number;
  isPaused?: boolean;
  decks?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  furigana?: string | null;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  audio?: string | null;
  audioMimeType?: string | null;
}

interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  responses: Response[];
  selectedLanguage: string;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onFuriganaToggle?: (responseId: string, isFuriganaEnabled: boolean) => Promise<void>;
  onPhoneticToggle?: (responseId: string, isPhoneticEnabled: boolean) => Promise<void>;
  onKanaToggle?: (responseId: string, isKanaEnabled: boolean) => Promise<void>;
  onLoadingChange?: (isLoading: boolean) => void;
}

export default function FlashcardModal({
  isOpen,
  onClose,
  responses,
  selectedLanguage,
  onRankUpdate,
  onPauseToggle,
  onFuriganaToggle,
  onPhoneticToggle,
  onKanaToggle,
  onLoadingChange
}: FlashcardModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(20); // Default fallback in rem
  const breakdownToggleRef = useRef<(() => void) | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Mobile detection
  const { isMobile } = useIsMobile();
  
  // Audio context for spacebar audio toggle
  const { playAudio } = useAudio();
  
  // Tooltip states
  const [isLeftArrowHovered, setIsLeftArrowHovered] = useState(false);
  const [isRightArrowHovered, setIsRightArrowHovered] = useState(false);
  
  // Button refs for tooltips
  const leftArrowButtonRef = useRef<HTMLButtonElement>(null);
  const rightArrowButtonRef = useRef<HTMLButtonElement>(null);

  // Measure container width when modal opens or resizes
  useEffect(() => {
    const measureWidth = () => {
      if (contentRef.current) {
        const widthPx = contentRef.current.offsetWidth;
        // Convert pixels to rem (assuming 16px = 1rem)
        const widthRem = widthPx / 16;
        // Account for padding and margins, use 90% of available width
        setContainerWidth(widthRem * 0.9);
      }
    };

    if (isOpen) {
      // Measure after a short delay to ensure DOM is rendered
      setTimeout(measureWidth, 100);
      
      // Add resize listener
      window.addEventListener('resize', measureWidth);
      return () => window.removeEventListener('resize', measureWidth);
    }
  }, [isOpen]);

  // Reset to first card and hide answer when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setShowAnswer(false);
    }
  }, [isOpen]);

  // Hide answer when navigating to different card
  useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  // Reset index when responses change (e.g., language switch)
  useEffect(() => {
    if (responses.length > 0 && currentIndex >= responses.length) {
      setCurrentIndex(0);
    }
  }, [responses, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? responses.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === responses.length - 1 ? 0 : prev + 1));
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const handleAudioToggle = async () => {
    const currentResponse = responses[currentIndex];
    if (currentResponse?.id) {
      try {
        await playAudio(
          currentResponse.id,
          null, // No cached audio for now
          prepareTextForSpeech(currentResponse.content),
          selectedLanguage,
          onLoadingChange,
          (error) => console.error('Audio error:', error)
        );
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    }
  };

  const handleBreakdownTrigger = () => {
    if (breakdownToggleRef.current) {
      breakdownToggleRef.current();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        case 'Shift':
          event.preventDefault();
          if (showAnswer) {
            handleAudioToggle();
          }
          break;
        case 'Enter':
          event.preventDefault();
          toggleAnswer();
          break;
        case '/':
          event.preventDefault();
          if (showAnswer) {
            handleBreakdownTrigger();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, handlePrevious, handleNext, toggleAnswer, handleAudioToggle, handleBreakdownTrigger, onClose, showAnswer]);

  if (!isOpen || responses.length === 0) return null;

  const currentResponse = responses[currentIndex];
  
  // Safety check: if currentResponse is undefined, close the modal
  if (!currentResponse) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-card border border-border rounded-sm w-[90vw] md:w-[450px] max-w-xl max-h-[90vh] flex flex-col relative">
        {/* Close button - positioned absolutely in top right */}
        <button
          onClick={onClose}
          className="absolute top-5 right-2 p-2 text-muted-foreground hover:text-card-foreground transition-colors duration-200 z-10"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col justify-center">
            <div className="flex-1 overflow-y-auto py-2" ref={contentRef}>
                <GPTResponse
                    key={`flashcard-${currentResponse.id}-${currentIndex}`}
                    response={currentResponse.content}
                    selectedDeckId="flashcard-mode"
                    selectedDeckTitle="flashcard"
                    reservedDeckTitles={[]}
                    responseId={currentResponse.id}
                    rank={currentResponse.rank}
                    createdAt={currentResponse.createdAt}
                    isPaused={currentResponse.isPaused}
                    decks={currentResponse.decks}
                    furigana={currentResponse.furigana}
                    isFuriganaEnabled={currentResponse.isFuriganaEnabled}
                    isPhoneticEnabled={currentResponse.isPhoneticEnabled}
                    isKanaEnabled={currentResponse.isKanaEnabled}
                    breakdown={currentResponse.breakdown}
                    mobileBreakdown={currentResponse.mobileBreakdown}
                    audio={currentResponse.audio}
                    audioMimeType={currentResponse.audioMimeType}
                    onRankUpdate={onRankUpdate}
                    onPauseToggle={onPauseToggle}
                    onFuriganaToggle={onFuriganaToggle}
                    onPhoneticToggle={onPhoneticToggle}
                    onKanaToggle={onKanaToggle}
                    selectedLanguage={selectedLanguage}
                    onLoadingChange={onLoadingChange}
                    hideContent={!showAnswer} // This is the key prop for flashcard mode
                    showAnswer={showAnswer}
                    onToggleAnswer={toggleAnswer}
                    onBreakdownToggle={breakdownToggleRef}
                    containerWidth={containerWidth}
                />
            </div>
        </div>

        {/* Navigation Footer - simplified like demo */}
        <div className="flex items-center justify-between px-4 py-1">
          {/* Previous button */}
          {!isMobile ? (
            <Tooltip
              content={
                <div>
                  <div className="text-white">Previous card</div>
                  <div className="text-gray-300 flex items-center gap-1">
                    <span className="text-sm">←</span>
                    <span>left arrow</span>
                  </div>
                </div>
              }
              isVisible={isLeftArrowHovered}
              buttonRef={leftArrowButtonRef}
            >
              <button
                ref={leftArrowButtonRef}
                onClick={handlePrevious}
                onMouseEnter={() => setIsLeftArrowHovered(true)}
                onMouseLeave={() => setIsLeftArrowHovered(false)}
                className="p-2 text-muted-foreground hover:text-card-foreground transition-colors duration-200"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handlePrevious}
              className="p-2 text-muted-foreground hover:text-card-foreground transition-colors duration-200"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}

          {/* Just the number indicator */}
          <div className="flex items-center">
            <span className="text-md text-card-foreground">
              {currentIndex + 1} / {responses.length}
            </span>
          </div>

          {/* Next button */}
          {!isMobile ? (
            <Tooltip
              content={
                <div>
                  <div className="text-white">Next card</div>
                  <div className="text-gray-300 flex items-center gap-1">
                    <span className="text-sm">→</span>
                    <span>right arrow</span>
                  </div>
                </div>
              }
              isVisible={isRightArrowHovered}
              buttonRef={rightArrowButtonRef}
            >
              <button
                ref={rightArrowButtonRef}
                onClick={handleNext}
                onMouseEnter={() => setIsRightArrowHovered(true)}
                onMouseLeave={() => setIsRightArrowHovered(false)}
                className="p-2 text-muted-foreground hover:text-card-foreground transition-colors duration-200"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handleNext}
              className="p-2 text-muted-foreground hover:text-card-foreground transition-colors duration-200"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 