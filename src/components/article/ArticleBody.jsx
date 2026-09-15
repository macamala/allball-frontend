import React from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import { sanitizeText } from "../../lib/sanitize.js";
import { isPhotoCreditCaption } from "../../lib/articleBlocks.js";
import ArticleMediaBlock from "./ArticleMediaBlock.jsx";
import ArticleParagraph from "./ArticleParagraph.jsx";
import ArticleQuote from "./ArticleQuote.jsx";

export default function ArticleBody({ blocks = [], title }) {
  const { t } = useI18n();
  if (!blocks.length) {
    return (
      <div className="article-body">
        <ArticleParagraph text={t("article.updating")} />
      </div>
    );
  }

  return (
    <div className="article-body">
      {blocks.map((block, idx) => {
        const type = block?.type || "paragraph";
        if (type === "media") {
          if (block.is_hero) return null;
          return <ArticleMediaBlock key={`media-${idx}`} item={block} />;
        }
        if (type === "caption") {
          return null;
        }
        if (type === "related") {
          return null;
        }
        if (type === "quote") {
          return (
            <ArticleQuote
              key={`quote-${idx}`}
              text={sanitizeText(block.text, title)}
            />
          );
        }
        if (type === "heading") {
          const heading = sanitizeText(block.text, title);
          return heading ? (
            <h2 key={`heading-${idx}`} className="article-subhead">
              {heading}
            </h2>
          ) : null;
        }
        if (type === "list") {
          const items = (block.items || [])
            .map((item) => sanitizeText(item, title))
            .filter(Boolean);
          if (!items.length) return null;
          return (
            <ul key={`list-${idx}`} className="article-list">
              {items.map((item, itemIdx) => (
                <li key={`${idx}-${itemIdx}`}>{item}</li>
              ))}
            </ul>
          );
        }
        const text = sanitizeText(block.text, title);
        if (!text || isPhotoCreditCaption(text)) return null;
        return <ArticleParagraph key={`p-${idx}`} text={text} />;
      })}
    </div>
  );
}
