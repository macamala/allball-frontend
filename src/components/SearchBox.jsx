import React, { useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../context/I18nContext.jsx";

export default function SearchBox({
  value,
  onChange,
  compact = false,
  autoFocus = false,
}) {
  const id = useId();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const submit = (event) => {
    event.preventDefault();
    const q = (value || "").trim();
    if (!q) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form className={compact ? "search-box compact" : "search-box"} onSubmit={submit} role="search">
      <label className="sr-only" htmlFor={id}>
        {t("nav.search")}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("search.placeholder")}
        autoComplete="off"
      />
      <button type="submit" className="search-submit">
        {t("search.submit")}
      </button>
    </form>
  );
}
