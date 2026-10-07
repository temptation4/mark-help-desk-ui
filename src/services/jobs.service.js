import { authHeaders, handleUnauthorized } from "../lib/auth";
import { DEMO, demoJobsRequest } from "../lib/demo";

/**
 * The Jobs screen's calls to the help desk (/api/v1/jobs/*). Reading is simple; approving a draft application and saying "I applied" are the
 * user's own decisions, so they are only here, behind buttons: the AI cannot do either.
 * Every call resolves with parsed JSON, or throws an Error whose message can be shown to the user.
 */
async function request(method, path) {
  if (DEMO) return demoJobsRequest(method, path); // the hosted demo has no backend
  const response = await fetch(`/api/v1/jobs${path}`, { method, headers: authHeaders() });
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Please log in again.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `The request failed (status ${response.status}).`);
  return body;
}

/** { enabled, available, sources: [{ id, label, connected, howToConnect }] } */
export const getJobsStatus = () => request("GET", "/status");

/** The user's applications: [{ id, jobTitle, company, applyUrl, coverNote, status: DRAFT | APPROVED | APPLIED, ... }] */
export const getApplications = () => request("GET", "/applications");

/** The user has read the draft and approves it. */
export const approveApplication = (id) => request("POST", `/applications/${encodeURIComponent(id)}/approve`);

/** The user says they submitted the application on the job site. */
export const markApplied = (id) => request("POST", `/applications/${encodeURIComponent(id)}/applied`);
