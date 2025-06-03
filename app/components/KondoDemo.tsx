'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import GPTResponseDemo from './GPTResponseDemo';

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
}

export default function KondoDemo() {
  const [responses, setResponses] = useState<DemoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Load dummy data
    const loadDummyData = async () => {
      try {
        const response = await fetch('/assets/dummy_data.json');
        const data = await response.json();
        setResponses(data.responses);
      } catch (error) {
        console.error('Error loading dummy data:', error);
        // Fallback data if JSON fails to load
        setResponses([
          {
            id: 'demo-1',
            content: {
              japanese: '多くの言語のための学習資料を簡単に作成する',
              hiragana: 'おおくのげんごのためのがくしゅうしりょうをかんたんにさくせいする',
              romanized: 'Ooku no gengo no tame no gakushuu shiryou o kantan ni sakusei suru',
              english: 'Easily generate study material for many languages'
            },
            breakdown: 'This is a demo breakdown showing how grammar explanations work.',
            rank: 3,
            isPaused: false,
            createdAt: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDummyData();
  }, []);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % responses.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + responses.length) % responses.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center max-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="text-center h-screen flex items-center justify-center">
        <p className="text-gray-400">No demo data available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto h-screen flex flex-col">
      {/* Centered carousel and navigation */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {/* Demo header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Interactive Demo
          </h2>
          <p className="text-gray-300 text-sm max-w-xl">
            Try out the features below - hover and click through the icons for grammar and audio guides
          </p>
        </div>
        {/* Carousel navigation and GPT response */}
        <div className="relative flex items-center justify-center w-full max-w-2xl mx-auto">
          {/* Left arrow */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent hover:bg-transparent focus:bg-transparent"
            disabled={responses.length <= 1}
            aria-label="Previous"
          >
            <ChevronLeftIcon className="h-7 w-7" />
          </button>

          {/* GPT response - add horizontal padding so arrows never overlap */}
          <div className="flex-1 px-10 mx-auto">
            <div className="scale-95 md:scale-100">
              <GPTResponseDemo 
                key={responses[currentIndex].id}
                response={responses[currentIndex]} 
              />
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent hover:bg-transparent focus:bg-transparent"
            disabled={responses.length <= 1}
            aria-label="Next"
          >
            <ChevronRightIcon className="h-7 w-7" />
          </button>
        </div>

        {/* Dots navigation below GPT response */}
        <div className="flex items-center justify-center w-full mt-6 mb-2">
          <div className="flex items-center space-x-1">
            {responses.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full border transition-colors focus:outline-none ${
                  index === currentIndex
                    ? 'bg-white border-white'
                    : 'bg-gray-500 border-gray-400 hover:bg-gray-300'
                }`}
                aria-label={`Go to response ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 