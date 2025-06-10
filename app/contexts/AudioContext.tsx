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
          // Convert base64 to bytes using browser-compatible method
          const binaryString = atob(cachedAudio.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes], { type: cachedAudio.mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
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
        // Convert base64 to bytes using browser-compatible method
        const binaryString = atob(data.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: data.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
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