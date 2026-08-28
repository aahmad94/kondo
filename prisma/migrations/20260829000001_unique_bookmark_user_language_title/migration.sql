-- Deduplicate raced default decks (prefer already-seeded, then oldest)
DELETE FROM "Bookmark"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "userId", "languageId", "title"
        ORDER BY "seedProvisionedAt" DESC NULLS LAST, "createdAt" ASC
      ) AS rn
    FROM "Bookmark"
  ) ranked
  WHERE rn > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_languageId_title_key" ON "Bookmark"("userId", "languageId", "title");
