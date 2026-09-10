import { CANONICAL_SITE } from "../labels.js";

function upsertMeta(attrName, attrValue, content) {
  if (!content) return;
  const selector = `meta[${attrName}="${attrValue}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setJsonLd(id, payload) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!payload) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
}

export function setPageSeo({
  title,
  description,
  path = "/",
  type = "website",
  image,
  jsonLd,
}) {
  const canonical = `${CANONICAL_SITE}${path}`;
  document.title = title;
  setCanonical(canonical);
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:site_name", "NinkoSports");
  if (image) upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  if (image) upsertMeta("name", "twitter:image", image);
  setJsonLd("ninko-jsonld", jsonLd);
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NinkoSports",
    url: CANONICAL_SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: `${CANONICAL_SITE}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${CANONICAL_SITE}${item.path}`,
    })),
  };
}

export function articleJsonLd(article, path) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.published_at || article.created_at,
    dateModified: article.published_at || article.created_at,
    image: article.image_url ? [article.image_url] : undefined,
    publisher: {
      "@type": "Organization",
      name: "NinkoSports",
      url: CANONICAL_SITE,
    },
    mainEntityOfPage: `${CANONICAL_SITE}${path}`,
    description: article.summary || article.title,
  };
}

export function redirectWwwToApex() {
  if (typeof window === "undefined") return;
  if (window.location.hostname === "www.ninkosports.com") {
    const next = `${CANONICAL_SITE}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(next);
  }
}
