import prisma from '../database/prisma';
import { gateDailyResponseFeature } from '../stripe/subscriptionService';
import { getElevenLabsSpeed, getElevenLabsVoiceId } from '../utils/ttsConfig';

/**
 * Gets or generates audio for a community response with caching.
 *
 * Quota: counts at most once per (userId, communityResponseId) per UTC day.
 * Cache hits still record a consumption row so revisiting on a later day
 * counts again. Throws QuotaExceededError if the user is maxed out today.
 */
export async function getCommunityAudio(
  communityResponseId: string,
  text: string,
  language: string,
  userId?: string,
) {
  if (!communityResponseId) {
    throw new Error('Community response ID is required');
  }

  if (!text) {
    throw new Error('Text content is required');
  }

  if (!language) {
    throw new Error('Language is required');
  }

  const { commit: commitQuota } = await gateDailyResponseFeature('tts', userId, communityResponseId);

  try {
    // First, check if we already have the audio cached
    const existingCommunityResponse = await prisma.communityResponse.findUnique({
      where: { id: communityResponseId },
      select: {
        audio: true,
        audioMimeType: true
      }
    });

    if (!existingCommunityResponse) {
      throw new Error('Community response not found');
    }

    // DB cache hit: no ElevenLabs call needed. Still call commitQuota() so
    // this access counts toward today's quota — the gate above already
    // enforced free-user limits and the dedup logic ensures we count at most
    // once per (user, communityResponseId, day). The client-side
    // /api/stripe/check-and-record-usage path handles the parallel case
    // where the client short-circuits this endpoint entirely.
    if (existingCommunityResponse.audio && existingCommunityResponse.audioMimeType) {
      await commitQuota();
      return {
        audio: existingCommunityResponse.audio,
        mimeType: existingCommunityResponse.audioMimeType
      };
    }

    // Generate new audio since we don't have it cached
    const audioResult = await generateCommunityAudio(text, language);

    // Update the community response with the new audio
    await prisma.communityResponse.update({
      where: { id: communityResponseId },
      data: {
        audio: audioResult.audio,
        audioMimeType: audioResult.mimeType
      }
    });

    await commitQuota();
    return audioResult;
  } catch (error) {
    console.error('Error getting community audio:', error);
    throw error;
  }
}

/**
 * Generates audio for community response content using ElevenLabs
 */
async function generateCommunityAudio(
  text: string,
  language: string
): Promise<{ audio: string; mimeType: string }> {
  try {
    const voiceId = getElevenLabsVoiceId(language);
    const speed = getElevenLabsSpeed(language);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          speed,
          stability: 0.50,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to convert text to speech');
    }

    const audioBlob = await response.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

    return {
      audio: audioBase64,
      mimeType: audioBlob.type
    };
  } catch (error) {
    console.error('Error generating community audio:', error);
    throw error;
  }
}
