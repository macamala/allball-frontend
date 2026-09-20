import React from "react";

export default function FavoriteButton({ pressed, label, onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`score-star ${pressed ? "is-on" : ""} ${className}`.trim()}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {pressed ? "★" : "☆"}
    </button>
  );
}
