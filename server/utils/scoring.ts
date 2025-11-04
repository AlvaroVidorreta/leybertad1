// Small, pluggable scoring helper. Keeps scoring logic isolated so it can be migrated to
// embeddings/semantic search later without touching route handlers.

export function computeScore(item: any, query: string) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return 0;
  let score = 0;

  try {
    const title = String(item.title || "").toLowerCase();
    const summary = String(item.summary || "").toLowerCase();

    // exact title match bonus
    if (title === q) score += 100;

    // presence of full query in title
    if (title.includes(q)) score += 50;

    // presence in summary
    if (summary.includes(q)) score += 10;

    // partial term matches: split query and boost for each term present
    const terms = q.split(/\s+/).filter(Boolean);
    for (const t of terms) {
      if (title.includes(t)) score += 8;
      if (summary.includes(t)) score += 2;
    }

    // small recency boost if item has a date-like field
    const dateStr = String(item.date || "");
    if (/^\d{8}$/.test(dateStr)) {
      const y = Number(dateStr.slice(0, 4));
      const m = Number(dateStr.slice(4, 6)) - 1;
      const d = Number(dateStr.slice(6, 8));
      const dt = new Date(y, m, d);
      const daysAgo = (Date.now() - dt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysAgo < 30) score += 10;
      else if (daysAgo < 365) score += 4;
    }
  } catch (e) {
    // ignore scoring errors and fall back silently
  }

  return score;
}
