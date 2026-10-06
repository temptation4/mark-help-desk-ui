import { saveSession } from "../lib/auth";
import { DEMO, demoSession } from "../lib/demo";

/**
 * POST /api/v1/auth/login or /register. Both return { token, email, expiresAt } on success and
 * { error } with a 4xx status on failure; the error text is safe to show to the user.
 * On success the session is saved, so the caller only has to navigate away.
 */
async function authenticate(action, email, password) {
  if (DEMO) { // hosted demo: any email and password gets in
    const session = demoSession(email);
    saveSession(session);
    return session;
  }

  const response = await fetch(`/api/v1/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Something went wrong. Please try again.");
  }

  saveSession(body);
  return body;
}

export const login = (email, password) => authenticate("login", email, password);
export const register = (email, password) => authenticate("register", email, password);
