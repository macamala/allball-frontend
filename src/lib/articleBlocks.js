export function heroMedia(article) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const hero = media.find((item) => item?.is_hero) || media[0];
  if (hero?.url) return hero;
  if (article?.image_url) {
    return {
      url: article.image_url,
      caption: "",
      is_hero: true,
      media_type: "image",
    };
  }
  return null;
}

export function resolveBlocks(article) {
  if (Array.isArray(article?.blocks) && article.blocks.length) {
    return article.blocks;
  }
  const text = article?.content || "";
  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((paragraph) => ({ type: "paragraph", text: paragraph }));
}
