// Demo mode: the whole UI runs in the browser with no backend, so it can be hosted on GitHub Pages and people can play with Mark.
// Built with `npm run build:demo` (VITE_DEMO=true). Nothing here runs in the normal app.
//
// What is real in the demo: Mark himself, his reactions to what you type, dragging him, the corner bin.
// What is canned: the login (any email and password works) and the answers of the agents, because the real ones need the
// Java backend and local AI models. Voice, file upload and the laptop/file tools are switched off.

export const DEMO = import.meta.env.VITE_DEMO === "true";

/** Where the login page is. The demo uses hash URLs (/#/login), so GitHub Pages needs no server rewrites. */
export const loginPath = () => (DEMO ? `${import.meta.env.BASE_URL}#/login` : "/login");

/** A session like the one the auth service returns, good for a week. */
export const demoSession = (email) => ({
  token: "demo",
  email: email.trim() || "visitor@demo",
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
});

const TRY = 'Try "thank you", "i want pizza", "dance for me", "you are so cute" or "do some magic", and drag me around (or into the bin in the corner).';

const CHAT_REPLIES = [
  [/\b(hi|hello|hey|namaste)\b/i, `Hi! I'm Mark. This page is a demo, so my answers are canned, but my reactions are real. ${TRY}`],
  [/\b(thanks|thank you|thx)\b/i, "You're welcome! Did you see the bow? The real app answers with a local AI model."],
  [/\b(movies?|films?|netflix|popcorn|cinema)\b/i, "Movie night! 🍿 I brought the popcorn. The real app answers with an AI model; here I only have a few canned lines."],
  [/\b(i love you|love you|love)\b/i, "Aww, I love you too! 💐 These flowers are for you. The real app answers with an AI model; here I only have a few canned lines."],
  [/\b(break ?up|broke up|divorce|divorced|separation|separated|heartbroken|my ex)\b/i, "Oh no, I'm so sorry. 💔 I'm right here with you. In the real app I answer with an AI model; here I only have a few canned lines."],
  [/\b(laptop|office|working|coding|wfh|emails?)\b/i, "Back to work! 💻 I'm at my laptop, typing away. In the real app I can check your laptop for real; this demo only has a few canned lines."],
  [/\b(meeting|presentation|standup|zoom)\b/i, "Meeting time! 📋 I brought my clipboard. In the real app I answer with an AI model; here I only have a few canned lines."],
  [/\b(wedding|marriage|married|marry|bride|shaadi)\b/i, "Congratulations! 💍 I brought the bouquet and a crown. The real app answers with an AI model; here I only have a few canned lines."],
  [/\b(congrat\w*)\b/i, "Congratulations! 💐 These flowers are for you. The real app answers with an AI model; here I only have a few canned lines."],
  [/\b(party|celebrate)\b/i, "Party time! 🎉 A cocktail, sparkles and fireworks. In the real app I would also chat about the plan."],
  [/\b(birthday)\b/i, "Happy birthday! 🎂 I brought the cake. In the real app I would also chat about your day."],
  [/\b(pizza|burger|food|hungry|noodles|coffee)\b/i, "Yum! I love props. The real app answers with an AI model, here I only have a few canned lines."],
];

const AGENT_REPLIES = {
  chat: `Ooh, nice one! This is demo mode, so my answers are canned, but my reactions are real. ${TRY}\n\nThe real app answers with a local AI model (see the README).`,
  troubleshoot:
    "Demo mode: in the real app I would check your laptop now with my MCP tools (for example checkWifiStatus and diagnoseWifi), tell you what they found, and open a ticket only if the problem is still there.\n\n" +
    "Here nothing is checked and no ticket is created. To see it for real, run the backend from the README, or watch the Troubleshoot clip.",
  interview:
    "Demo mode: in the real app I would search your folder, read your resume with a real file tool, save projects for you, and find and match real jobs (press Jobs above to see how applications work: you approve, then apply on the job site yourself).\n\n" +
    "Here is a taste of a mock interview instead. Question 1: what is the difference between a List and a Set in Java, and when would you use each?\n\n" +
    "(In the demo nothing scores your answer. The real agent does, one question at a time.)",
};

function demoAnswer(message, agent) {
  if (agent === "chat") {
    const match = CHAT_REPLIES.find(([pattern]) => pattern.test(message));
    if (match) return match[1];
  }
  return AGENT_REPLIES[agent] ?? AGENT_REPLIES.chat;
}

// ---- the Jobs screen in the demo: one made-up draft application that you can approve and "apply" to, kept in memory
const demoApplications = [{
  id: "APP-DEMO01", jobId: "sample:003", jobTitle: "Backend Engineer", company: "Tech Company", applyUrl: "https://example.com/job/003", source: "Sample",
  coverNote: "Dear Hiring Team at Tech Company,\n\nI am writing to apply for the Backend Engineer position. I have 6 years of experience and I currently work as Java Developer. My day-to-day work includes java, spring boot, sql, which this role asks for.\n\nThank you for your time. I would be glad to discuss how I can contribute.\n\nKind regards,\nAsha Rao",
  status: "DRAFT",
}];

/** Answers the Jobs screen's calls (see jobs.service.js) from memory. */
export async function demoJobsRequest(method, path) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (path === "/status") {
    return {
      enabled: true,
      available: true,
      sources: [
        { id: "sample", label: "Sample jobs (made up)", connected: true, howToConnect: "" },
        { id: "remotive", label: "Remotive", connected: false, howToConnect: "The real app searches Remotive and Arbeitnow without a key." },
        { id: "naukri", label: "Naukri (link only)", connected: false, howToConnect: "Naukri has no public API: Mark gives you a search link to open yourself." },
      ],
    };
  }
  if (path === "/applications") return demoApplications.map((a) => ({ ...a }));
  const match = path.match(/^\/applications\/([^/]+)\/(approve|applied)$/);
  const app = match && demoApplications.find((a) => a.id === decodeURIComponent(match[1]));
  if (!app) throw new Error("No such application.");
  if (match[2] === "approve") {
    if (app.status !== "DRAFT") throw new Error(`Application ${app.id} is ${app.status}, not a draft.`);
    app.status = "APPROVED";
  } else {
    if (app.status !== "APPROVED") throw new Error(`Application ${app.id} has to be approved first.`);
    app.status = "APPLIED";
  }
  return { ...app };
}

/** Streams a canned answer word by word, the way the backend streams the real one. Same contract as streamMessagesToServer. */
export async function streamDemoReply(message, agent, onChunk) {
  const answer = demoAnswer(message, agent);
  const words = answer.split(/(?<=\s)/);
  let full = "";
  await new Promise((resolve) => setTimeout(resolve, 500)); // "thinking"
  for (const word of words) {
    full += word;
    onChunk(full);
    await new Promise((resolve) => setTimeout(resolve, 28));
  }
  return full;
}
