/** Homepage exact-ID dedupe. Higher-priority modules consume IDs first. */

export function uniqueArticles(articles = [], seen) {
  const out = [];
  const used = seen || new Set();
  for (const article of articles) {
    if (!article || article.id == null) continue;
    if (used.has(article.id)) continue;
    used.add(article.id);
    out.push(article);
  }
  return out;
}

export function composeHomeModules(data = {}) {
  const seen = new Set();
  const featured = uniqueArticles(data.featured || [], seen);
  const breaking = uniqueArticles(data.breaking || [], seen);
  const latest = uniqueArticles(data.latest || [], seen);
  const heroId = featured[0]?.id;
  const mostReadRaw = data.most_read || [];
  const mostReadOthers = mostReadRaw.filter((row) => row && row.id !== heroId);
  const mostRead = uniqueArticles(mostReadOthers.length ? mostReadOthers : mostReadRaw);
  const prominent = new Set([...featured, ...breaking].map((row) => row.id));
  const bySport = {};
  Object.entries(data.by_sport || {}).forEach(([sport, rows]) => {
    const items = uniqueArticles(rows || [], new Set(prominent));
    if (items.length) bySport[sport] = items;
  });
  const byLeague = (data.by_league || [])
    .map((group) => ({
      ...group,
      articles: uniqueArticles(group.articles || [], new Set(prominent)),
    }))
    .filter((group) => group.articles.length);
  return { featured, breaking, latest, mostRead, bySport, byLeague, seen };
}
