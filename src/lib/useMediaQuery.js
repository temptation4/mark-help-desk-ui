import { useSyncExternalStore } from "react";

/** True while the browser window matches a CSS media query, e.g. useMediaQuery("(min-width: 1024px)"). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
