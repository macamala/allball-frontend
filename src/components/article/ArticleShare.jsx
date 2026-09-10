import React from "react";
import ShareButtons from "../ShareButtons.jsx";

export default function ArticleShare({ title, path }) {
  return <ShareButtons title={title} path={path} />;
}
