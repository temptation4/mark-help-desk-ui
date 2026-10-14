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
  [/\b(beach(?:es)?|seaside|ocean|island|goa|maldives|bali)\b/i, "Beach time! 🏖️ I brought an umbrella and a beach ball. The real app answers with an AI model; here I only have a few canned lines."],
  [/\b(mountains?|hiking|trek\w*|himalaya\w*|snow|camping|manali)\b/i, "Mountains! 🏔️ Look at those snowy peaks. The real app answers with an AI model; here I only have a few canned lines."],
  [/\b(travel\w*|trips?|vacations?|holidays?|flights?|fly(?:ing)?|airports?|airlines?|planes?|passports?|visas?|luggage|baggage|suitcases?|trolley|packing|tour|tourists?|sightseeing|journey|hotels?|resorts?|cruises?|abroad|overseas|getaway)\b/i, "Let's go on a trip! ✈️ My trolley bag is packed. The real app answers with an AI model; here I only have a few canned lines."],
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
    "Demo mode: in the real app I would search your folder, read your resume with a real file tool, save projects for you, and build Naukri and LinkedIn job search links (press Job links above).\n\n" +
    "Here is a taste of a mock interview instead. Question 1: what is the difference between a List and a Set in Java, and when would you use each?\n\n" +
    "(In the demo nothing scores your answer. The real agent does, one question at a time.)",
};

function demoAnswer(message, agent) {
  if (agent === "chat") {
    const match = CHAT_REPLIES.find(([pattern]) => pattern.test(message));
    if (match) return match[1];
  }
  if (agent === "interview" && /\b(match|jev)\b/i.test(message)) {
    return "Demo mode: in the real app I would read your uploaded resume and job description and ask Jev, a hosted decision API, to score the match. " +
      "For example: Jev match 87% (java_backend). I would quote that score exactly, then explain your strengths and gaps myself. Here nothing is scored.";
  }
  if (agent === "interview" && /\b(job links?|naukri|linkedin)\b/i.test(message)) {
    return "Demo mode: in the real app I would ask for your role and city, then give you the matching search pages. For example, for a Java developer:\n\n" +
      "Naukri: https://www.naukri.com/java-developer-jobs\nLinkedIn: https://www.linkedin.com/jobs/search/?keywords=Java+developer\n\n" +
      "You open a link, sign in on that site and apply there yourself: I cannot apply for you.";
  }
  return AGENT_REPLIES[agent] ?? AGENT_REPLIES.chat;
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
