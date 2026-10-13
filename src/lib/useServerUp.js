import { useSyncExternalStore } from "react";
import { DEMO } from "./demo";

// Is the server behind `path` running? Mark only shows up while it is: a robot that cheerfully offers help when nothing can
// answer would be a lie. A network error or a 502/503/504 (what the dev proxy or a gateway sends when the server is down)
// means "down". The backend answers GET /api/v1/helpdesk/health with 200 and no login needed, so only a 200 counts as "up".
//
// One check is shared by every component that asks (and by React's double mount in development), and it does NOT poll while the
// server is up, so the browser's network tab stays quiet. It looks again only when:
//  - the page loads;
//  - the tab comes back into view or the browser goes back online;
//  - a request to the backend fails (see reportBackendUnreachable);
//  - the server is down: then every few seconds, but only while the tab is visible, to notice it starting.

const UNREACHABLE = "backend-unreachable";
const RETRY_WHEN_DOWN_MS = 4000;

/** Call this when a request to the backend failed: the check then runs right away. */
export function reportBackendUnreachable() {
  window.dispatchEvent(new Event(UNREACHABLE));
}

const stores = new Map(); // one per health URL

function createStore(path) {
  let up = DEMO; // not shown until the first check says yes (the hosted demo has no backend and is always "up")
  let inFlight = null;
  let timer;
  let watchers = 0;
  const listeners = new Set();

  const setUp = (value) => {
    if (up === value) return;
    up = value;
    listeners.forEach((listener) => listener());
  };

  // only one request at a time, however many callers ask
  const check = () => inFlight ?? (inFlight = (async () => {
    clearTimeout(timer);
    let reachable = false;
    try {
      reachable = (await fetch(path, { cache: "no-store" })).ok;
    } catch {
      reachable = false;
    }
    setUp(reachable);
    if (!reachable && watchers > 0) timer = setTimeout(retryWhileVisible, RETRY_WHEN_DOWN_MS);
  })().finally(() => { inFlight = null; }));

  const retryWhileVisible = () => (document.visibilityState === "visible" ? check() : (timer = setTimeout(retryWhileVisible, RETRY_WHEN_DOWN_MS)));
  const checkWhenVisible = () => document.visibilityState === "visible" && check();

  const start = () => {
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("online", check);
    window.addEventListener(UNREACHABLE, check);
    check();
  };
  const stop = () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", checkWhenVisible);
    window.removeEventListener("online", check);
    window.removeEventListener(UNREACHABLE, check);
  };

  return {
    getSnapshot: () => up,
    subscribe(listener) {
      listeners.add(listener);
      if (!DEMO && ++watchers === 1) start();
      return () => {
        listeners.delete(listener);
        if (!DEMO && --watchers === 0) stop();
      };
    },
  };
}

export function useServerUp(path) {
  if (!stores.has(path)) stores.set(path, createStore(path));
  const store = stores.get(path);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
