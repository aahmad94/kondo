'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { trackSpeakerClick } from '@/lib/analytics';
import { getPlaybackRates } from '@/lib/utils/ttsConfig';

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

/** Prefer pitch-preserving slowdown when the browser supports it. */
const applyPlaybackRate = (audio: HTMLAudioElement, rate: number) => {
  audio.playbackRate = rate;
  // Chromium / WebKit: keep pitch stable when slowing down for learners
  if ('preservesPitch' in audio) {
    (audio as HTMLMediaElement & { preservesPitch: boolean }).preservesPitch = true;
  }
  if ('webkitPreservesPitch' in audio) {
    (audio as HTMLMediaElement & { webkitPreservesPitch: boolean }).webkitPreservesPitch = true;
  }
  if ('mozPreservesPitch' in audio) {
    (audio as HTMLMediaElement & { mozPreservesPitch: boolean }).mozPreservesPitch = true;
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Local cache to store audio data by responseId for fast access
  const audioCacheRef = useRef<Map<string, { audio: string; mimeType: string }>>(new Map());

  // Per-response: whether the *next* successful play should use the slow rate.
  // Starts false → first click is normal; then alternates slow → normal → slow…
  const nextPlayShouldBeSlowRef = useRef<Map<string, boolean>>(new Map());

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

  /**
   * Peek the rate for this response without advancing the toggle.
   * Call commitPlaybackRateToggle only after playback successfully starts.
   */
  const peekPlaybackRate = useCallback((responseId: string, language: string): number => {
    const { normal, slow } = getPlaybackRates(language);
    const playSlow = nextPlayShouldBeSlowRef.current.get(responseId) ?? false;
    return playSlow ? slow : normal;
  }, []);

  const commitPlaybackRateToggle = useCallback((responseId: string) => {
    const playSlow = nextPlayShouldBeSlowRef.current.get(responseId) ?? false;
    // Flip for the next speaker click on this response.
    nextPlayShouldBeSlowRef.current.set(responseId, !playSlow);
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
      // If already playing the same audio, pause it (do not flip speed toggle)
      if (isPlaying && currentResponseId === responseId) {
        pauseAudio();
        return;
      }

      // If playing different audio, stop it first
      if (isPlaying) {
        pauseAudio();
      }

      // Check local cache first (fastest option)
      const localCachedAudio = audioCacheRef.current.get(responseId);
      if (localCachedAudio) {
        cachedAudio = localCachedAudio;
      }

      const playbackRate = peekPlaybackRate(responseId, selectedLanguage);

      // Handle cached audio (either from props or local cache) - no loading state needed since it's instantaneous
      if (cachedAudio) {
        // Fire-and-forget: record the usage on the server but don't block
        // playback on the round-trip. Free users over quota may briefly hear
        // one extra cached audio; the trade-off is instant playback.
        if (responseId) {
          fetch('/api/stripe/check-and-record-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature: 'tts', responseId }),
          }).catch(() => {});
        }

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        try {
          const audioUrl = convertBase64ToAudioUrl(cachedAudio.audio, cachedAudio.mimeType);

          audioRef.current.src = audioUrl;
          applyPlaybackRate(audioRef.current, playbackRate);

          // Set playing state immediately for cached audio
          setIsPlaying(true);
          setCurrentResponseId(responseId);
          commitPlaybackRateToggle(responseId);

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
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

          await trackSpeakerClick(responseId);

          audioRef.current.onended = () => {
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
      audioCacheRef.current.set(responseId, { audio: data.audio, mimeType: data.mimeType });

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      try {
        const audioUrl = convertBase64ToAudioUrl(data.audio, data.mimeType);

        audioRef.current.src = audioUrl;
        applyPlaybackRate(audioRef.current, playbackRate);

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        setIsPlaying(true);
        setCurrentResponseId(responseId);
        commitPlaybackRateToggle(responseId);
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
      onLoadingChange?.(false);
    }
  }, [isPlaying, currentResponseId, pauseAudio, peekPlaybackRate, commitPlaybackRateToggle]);

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
