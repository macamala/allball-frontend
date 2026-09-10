import React from "react";

export default function ArticleQuote({ text }) {
  if (!text) return null;
  return <blockquote className="article-quote">{text}</blockquote>;
}
