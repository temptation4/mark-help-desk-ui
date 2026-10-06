import { authHeaders, handleUnauthorized } from "../lib/auth";

/**
 * POST /api/v1/helpdesk/stream - the backend takes the message as a raw text body
 * (not JSON) and the conversation id as a header, and returns a Flux<String> as a
 * plain chunked text/plain body (no SSE "data:" framing, just raw text arriving in
 * pieces).
 *
 * The path is relative on purpose: the Vite dev server proxies "/api" to the Spring
 * Boot backend (see vite.config.js), so the browser never makes a cross-origin
 * request and CORS is not needed for local dev.
 *
 * axios can't expose a partially received response body, so this uses fetch() and
 * reads the stream manually. `onChunk(fullTextSoFar)` is called after every chunk so
 * the caller can set it straight into state.
 *
 * `agent` is the agent the user selected: "chat" (normal conversation) or "troubleshoot"
 * (the support agent that can look up and open tickets). It travels in the Agent header.
 */
export async function streamMessagesToServer(message, conversationId, onChunk, agent = "chat") {
  const response = await fetch("/api/v1/helpdesk/stream", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      ConversationId: conversationId,
      Agent: agent,
      ...authHeaders(), // the login token; without it the backend answers 401
    },
    body: message,
  });

  // Token missing or expired: log in again.
  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }

  return full;
}
