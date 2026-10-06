// Sidebar conversation list + per-conversation message history, kept in
// localStorage. The backend only knows about chat memory *per conversationId*
// (for the LLM's own context) - it has no endpoint to list "all of a user's
// conversations", so the sidebar has to keep its own local record.
//
// Keys include the logged-in user's email, so two people sharing one browser
// each see only their own chats.

import { currentEmail } from "./auth";

const conversationsKey = () => `helpdesk.conversations.${currentEmail()}`;
const messagesKey = (conversationId) => `helpdesk.messages.${currentEmail()}.${conversationId}`;

export function loadConversations() {
  try {
    const raw = localStorage.getItem(conversationsKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(list) {
  localStorage.setItem(conversationsKey(), JSON.stringify(list));
}

/**
 * Creates the conversation if it's new, otherwise merges `patch` into it, and
 * always bumps it to the top (most-recently-active first). Returns the full,
 * updated list so callers can put it straight into state.
 */
export function upsertConversation(conversationId, patch) {
  const list = loadConversations();
  const index = list.findIndex((c) => c.id === conversationId);
  const existing = index >= 0 ? list[index] : { id: conversationId, title: "New chat", lastMessage: "" };
  const updated = { ...existing, ...patch, id: conversationId, updatedAt: Date.now() };

  if (index >= 0) {
    list[index] = updated;
  } else {
    list.unshift(updated);
  }

  list.sort((a, b) => b.updatedAt - a.updatedAt);
  saveConversations(list);
  return list;
}

export function loadMessages(conversationId) {
  try {
    const raw = localStorage.getItem(messagesKey(conversationId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMessages(conversationId, messages) {
  localStorage.setItem(messagesKey(conversationId), JSON.stringify(messages));
}

// Which agent each chat is using: "chat" (normal conversation, the default), "troubleshoot" or "interview".
const AGENT_IDS = ["troubleshoot", "interview"];
// Remembered per chat, so reopening a troubleshooting chat from the sidebar puts you back in it.
const agentKey = (conversationId) => `helpdesk.agent.${currentEmail()}.${conversationId}`;

export function loadAgent(conversationId) {
  try {
    const saved = localStorage.getItem(agentKey(conversationId));
    return AGENT_IDS.includes(saved) ? saved : "chat";
  } catch {
    return "chat";
  }
}

export function saveAgent(conversationId, agent) {
  localStorage.setItem(agentKey(conversationId), agent);
}
