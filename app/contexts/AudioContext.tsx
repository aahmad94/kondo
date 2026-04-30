'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { trackSpeakerClick } from '@/lib/analytics';

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
  getCachedAudio: (responseId: string) => { audio: string; mimeType: string } | null;
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
  
  // Local cache to store audio data by responseId for fast access
  const audioCacheRef = useRef<Map<string, { audio: string; mimeType: string }>>(new Map());

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentResponseId(null);
  }, []);
  
  const getCachedAudio = useCallback((responseId: string) => {
    return audioCacheRef.current.get(responseId) || null;
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
      // console.log('🎵 playAudio called:', { responseId, hasCachedAudio: !!cachedAudio, isPlaying, currentResponseId });

      // If already playing the same audio, pause it
      if (isPlaying && currentResponseId === responseId) {
        pauseAudio();
        return;
      }

      // If playing different audio, stop it first
      if (isPlaying) {
        // console.log('🛑 Stopping different audio');
        pauseAudio();
      }

      // Check local cache first (fastest option)
      const localCachedAudio = audioCacheRef.current.get(responseId);
      if (localCachedAudio) {
        // console.log('⚡ Using local cached audio - FASTEST PATH');
        cachedAudio = localCachedAudio;
      }

      // Handle cached audio (either from props or local cache) - no loading state needed since it's instantaneous
      if (cachedAudio) {
        // Cache hit: ask the server to record (and enforce) the quota BEFORE
        // playing. Free users over their daily TTS limit will get a 429 here
        // and see the upgrade prompt instead of hearing the cached audio.
        if (responseId) {
          try {
            const res = await fetch('/api/stripe/check-and-record-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feature: 'tts', responseId }),
            });
            if (res.status === 429) {
              const payload = await res.json().catch(() => ({}));
              window.dispatchEvent(
                new CustomEvent('kondo:quota-exceeded', {
                  detail: { context: payload?.message || "You've hit your daily audio limit" },
                }),
              );
              return;
            }
          } catch {
            // Network error — fall through and play the cached audio so we
            // don't punish the user for a flaky connection.
          }
        }

        // console.log('💾 Using cached audio - NO LOADING STATE');
        
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        try {
          // console.log('🔄 Converting base64 to audio URL...');
          const audioUrl = convertBase64ToAudioUrl(cachedAudio.audio, cachedAudio.mimeType);
          // console.log('✅ Audio URL created');
          
          audioRef.current.src = audioUrl;
          
          // Set playing state immediately for cached audio
          // console.log('🟢 Setting playing state immediately');
          setIsPlaying(true);
          setCurrentResponseId(responseId);

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            // console.log('🎵 Play promise created (non-blocking)');
            // Handle play promise without awaiting to avoid loading blip
            playPromise.catch((error) => {
              console.error('❌ Cached audio play error:', error);
              setIsPlaying(false);
              setCurrentResponseId(null);
              URL.revokeObjectURL(audioUrl);
              onError?.('Error playing cached audio');
              return;
            });
          }
          
          // console.log('📊 Tracking (Amplitude) speaker click...');
          await trackSpeakerClick(responseId);
          // console.log('✅ Cached audio setup complete');

          audioRef.current.onended = () => {
            // console.log('🔚 Cached audio ended');
            setIsPlaying(false);
            setCurrentResponseId(null);
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            console.log('❌ Cached audio error');
            setIsPlaying(false);
            setCurrentResponseId(null);
            URL.revokeObjectURL(audioUrl);
            onError?.('Error playing audio');
          };
        } catch (audioError) {
          console.error('❌ Error in cached audio setup:', audioError);
          setIsPlaying(false);
          setCurrentResponseId(null);
          onError?.('Error playing cached audio');
          return;
        }
        return;
      }

      // Generate new audio via API - only show loading for this path
      // console.log('🌐 No cached audio - fetching from API with loading state');
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

      // Cache the audio data locally for future use
      // console.log('💾 Caching audio data locally for future use');
      audioCacheRef.current.set(responseId, { audio: data.audio, mimeType: data.mimeType });

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
      console.error('❌ playAudio error:', error);
      onError?.(error.message || 'Failed to generate speech');
    } finally {
      // console.log('🔄 Setting loading to false');
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
    <AudioContext.Provider value={{ isPlaying, currentResponseId, playAudio, pauseAudio, getCachedAudio }}>
      {children}
    </AudioContext.Provider>
  );
}; 