import { loginPath } from "./demo";

// The logged-in user's session, kept in localStorage so a page refresh doesn't log them out.
//
// What is stored: { token, email, expiresAt } - exactly what POST /api/v1/auth/login returns.
// The token is a JWT; the backend checks its signature and expiry on every request, so
// the browser never has to be trusted about *who* the user is.

const SESSION_KEY = "helpdesk.session";

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    // Treat an expired token as "not logged in" instead of waiting for the server to say 401.
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getSession() !== null;
}

export function currentEmail() {
  return getSession()?.email ?? null;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/** Headers that prove who we are. Spread this into any request to the backend. */
export function authHeaders() {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

/**
 * Call when the backend answers 401 (token missing, expired or invalid): forget the session
 * and send the user to the login page.
 */
export function handleUnauthorized() {
  logout();
  window.location.assign(loginPath());
}
