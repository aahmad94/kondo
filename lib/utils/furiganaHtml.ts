const ALLOWED_TAGS = new Set(['ruby', 'rt', 'rp', 'rb']);

/**
 * Furigana is injected as HTML inside a large, pre-wrapped line.
 * Only a single-line ruby fragment is safe to render. Study-card text,
 * markdown fences, and any other markup are rejected.
 */
export function normalizeFuriganaHtml(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let text = raw.trim();
  if (!text) return null;

  const fenced = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  if (!text.includes('<ruby') && text.includes('&lt;ruby')) {
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  const rubyAt = text.search(/<ruby\b/i);
  if (rubyAt === -1) return plainKanaFurigana(text);

  text = text.slice(rubyAt).replace(/[\r\n]+/g, '');
  text = text.replace(/<\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (full, name: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    return /^<\s*\//.test(full) ? `</${tag}>` : `<${tag}>`;
  });

  if (text.length > 2000) return null;
  if (!/<ruby>[\s\S]*?<rt>[\s\S]+?<\/rt>[\s\S]*?<\/ruby>/.test(text)) return null;

  const leftover = text.replace(/<\/?(?:ruby|rt|rp|rb)>/g, '');
  // A study card or an English explanation mixed into the phrase must not render.
  if (/[<>]/.test(leftover) || /[A-Za-z]{3,}/.test(leftover) || /\d+\s*\//.test(leftover)) {
    return null;
  }

  return text;
}

function plainKanaFurigana(text: string): string | null {
  const plain = text.replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, '').trim();
  if (!plain || plain.length > 500) return null;
  if (/[\u4e00-\u9faf]/.test(plain)) return null;
  if (/[A-Za-z]{3,}|\d+\s*\/|[<>]/.test(plain)) return null;
  return plain;
}

/** Cached clarification furigana is a JSON array of one fragment per expression. */
export function normalizeFuriganaArray(raw: string | null | undefined): string[] | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const items: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') return null;
    const normalized = normalizeFuriganaHtml(item);
    if (!normalized) return null;
    items.push(normalized);
  }
  return items;
}
