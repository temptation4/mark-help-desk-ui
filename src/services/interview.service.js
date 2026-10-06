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
