import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ArticleImage from "./ArticleImage.jsx";
import { MEDIA_KINDS } from "../lib/mediaKind.js";

afterEach(() => cleanup());

describe("ArticleImage hero failover", () => {
  it("switches to the article fallback when the preferred media URL fails", () => {
    render(
      <ArticleImage
        src="https://media.example/dead.jpg"
        fallbackSrc="https://media.example/good.jpg"
        alt="Story hero"
        mediaKind={MEDIA_KINDS.EDITORIAL_PHOTO}
        fallbackMediaKind={MEDIA_KINDS.EDITORIAL_PHOTO}
      />
    );
    const image = screen.getByRole("img", { name: "Story hero" });
    expect(image.getAttribute("src")).toBe("https://media.example/dead.jpg");
    fireEvent.error(image);
    expect(screen.getByRole("img", { name: "Story hero" }).getAttribute("src"))
      .toBe("https://media.example/good.jpg");
  });

  it("shows the fallback surface only after both image URLs fail", () => {
    const { container } = render(
      <ArticleImage
        src="https://media.example/dead.jpg"
        fallbackSrc="https://media.example/also-dead.jpg"
        alt="Story hero"
        mediaKind={MEDIA_KINDS.EDITORIAL_PHOTO}
      />
    );
    fireEvent.error(screen.getByRole("img", { name: "Story hero" }));
    fireEvent.error(screen.getByRole("img", { name: "Story hero" }));
    expect(screen.queryByRole("img", { name: "Story hero" })).toBeNull();
    expect(container.querySelector(".media-fallback")).toBeTruthy();
  });

  it("resets a previous image failure when a new article image arrives", async () => {
    const { container, rerender } = render(
      <ArticleImage
        src="https://media.example/dead.jpg"
        alt="Story hero"
        mediaKind={MEDIA_KINDS.EDITORIAL_PHOTO}
      />
    );
    fireEvent.error(screen.getByRole("img", { name: "Story hero" }));
    expect(container.querySelector(".media-fallback")).toBeTruthy();

    rerender(
      <ArticleImage
        src="https://media.example/new.jpg"
        alt="Story hero"
        mediaKind={MEDIA_KINDS.EDITORIAL_PHOTO}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Story hero" }).getAttribute("src"))
        .toBe("https://media.example/new.jpg");
    });
  });
});


it("falls back to the original CDN URL when an optimized width rewrite fails", () => {
  render(
    <ArticleImage
      src="https://cdn.example/photo.jpg?width=640"
      alt="Optimized hero"
      variant="card"
      mediaKind={MEDIA_KINDS.EDITORIAL_PHOTO}
    />
  );
  const optimized = screen.getByRole("img", { name: "Optimized hero" });
  expect(optimized.getAttribute("src")).toContain("width=800");
  fireEvent.error(optimized);
  expect(screen.getByRole("img", { name: "Optimized hero" }).getAttribute("src"))
    .toContain("width=640");
});
