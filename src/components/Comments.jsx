import React, { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getComments, sendJSON } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentForm({ onSubmit, placeholder, submitLabel, initial = "" }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();

  const submit = async (event) => {
    event.preventDefault();
    const next = text.trim();
    if (next.length < 2) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(next);
      setText("");
    } catch (err) {
      setError(err.detail || err.message || "Could not post comment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="comment-form" onSubmit={submit}>
      <label className="sr-only" htmlFor={fieldId}>
        {placeholder}
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        maxLength={1200}
        rows={3}
      />
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" className="btn" disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

function CommentItem({ comment, children, onReply, onLike, onEdit, onDelete, onReport }) {
  const { t } = useI18n();
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <li className="comment-item">
      <div className="comment-meta">
        <strong>{comment.author?.display_name || "Reader"}</strong>
        <time dateTime={comment.created_at}>{formatTime(comment.created_at)}</time>
      </div>
      {comment.deleted || comment.hidden ? (
        <p className="comment-body is-removed">This comment was removed.</p>
      ) : editing ? (
        <CommentForm
          initial={comment.body}
          placeholder={t("comments.placeholder")}
          submitLabel={t("comments.edit")}
          onSubmit={async (body) => {
            await onEdit(comment.id, body);
            setEditing(false);
          }}
        />
      ) : (
        <p className="comment-body">{comment.body}</p>
      )}
      <div className="comment-actions">
        <button type="button" onClick={() => onLike(comment.id)}>
          {t("comments.like")} {comment.like_count || 0}
        </button>
        {onReply ? (
          <button type="button" onClick={() => setReplyOpen((value) => !value)}>
            {t("comments.reply")}
          </button>
        ) : null}
        {comment.own ? (
          <>
            <button type="button" onClick={() => setEditing((value) => !value)}>
              {t("comments.edit")}
            </button>
            <button type="button" onClick={() => onDelete(comment.id)}>
              {t("comments.delete")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => onReport(comment.id)}>
            {t("comments.report")}
          </button>
        )}
      </div>
      {replyOpen && onReply ? (
        <CommentForm
          placeholder={t("comments.placeholder")}
          submitLabel={t("comments.reply")}
          onSubmit={async (body) => {
            await onReply(body, comment.id);
            setReplyOpen(false);
          }}
        />
      ) : null}
      {children}
    </li>
  );
}

export default function Comments({ slug }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [payload, setPayload] = useState({ count: 0, comments: [] });
  const [sort, setSort] = useState("newest");

  const load = async () => {
    const data = await getComments(slug);
    setPayload(data || { count: 0, comments: [] });
  };

  useEffect(() => {
    let cancelled = false;
    getComments(slug)
      .then((data) => {
        if (!cancelled) setPayload(data || { count: 0, comments: [] });
      })
      .catch(() => {
        if (!cancelled) setPayload({ count: 0, comments: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const comments = Array.isArray(payload) ? payload : payload.comments || [];
  const count = Array.isArray(payload) ? payload.length : payload.count || comments.length;

  const roots = useMemo(() => {
    const rows = [...comments];
    rows.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sort === "oldest" ? left - right : right - left;
    });
    return rows.filter((row) => !row.parent_id);
  }, [comments, sort]);

  const repliesFor = (id) => comments.filter((row) => row.parent_id === id);

  const post = async (body, parentId) => {
    await sendJSON(`/articles/${encodeURIComponent(slug)}/comments`, "POST", {
      body,
      parent_id: parentId || null,
    });
    await load();
  };

  const like = async (id) => {
    if (!user) return;
    await sendJSON(`/comments/${id}/like`, "POST");
    await load();
  };

  const edit = async (id, body) => {
    await sendJSON(`/comments/${id}`, "PATCH", { body });
    await load();
  };

  const remove = async (id) => {
    await sendJSON(`/comments/${id}`, "DELETE");
    await load();
  };

  const report = async (id) => {
    await sendJSON(`/comments/${id}/report`, "POST", { reason: "inappropriate" });
  };

  return (
    <section className="comments-panel" aria-label={t("comments")}>
      <div className="comments-heading">
        <h2>
          {t("comments")} · {t("comments.count", { n: count })}
        </h2>
        <div className="comment-sort">
          <button
            type="button"
            className={sort === "newest" ? "is-on" : ""}
            onClick={() => setSort("newest")}
          >
            {t("comments.newest")}
          </button>
          <button
            type="button"
            className={sort === "oldest" ? "is-on" : ""}
            onClick={() => setSort("oldest")}
          >
            {t("comments.oldest")}
          </button>
        </div>
      </div>
      {user ? (
        <CommentForm
          placeholder={t("comments.placeholder")}
          submitLabel={t("comments.post")}
          onSubmit={(body) => post(body)}
        />
      ) : (
        <p className="comments-signin">
          <Link to="/login">{t("comments.signIn")}</Link>
        </p>
      )}
      <ul className="comment-thread">
        {roots.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={user ? post : null}
            onLike={like}
            onEdit={edit}
            onDelete={remove}
            onReport={report}
          >
            {repliesFor(comment.id).length > 0 && (
              <ul className="comment-replies">
                {repliesFor(comment.id).map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onLike={like}
                    onEdit={edit}
                    onDelete={remove}
                    onReport={report}
                  />
                ))}
              </ul>
            )}
          </CommentItem>
        ))}
      </ul>
    </section>
  );
}
