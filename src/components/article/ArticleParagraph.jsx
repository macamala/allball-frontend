import React from "react";

export default function ArticleParagraph({ text }) {
  if (!text) return null;
  return <p className="article-paragraph">{text}</p>;
}
