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
    // Call the Supabase RPC
    const { data, error } = await supabase
      .rpc('fuzzy_search_responses', {
        search_query: query,
        user_id: userId,
        language_code: languageCode
      });

    if (error) {
      throw error;
    }

    console.log('****data****', data);

    // Transform the results to match our SearchResult interface
    data.forEach((result: any) => {
      console.log('****result****', result);
    });

    // Use a Map to ensure unique responses by content
    const uniqueResponses = new Map();
    data.forEach((result: any) => {
      uniqueResponses.set(result.content, {
        id: result.id,
        content: result.content,
        rank: result.rank,
        createdAt: new Date(result.created_at),
        isPaused: result.is_paused,
        bookmarks: result.bookmarks || {}
      });
    });

    return Array.from(uniqueResponses.values());
  } catch (error) {
    console.error('Error in fuzzy search:', error);
    throw error;
  }
} 