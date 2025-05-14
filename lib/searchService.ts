import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SearchResult {
  id: string;
  content: string;
  rank: number;
  createdAt: Date;
  isPaused: boolean;
  bookmarks: Record<string, string>;
}

export async function fuzzySearchResponses(query: string, userId: string, languageCode: string): Promise<SearchResult[]> {
  try {
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

    // If fuzzy search returns results, return them
    if (fuzzyData && fuzzyData.length > 0) {
      return fuzzyData.map((result: any) => ({
        id: result.id,
        content: result.content,
        rank: result.rank,
        createdAt: new Date(result.createdat),
        isPaused: result.ispaused,
        bookmarks: result.bookmarks || {}
      }));
    }

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

    // Transform and return ILIKE results
    return ilikeData.map((result: any) => ({
      id: result.id,
      content: result.content,
      rank: result.rank,
      createdAt: new Date(result.createdat),
      isPaused: result.ispaused,
      bookmarks: result.bookmarks || {}
    }));
  } catch (error) {
    console.error('Error in search:', error);
    throw error;
  }
} 