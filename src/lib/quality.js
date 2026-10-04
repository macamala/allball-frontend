import { isPublisherBranding } from './newsMedia.js';
export function isPremiumArticle(article) {
  return !isPublisherBranding(article?.image_url) && article?.quality_ok !== false && article?.sport_match_ok !== false;
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
