import React from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import { IconComment } from "../MobileIcons.jsx";
import SaveButton from "../SaveButton.jsx";
import ShareButtons from "../ShareButtons.jsx";

export default function ArticleActions({
  article,
  commentCount = 0,
  onComments,
}) {
  const { t } = useI18n();
  if (!article) return null;
  return (
    <div className="article-action-row" aria-label={t("article.actions")}>
      <ShareButtons title={article.title} path={`/article/${article.slug}`} compact />
      <SaveButton article={article} compact />
      <button
        type="button"
        className="action-chip"
        onClick={onComments}
        aria-controls="comments"
      >
        <IconComment />
        <span>
          {t("comments")} {commentCount}
        </span>
      </button>
    </div>
  );
}
