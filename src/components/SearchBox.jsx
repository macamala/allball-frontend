import React, { useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBox({
  value,
  onChange,
  compact = false,
  autoFocus = false,
}) {
  const id = useId();
  const navigate = useNavigate();
  const inputRef = useRef(null);

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
        Search NinkoSports
      </label>
      <input
        id={id}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search stories"
        autoComplete="off"
      />
      <button type="submit" className="search-submit">
        Search
      </button>
    </form>
  );
}
