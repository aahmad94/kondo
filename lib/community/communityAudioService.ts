import prisma from '../database/prisma';

/**
 * Gets or generates audio for a community response with caching
 */
export async function getCommunityAudio(
  communityResponseId: string, 
  text: string,
  language: string
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

    // If we already have cached audio, return it
    if (existingCommunityResponse.audio && existingCommunityResponse.audioMimeType) {
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
    // Select voice model based on language (same as GPTResponse)
    const voiceId = (() => {
      switch (language) {
        case 'ja': return 'b34JylakFZPlGS0BnwyY'; // Japanese voice
        case 'ko': return 'z6Kj0hecH20CdetSElRT'; // Korean voice
        case 'es': return '2Lb1en5ujrODDIqmp7F3'; // Spanish voice
        case 'ar': return '21m00Tcm4TlvDq8ikWAM'; // Arabic voice
        case 'zh': return 'GgmlugwQ4LYXBbEXENWm'; // Chinese voice
        default: return 'pNInz6obpgDQGcFmaJgB';  // Default
      }
    })();

    let speed = 0.70;
    if (language === 'ja') {
      speed = 0.75;
    }

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
