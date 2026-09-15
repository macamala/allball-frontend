import React, { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import { scrollToComments } from "../../lib/scrollToComments.js";

export default function ArticleCommentBar({ commentCount = 0 }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const section = document.getElementById("comments");
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHidden(Boolean(entry?.isIntersecting));
      },
      { rootMargin: "-72px 0px -35% 0px", threshold: 0.08 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <div className="article-comment-bar" role="navigation" aria-label={t("comments")}>
      <button
        type="button"
        className="comment-bar-btn"
        onClick={() => scrollToComments()}
      >
        {t("comments")} {commentCount}
      </button>
      <button
        type="button"
        className="comment-bar-btn is-primary"
        onClick={() => scrollToComments({ focusComposer: true })}
      >
        {t("comments.write")}
      </button>
    </div>
  );
}
