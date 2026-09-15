import React from "react";

function Svg({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.2-3.2" />
    </Svg>
  );
}

export function IconMenu(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconHome(props) {
  return (
    <Svg {...props}>
      <path d="M4 11.5L12 5l8 6.5" />
      <path d="M7 10.5V19h10v-8.5" />
    </Svg>
  );
}

export function IconFootball(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4l2.4 4.2L19 9.2l-3.2 3.4.6 4.7L12 15.6 7.6 17.3l.6-4.7L5 9.2l4.6-1 2.4-4.2z" />
    </Svg>
  );
}

export function IconBasketball(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.8 9.5c4.4 1 8.8 1 14.4 0M4.8 14.5c4.4-1 8.8-1 14.4 0" />
      <path d="M12 4c2.2 2.6 2.2 13.4 0 16M12 4c-2.2 2.6-2.2 13.4 0 16" />
    </Svg>
  );
}

export function IconLive(props) {
  return (
    <Svg {...props}>
      <path d="M5 12a7 7 0 0 1 14 0" />
      <path d="M8 12a4 4 0 0 1 8 0" />
      <circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconShare(props) {
  return (
    <Svg width="18" height="18" {...props}>
      <circle cx="18" cy="5" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M8 12.8l7.4 5.2M8 11.2l7.4-5.2" />
    </Svg>
  );
}

export function IconBookmark(props) {
  return (
    <Svg width="18" height="18" {...props}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1z" />
    </Svg>
  );
}

export function IconComment(props) {
  return (
    <Svg width="18" height="18" {...props}>
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </Svg>
  );
}
