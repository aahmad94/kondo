-- Updated search functions with furigana and phonetic support

DROP FUNCTION IF EXISTS fuzzy_search_responses(text,text,text);
CREATE OR REPLACE FUNCTION public.fuzzy_search_responses(
  search_query text,
  user_id text,
  language_code text
) RETURNS TABLE (
  id text,
  content text,
  rank integer,
  createdAt timestamptz,
  isPaused boolean,
  furigana text,
  isFuriganaEnabled boolean,
  isPhoneticEnabled boolean,
  isKanaEnabled boolean,
  bookmarks jsonb
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.content,
    r.rank,
    r."createdAt"::timestamptz,
    r."isPaused",
    r.furigana,
    r."isFuriganaEnabled",
    r."isPhoneticEnabled",
    r."isKanaEnabled",
    COALESCE(jsonb_object_agg(b.id, b.title) FILTER (WHERE b.id IS NOT NULL), '{}'::jsonb) AS bookmarks
  FROM "GPTResponse" r
  LEFT JOIN "_BookmarksToResponses" btr ON r.id = btr."B"
  LEFT JOIN "Bookmark" b ON btr."A" = b.id
  WHERE r."userId" = user_id
    AND r."languageId" = (
      SELECT l.id FROM "Language" l WHERE code = language_code
    )
    AND to_tsvector('simple', r.content) @@ to_tsquery('simple', search_query)
  GROUP BY r.id, r.content, r.rank, r."createdAt", r."isPaused", r.furigana, r."isFuriganaEnabled", r."isPhoneticEnabled", r."isKanaEnabled"
  ORDER BY ts_rank(to_tsvector('simple', r.content), to_tsquery('simple', search_query)) DESC
  LIMIT 10;
END;
$$;

DROP FUNCTION IF EXISTS ilike_search_responses(text,text,text);
CREATE OR REPLACE FUNCTION ilike_search_responses(
  search_query text,
  user_id text,
  language_code text
) RETURNS TABLE (
  id text,
  content text,
  rank integer,
  createdAt timestamptz,
  isPaused boolean,
  furigana text,
  isFuriganaEnabled boolean,
  isPhoneticEnabled boolean,
  isKanaEnabled boolean,
  bookmarks jsonb
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.content,
    r.rank,
    r."createdAt"::timestamptz,
    r."isPaused",
    r.furigana,
    r."isFuriganaEnabled",
    r."isPhoneticEnabled",
    r."isKanaEnabled",
    COALESCE(
      jsonb_object_agg(b.id, b.title) FILTER (WHERE b.id IS NOT NULL),
      '{}'::jsonb
    ) AS bookmarks
  FROM "GPTResponse" r
  LEFT JOIN "_BookmarksToResponses" btr ON r.id = btr."B"
  LEFT JOIN "Bookmark" b ON btr."A" = b.id
  WHERE r."userId" = user_id
    AND r."languageId" = (
      SELECT l.id FROM "Language" l WHERE code = language_code
    )
    AND r.content ILIKE '%' || search_query || '%'
  GROUP BY r.id, r.content, r.rank, r."createdAt", r."isPaused", r.furigana, r."isFuriganaEnabled", r."isPhoneticEnabled", r."isKanaEnabled"
  ORDER BY r."createdAt" DESC
  LIMIT 10;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.fuzzy_search_responses(search_query text, user_id text, language_code text) TO anon;
GRANT EXECUTE ON FUNCTION public.ilike_search_responses(search_query text, user_id text, language_code text) TO anon;
GRANT SELECT ON TABLE "GPTResponse" TO anon;
GRANT SELECT ON TABLE "Bookmark" TO anon;
GRANT SELECT ON TABLE "_BookmarksToResponses" TO anon;
GRANT SELECT ON TABLE "Language" TO anon;

-- Change function ownership if needed
ALTER FUNCTION public.fuzzy_search_responses(search_query text, user_id text, language_code text) OWNER TO postgres;
ALTER FUNCTION public.ilike_search_responses(search_query text, user_id text, language_code text) OWNER TO postgres; 