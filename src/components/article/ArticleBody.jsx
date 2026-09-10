import React from "react";
import { sanitizeText } from "../../lib/sanitize.js";
import ArticleMediaBlock from "./ArticleMediaBlock.jsx";
import ArticleParagraph from "./ArticleParagraph.jsx";
import ArticleQuote from "./ArticleQuote.jsx";
import InlineRelatedStory from "./InlineRelatedStory.jsx";

export default function ArticleBody({ blocks = [], title }) {
  if (!blocks.length) {
    return (
      <div className="article-body">
        <ArticleParagraph text="This NinkoSports story is being updated." />
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
        if (type === "related") {
          return (
            <InlineRelatedStory
              key={`related-${idx}`}
              article={block.article}
            />
          );
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
        return <ArticleParagraph key={`p-${idx}`} text={text} />;
      })}
    </div>
  );
}
