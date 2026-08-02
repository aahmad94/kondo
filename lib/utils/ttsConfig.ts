/**
 * Shared ElevenLabs TTS configuration and client-side playback rates.
 *
 * Generation speed (ElevenLabs voice_settings.speed) range is 0.7–1.2.
 * Playback rates are applied in AudioContext so the same cached audio can
 * alternate between normal and slower on successive speaker clicks.
 */

/** ElevenLabs voice IDs by language code */
export function getElevenLabsVoiceId(language: string): string {
  switch (language) {
    case 'ja':
      return 'b34JylakFZPlGS0BnwyY'; // Japanese
    case 'ko':
      return 'z6Kj0hecH20CdetSElRT'; // Korean
    case 'es':
      return '2Lb1en5ujrODDIqmp7F3'; // Spanish
    case 'ar':
      return '21m00Tcm4TlvDq8ikWAM'; // Arabic
    case 'zh':
      return 'GgmlugwQ4LYXBbEXENWm'; // Chinese
    case 'ur':
      return '9cI5mhBtM4WtQ9Fo6jWQ'; // Urdu
    case 'vi':
      return 'RCmOaM1iiIH5xX3QXjIF'; // Vietnamese (Khanh Lam)
    default:
      return 'pNInz6obpgDQGcFmaJgB';
  }
}

/**
 * ElevenLabs generation speed for a language.
 * 1.0 = natural pace; lower is slower (min 0.7). Defaults favor learners.
 */
export function getElevenLabsSpeed(language: string): number {
  switch (language) {
    case 'ja':
      return 0.75;
    case 'vi':
      // Learner default: slowest ElevenLabs allows. The Vietnamese voice still
      // reads as fairly natural at this floor; extra slowdown on even-numbered
      // plays is handled client-side via playbackRate.
      return 0.7;
    default:
      return 0.7;
  }
}

/** Normal (odd) play rate relative to the generated audio. */
export const NORMAL_PLAYBACK_RATE = 1.0;

/** Slower (even) play rate — same audio, more deliberate for learners. */
export const SLOW_PLAYBACK_RATE = 0.8;

/**
 * Playback rates for a language. Vietnamese uses a slightly reduced "normal"
 * rate on top of the already-slow generation so the first listen is a bit
 * calmer than raw ElevenLabs output.
 */
export function getPlaybackRates(language: string): {
  normal: number;
  slow: number;
} {
  if (language === 'vi') {
    return {
      normal: 0.9,
      slow: 0.75,
    };
  }
  return {
    normal: NORMAL_PLAYBACK_RATE,
    slow: SLOW_PLAYBACK_RATE,
  };
}
