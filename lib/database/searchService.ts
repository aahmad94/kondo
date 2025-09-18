import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import prisma from './prisma';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SearchResult {
  id: string;
  content: string;
  rank: number;
  createdAt: Date;
  isPaused: boolean;
  furigana: string | null;
  isFuriganaEnabled: boolean;
  isPhoneticEnabled: boolean;
  isKanaEnabled: boolean;
  breakdown: string | null;
  mobileBreakdown: string | null;
  bookmarks: Record<string, string>;
  source?: 'local' | 'imported';
  communityResponseId?: string | null;
  communityResponse?: {
    id: string;
    isActive: boolean;
    creatorAlias: string;
  } | null;
  isSharedToCommunity?: boolean;
}

export async function fuzzySearchResponses(query: string, userId: string, languageCode: string): Promise<SearchResult[]> {
  try {
    let searchResults: any[] = [];

    // First try fuzzy search
    const { data: fuzzyData, error: fuzzyError } = await supabase
      .rpc('fuzzy_search_responses', {
        search_query: query,
        user_id: userId,
        language_code: languageCode
      });

    if (fuzzyError) {
      throw fuzzyError;
    }

    // If fuzzy search returns results, use them
    if (fuzzyData && fuzzyData.length > 0) {
      searchResults = fuzzyData;
    } else {
      // If no results from fuzzy search, try ILIKE search
      const { data: ilikeData, error: ilikeError } = await supabase
        .rpc('ilike_search_responses', {
          search_query: query,
          user_id: userId,
          language_code: languageCode
        });

      if (ilikeError) {
        throw ilikeError;
      }

      searchResults = ilikeData || [];
    }

    // If no results, return empty array
    if (searchResults.length === 0) {
      return [];
    }

    // Get response IDs to fetch community metadata
    const responseIds = searchResults.map((result: any) => result.id);

    // Fetch community metadata for these responses
    const responsesWithMetadata = await prisma.gPTResponse.findMany({
      where: {
        id: { in: responseIds }
      },
      select: {
        id: true,
        source: true,
        communityResponseId: true,
        communityResponse: {
          select: {
            id: true,
            isActive: true,
            creatorAlias: true
          }
        },
        originalCommunityPost: {
          select: {
            id: true,
            isActive: true
          }
        }
      }
    });

    // Create a map of response ID to community metadata
    const metadataMap = new Map();
    responsesWithMetadata.forEach(response => {
      const isSharedToCommunity = response.source === 'local' && response.originalCommunityPost?.isActive === true;
      metadataMap.set(response.id, {
        source: response.source,
        communityResponseId: response.communityResponseId,
        communityResponse: response.communityResponse,
        isSharedToCommunity
      });
    });

    // Transform and return results with community metadata
    return searchResults.map((result: any) => {
      const metadata = metadataMap.get(result.id) || {};
      return {
        id: result.id,
        content: result.content,
        rank: result.rank,
        createdAt: new Date(result.createdat),
        isPaused: result.ispaused,
        furigana: result.furigana || null,
        isFuriganaEnabled: result.isfuriganaenabled || false,
        isPhoneticEnabled: result.isphoneticenabled !== undefined ? result.isphoneticenabled : true,
        isKanaEnabled: result.iskanaenabled || false,
        breakdown: result.breakdown || null,
        mobileBreakdown: result.mobilebreakdown || null,
        decks: result.bookmarks || {},
        ...metadata
      };
    });
  } catch (error) {
    console.error('Error in search:', error);
    throw error;
  }
} 