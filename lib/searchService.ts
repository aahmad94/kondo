import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const prisma = new PrismaClient();

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
    // Get the language ID using Prisma
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true }
    });

    if (!language) {
      throw new Error('Language not found');
    }

    // Call the Supabase RPC
    const { data, error } = await supabase
      .rpc('fuzzy_search_responses', {
        search_query: query,
        user_id: userId,
        lang_id: language.id
      });

    if (error) {
      console.error('****error****', error);
      throw error;
    }

    // Transform the results to match our SearchResult interface
    return data.map((result: any) => ({
      id: result.id,
      content: result.content,
      rank: result.rank,
      createdAt: new Date(result.created_at),
      isPaused: result.is_paused,
      bookmarks: result.bookmarks || {}
    }));
  } catch (error) {
    console.error('Error in fuzzy search:', error);
    throw error;
  }
} 