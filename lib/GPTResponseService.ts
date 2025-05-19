import prisma from './prisma';

type ValidRank = 1 | 2 | 3;

export async function updateGPTResponseRank(gptResponseId: string, rank: number) {
  // Validate rank
  if (![1, 2, 3].includes(rank)) {
    throw new Error('Invalid rank value. Rank must be 1, 2, or 3.');
  }

  try {
    const updatedResponse = await prisma.gPTResponse.update({
      where: {
        id: gptResponseId,
      },
      data: {
        rank: rank as ValidRank,
      },
    });

    return updatedResponse;
  } catch (error) {
    console.error('Error updating GPT response rank:', error);
    throw error;
  }
}

export async function getUserResponses(userId: string) {
  try {
    const responses = await prisma.gPTResponse.findMany({
      where: {
        userId: userId,
        NOT: {
          bookmarks: {
            some: {
              title: 'daily summary'
            }
          }
        }
      },
      orderBy: [
        { rank: 'desc' },     // Higher ranks first
        { createdAt: 'asc' }  // Newly created items (later date) with same rank are futher down
      ],
      select: {
        id: true,
        content: true,
        rank: true,
        createdAt: true
      }
    });

    return responses;
  } catch (error) {
    console.error('Error fetching user responses:', error);
    throw error;
  }
}

export async function toggleResponsePause(responseId: string, isPaused: boolean) {
  if (!responseId) {
    throw new Error('Response ID is required');
  }

  if (typeof isPaused !== 'boolean') {
    throw new Error('isPaused must be a boolean value');
  }

  try {
    // Check if the response exists
    const response = await prisma.gPTResponse.findUnique({
      where: { id: responseId }
    });

    if (!response) {
      throw new Error('Response not found');
    }

    // Update the response's isPaused status
    const updatedResponse = await prisma.gPTResponse.update({
      where: { id: responseId },
      data: { isPaused },
      select: { id: true, isPaused: true }
    });

    return updatedResponse;
  } catch (error) {
    console.error('Error toggling response pause state:', error);
    throw error;
  }
}

export async function getUserResponseStats(userId: string) {
  try {
    // First, get all responses without any filtering
    const allResponses = await prisma.gPTResponse.findMany({
      where: {
        userId: userId
      },
      select: {
        rank: true,
        bookmarks: {
          select: {
            title: true
          }
        }
      }
    });

    const total = allResponses.length;
    const rank1 = allResponses.filter(r => r.rank === 1).length;
    const rank2 = allResponses.filter(r => r.rank === 2).length;
    const rank3 = allResponses.filter(r => r.rank === 3).length;

    const stats = {
      total,
      rank1: {
        count: rank1,
        percentage: total > 0 ? Math.round((rank1 / total) * 100) : 0
      },
      rank2: {
        count: rank2,
        percentage: total > 0 ? Math.round((rank2 / total) * 100) : 0
      },
      rank3: {
        count: rank3,
        percentage: total > 0 ? Math.round((rank3 / total) * 100) : 0
      }
    };

    return stats;
  } catch (error) {
    console.error('Error fetching user response stats:', error);
    throw error;
  }
}

export async function convertTextToSpeech(text: string, language: string) {
  if (!text) {
    throw new Error('Text content is required');
  }

  if (!language) {
    throw new Error('Language is required');
  }

  try {
    // Extract content between 1/ and 2/ using regex
    const match = text.match(/1\/\s*([\s\S]*?)\s*2\//);
    if (!match || !match[1]) {
      throw new Error('Could not extract content for text-to-speech');
    }

    const content = match[1].trim();
    
    // Select voice model based on language
    const voiceId = (() => {
      switch (language) {
        case 'ja': return 'pNInz6obpgDQGcFmaJgB'; // Japanese voice
        case 'ko': return '21m00Tcm4TlvDq8ikWAM'; // Korean voice
        case 'es': return '21m00Tcm4TlvDq8ikWAM'; // Spanish voice
        case 'ar': return '21m00Tcm4TlvDq8ikWAM'; // Arabic voice
        default: return 'pNInz6obpgDQGcFmaJgB';  // Default to Japanese
      }
    })();

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: JSON.stringify({
        text: content,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,        // Increased from 0.5 for more stable/slower speech
          similarity_boost: 0.5,  // Decreased from 0.75 to allow for slower pacing
          style: 0.0,            // Added style parameter
          use_speaker_boost: true // Added speaker boost for clarity
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to convert text to speech');
    }

    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw error;
  }
} 