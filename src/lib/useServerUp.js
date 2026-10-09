import { useEffect, useState } from "react";
import { DEMO } from "./demo";

// Is the server behind `path` running? Mark only shows up while it is: a robot that cheerfully offers help when nothing can
// answer would be a lie. A network error or a 502/503/504 (what the dev proxy or a gateway sends when the server is down)
// means "down". The backend answers GET /api/v1/helpdesk/health with 200 and no login needed, so only a 200 counts as "up".
// Checked again every few seconds.

export function useServerUp(path) {
  const [up, setUp] = useState(DEMO); // not shown until the first check says yes (the hosted demo has no backend and is always "up")

  useEffect(() => {
    if (DEMO) return undefined;
    let stopped = false;
    let timer;
    const check = async () => {
      let reachable = false;
      try {
        const response = await fetch(path, { cache: "no-store" });
        reachable = response.ok;
      } catch {
        reachable = false;
      }
      if (stopped) return;
      setUp(reachable);
      timer = setTimeout(check, reachable ? 15000 : 4000); // look more often while waiting for it to start
    };
    check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [path]);

  return up;
}
