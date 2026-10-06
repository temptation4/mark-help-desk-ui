import React from "react";
import { DEMO } from "../lib/demo";

// A small pill that says this is the hosted demo (canned answers), shown on every page in demo mode.
function DemoBadge() {
  if (!DEMO) return null;
  return (
    <a
      href="https://github.com/temptation4/mark-help-desk-ui#readme"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-3 left-3 z-40 rounded-full bg-foreground/85 px-3 py-1 text-xs font-medium text-background shadow hover:bg-foreground"
    >
      Demo mode: Mark is real, the answers are canned
    </a>
  );
}

export default DemoBadge;
