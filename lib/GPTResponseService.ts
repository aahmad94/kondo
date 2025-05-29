import prisma from './prisma';

type ValidRank = 1 | 2 | 3;

const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

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

export async function convertTextToSpeech(text: string, language: string, responseId?: string) {
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
    
    // Only check database if we have a responseId
    if (responseId) {
      const existingResponse = await prisma.gPTResponse.findUnique({
        where: { id: responseId },
        select: { audio: true, audioMimeType: true }
      });

      if (existingResponse?.audio && existingResponse?.audioMimeType) {
        // Return existing audio from database
        return {
          audio: existingResponse.audio,
          mimeType: existingResponse.audioMimeType
        };
      }
    }

    // Select voice model based on language
    const voiceId = (() => {
      switch (language) {
        case 'ja': return 'Mv8AjrYZCBkdsmDHNwcB'; // Japanese voice
        case 'ko': return 'z6Kj0hecH20CdetSElRT'; // Korean voice
        case 'es': return 'l1zE9xgNpUTaQCZzpNJa'; // Spanish voice
        case 'ar': return '21m00Tcm4TlvDq8ikWAM'; // Arabic voice
        case 'zh': return 'GgmlugwQ4LYXBbEXENWm'; // Chinese voice
        default: return 'pNInz6obpgDQGcFmaJgB';  // Default
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
          speed: 0.70,
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

    // Only save to database if we have a responseId and the response exists
    if (responseId) {
      const responseExists = await prisma.gPTResponse.findUnique({
        where: { id: responseId }
      });

      if (responseExists) {
        await prisma.gPTResponse.update({
          where: { id: responseId },
          data: {
            audio: audioBase64,
            audioMimeType: audioBlob.type
          }
        });
      }
    }

    return {
      audio: audioBase64,
      mimeType: audioBlob.type
    };
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw error;
  }
}

export async function getBreakdown(text: string, language: string, responseId?: string) {
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
      throw new Error('Could not extract content for breakdown');
    }

    const content = match[1].trim();
    
    // Only check database if we have a responseId
    if (responseId) {
      const existingResponse = await prisma.gPTResponse.findUnique({
        where: { id: responseId },
        select: { breakdown: true }
      });

      if (existingResponse?.breakdown) {
        // Return existing breakdown from database
        return existingResponse.breakdown;
      }
    }

    // Generate new breakdown
    const response = await fetch(`${appUrl}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: `* Breakdown the following phrase:\n\n${content}`,
        languageCode: language,
        model: 'gpt-4o-mini'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate breakdown');
    }

    const data = await response.json();
    const breakdown = data.result;

    // Only save to database if we have a responseId and the response exists
    if (responseId) {
      const responseExists = await prisma.gPTResponse.findUnique({
        where: { id: responseId }
      });

      if (responseExists) {
        await prisma.gPTResponse.update({
          where: { id: responseId },
          data: { breakdown }
        });
      }
    }

    return breakdown;
  } catch (error) {
    console.error('Error generating breakdown:', error);
    throw error;
  }
} 