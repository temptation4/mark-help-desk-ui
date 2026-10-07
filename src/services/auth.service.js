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

/**
 * GET /api/v1/auth/config: what the sign-in page needs to know. { googleClientId } is the public Google client id, or null when
 * Google sign-in is not set up on the server.
 */
export async function getAuthConfig() {
  if (DEMO) return { googleClientId: "demo" };
  const response = await fetch("/api/v1/auth/config");
  if (!response.ok) throw new Error("Could not read the sign-in settings.");
  return response.json();
}

/**
 * POST /api/v1/auth/google: signs in with the ID token Google gave the browser. The auth service checks it with Google's public keys and
 * answers like a normal login ({ token, email, expiresAt }), which is saved here too.
 */
export async function loginWithGoogle(credential) {
  if (DEMO) { // the hosted demo: a made-up Google user
    const session = demoSession("visitor@gmail.com");
    saveSession(session);
    return session;
  }
  const response = await fetch("/api/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Google sign-in failed. Please try again.");
  saveSession(body);
  return body;
}

export const login = (email, password) => authenticate("login", email, password);
export const register = (email, password) => authenticate("register", email, password);
