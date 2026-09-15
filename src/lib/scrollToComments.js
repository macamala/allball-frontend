export function scrollToComments({ focusComposer = false } = {}) {
  const section = document.getElementById("comments");
  if (section?.scrollIntoView) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (!focusComposer) return;
  window.setTimeout(() => {
    const field =
      document.getElementById("article-comment-input") ||
      document.getElementById("comments-signin");
    if (field?.focus) field.focus();
  }, 280);
}
