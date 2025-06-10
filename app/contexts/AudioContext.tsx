'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { trackSpeakerClick } from '../../lib/amplitudeService';

interface AudioContextType {
  isPlaying: boolean;
  currentResponseId: string | null;
  playAudio: (
    responseId: string,
    cachedAudio: { audio: string; mimeType: string } | null,
    textToSpeak: string,
    selectedLanguage: string,
    onLoadingChange?: (loading: boolean) => void,
    onError?: (error: string) => void
  ) => Promise<void>;
  pauseAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

// Utility function to convert base64 audio to blob URL
const convertBase64ToAudioUrl = (base64Audio: string, mimeType: string): string => {
  // Convert base64 to bytes using browser-compatible method
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const audioBlob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(audioBlob);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentResponseId(null);
  }, []);

  const playAudio = useCallback(async (
    responseId: string,
    cachedAudio: { audio: string; mimeType: string } | null,
    textToSpeak: string,
    selectedLanguage: string,
    onLoadingChange?: (loading: boolean) => void,
    onError?: (error: string) => void
  ) => {
    try {
      // If already playing the same audio, pause it
      if (isPlaying && currentResponseId === responseId) {
        pauseAudio();
        return;
      }

      // If playing different audio, stop it first
      if (isPlaying) {
        pauseAudio();
      }

      // Handle cached audio
      if (cachedAudio) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        try {
          const audioUrl = convertBase64ToAudioUrl(cachedAudio.audio, cachedAudio.mimeType);
          
          audioRef.current.src = audioUrl;

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
          
          setIsPlaying(true);
          setCurrentResponseId(responseId);
          await trackSpeakerClick(responseId);

          audioRef.current.onended = () => {
            setIsPlaying(false);
            setCurrentResponseId(null);
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            setIsPlaying(false);
            setCurrentResponseId(null);
            URL.revokeObjectURL(audioUrl);
            onError?.('Error playing audio');
          };
        } catch (audioError) {
          onError?.('Error playing cached audio');
          return;
        }
        return;
      }

      // Generate new audio via API
      onLoadingChange?.(true);

      const res = await fetch('/api/textToSpeech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: textToSpeak,
          language: selectedLanguage,
          responseId: responseId
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      const data = await res.json();

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      try {
        const audioUrl = convertBase64ToAudioUrl(data.audio, data.mimeType);
        
        audioRef.current.src = audioUrl;

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        setIsPlaying(true);
        setCurrentResponseId(responseId);
        await trackSpeakerClick(responseId);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          setCurrentResponseId(null);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          setCurrentResponseId(null);
          URL.revokeObjectURL(audioUrl);
          onError?.('Error playing audio');
        };
      } catch (audioError) {
        onError?.('Error playing generated audio');
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to generate speech');
    } finally {
      onLoadingChange?.(false);
    }
  }, [isPlaying, currentResponseId, pauseAudio]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
    };
  }, []);

  return (
    <AudioContext.Provider value={{ isPlaying, currentResponseId, playAudio, pauseAudio }}>
      {children}
    </AudioContext.Provider>
  );
}; 