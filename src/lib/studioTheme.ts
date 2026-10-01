// Content Studio theme scope
// The studio is a focused writing workspace: it always renders on the light
// "course platform" palette defined by `.studio-light`, independent of the
// public site's theme. Tokens are placed on <body> so portalled overlays
// (the article editor dialog, AI dialogs, dropdowns) pick them up too, and the
// root `dark` class is cleared so `dark:` variants inside the studio stay off.

export function applyStudioTheme(): () => void {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const hadDark = root.classList.contains("dark");
  root.classList.remove("dark");
  document.body.classList.add("studio-light");
  return () => {
    document.body.classList.remove("studio-light");
    if (hadDark) root.classList.add("dark");
  };
}