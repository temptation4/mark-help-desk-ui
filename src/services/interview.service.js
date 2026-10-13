import { authHeaders, handleUnauthorized } from "../lib/auth";
import { DEMO } from "../lib/demo";

/**
 * POST /api/v1/interview/files - uploads a file for Mark to read. `kind` is "resume", "job" (a job description) or
 * "other". The backend saves it in the uploads folder through the MCP file server (a PDF is turned into text first).
 *
 * Resolves with {fileName, savedAs, characters, note}; throws an Error whose message can be shown to the user.
 */
export async function uploadInterviewFile(file, kind) {
  if (DEMO) throw new Error("Uploads need the real backend: this demo cannot read or save files.");
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);

  // No Content-Type header: the browser adds it, with the boundary the multipart body needs.
  const response = await fetch("/api/v1/interview/files", { method: "POST", headers: authHeaders(), body: form });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Please log in again.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `The upload failed (status ${response.status}).`);
  }
  return body;
}

/**
 * POST /api/v1/jev/check - asks the backend to call Jev (through the Jev MCP server) with a fixed sample problem and no model in between.
 * Resolves with {ok: true, sample, category, urgency, suggestedPriority, tookMs}; throws an Error whose message says what is wrong
 * (the Jev server is not running, there is no API key, Jev did not answer).
 */
export async function checkJev() {
  if (DEMO) return { ok: true, sample: "The whole office has no internet", category: "network", urgency: 0.9, suggestedPriority: "URGENT", tookMs: 0, demo: true };

  const response = await fetch("/api/v1/jev/check", { method: "POST", headers: authHeaders() });
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Please log in again.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `The check failed (status ${response.status}).`);
  }
  return body;
}
