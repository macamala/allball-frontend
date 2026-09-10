export function isPremiumArticle(article) {
  return article?.quality_ok !== false && article?.sport_match_ok !== false;
}

export function premiumFirst(articles = []) {
  const premium = [];
  const rest = [];
  articles.forEach((article) => {
    if (isPremiumArticle(article)) premium.push(article);
    else rest.push(article);
  });
  return { premium, rest };
}
