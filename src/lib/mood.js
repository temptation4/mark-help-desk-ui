// How Mark reacts to what is said in the chat.
//
// This is deliberately simple pattern matching, not real sentiment analysis: it runs in the browser,
// costs nothing, and needs no extra model call. To tune his behaviour, edit the patterns below.
//
// Three questions are answered here:
//   reactToUser(text)    - what should he do right now, because the USER just said this?
//   detectMood(text)     - how does the assistant's REPLY read (happy, concerned, or neither)?
//   isTicketNews(text)   - does the reply report that a ticket was created or updated? (he celebrates)

// ------------------------------------------------------------------------------------------------
// What the user says
// ------------------------------------------------------------------------------------------------

// A negated "it's fixed / it works" is bad news, not good news ("still not working", "isn't fixed").
const NEGATED_GOOD_NEWS = /\b(still|not|isn'?t|aren'?t|never|no longer)\b.{0,15}\b(fixed|solved|resolved|working|work|works)\b/i;

// A request for Mark to DO something ("can you dance?", "ok spin", "jump for me"). The word only counts
// when it is not negated ("don't dance", "stop jumping"); "dancing" or "jumping" in a question like
// "why are you jumping?" are deliberately not matched, because that is not a request.
const action = (words) => new RegExp(`(?<!\\b(?:don'?t|do not|stop|not|never|no need to) )\\b(?:${words})\\b`, "i");

// Like action(), but for words that are also everyday tech talk ("run the build", "explain this error",
// "point to the file"). These only count when the user is clearly asking HIM: "can you run?", "please sit",
// "show me a shrug", or a very short command on its own ("sit down", "ok run").
const request = (words) => new RegExp(
  `\\b(?:can you|could you|would you|will you|please|pls|show me|let me see you|i want you to|you should|why don'?t you|try to|go and)\\s+(?:\\w+\\s+){0,2}?(?:${words})\\b` +
  `|^\\s*(?:ok(?:ay)?\\s*,?\\s*)?(?:${words})(?:\\s+(?:down|for me|now|again|please))?[\\s!.]*$`,
  "i"
);

// Praise aimed at Mark. Adjectives can follow "you are" or "you look" with an optional "so/very/...".
const PRAISE = "great|awesome|amazing|helpful|best|smart|clever|cool|nice|good|brilliant|cute|adorable|sweet|lovely|funny|fun|kind|wonderful|fantastic|handsome|pretty|beautiful|charming|lovable|fabulous|incredible|perfect|genius|hilarious|friendly|polite";
const COMPLIMENT = new RegExp(
  `\\b(?:you('| a)?re|you are|ur|you look|you seem)\\s+(?:(?:so+|really|very|super|too|such an?|the|pretty|quite|damn|extremely)\\s+)*(?:${PRAISE})\\b` +
  `|\\b(?:you|u) (?:are|r)\\s+(?:(?:so+|really|very|super)\\s+)*(?:${PRAISE})\\b` +
  `|\\b(?:cutie|cutie pie|sweetheart)\\b|\\b(?:so|too|very) (?:cute|adorable|sweet)\\b` +
  `|\\b(?:good|great|nice|excellent) (?:job|bot|work|robot)\\b|\\bwell done\\b|\\b(?:like|adore) (?:it|you|this|mark)\\b`,
  "i"
);

// Unkind words aimed at Mark: "you are bad", "shut up", "stupid bot", "I hate you". He looks hurt (not crying).
const INSULT_WORDS = "bad|stupid|dumb|useless|silly|worst|terrible|awful|rubbish|trash|ugly|annoying|boring|rude|mean|pathetic|horrible|worthless|lazy|slow|crazy|mad|naughty";
const INSULT = new RegExp(
  `\\b(?:you(?:'| a)?re|you are|ur|u r|u are)\\s+(?:(?:so+|really|very|too|such an?|a|just|totally)\\s+)*(?:${INSULT_WORDS})\\b` +
  `|\\b(?:shut ?up|stfu|you suck|i hate you|hate you|(?:bad|stupid|dumb|useless) (?:bot|robot)|you (?:idiot|moron|loser|fool|clown))\\b`,
  "i"
);

// Parties, shopping and food. Mark joins in with cake and balloons, shopping bags, or whatever you are eating.
const HEARTBREAK = /\b(break ?ups?|broke up|breaking up|broken up|divorces?|divorced|separation|(?:we|they|got|am|are|been) separated|heartbreak|heartbroken|my ex|ex-?(?:girlfriend|boyfriend|wife|husband)|cheated on me|dumped me)\b/i; // a broken heart
const WORKING = /\b(working (?:on|from|late|hard|today)|work(?:ing)? from home|wfh|at (?:the |my )?office|office|laptop|coding|programming|developers?|typing|emails?|reports?|spreadsheets?|excel)\b/i; // a desk with a laptop
const MEETING = /\b(meetings?|presentations?|stand-?up|client call|zoom|conference|agenda)\b/i; // a clipboard
const PROMOTION = /\b(promotion|promoted|salary hike|hike|bonus|new job|job offer|got the job|got hired)\b/i; // proud
const WEDDING = /\b(wedding|weddings|marriage|marry|married|marrying|shaadi|shadi|bride|bridal|groom|engaged|engagement|honeymoon|newlyweds?|just married)\b/i; // a bouquet and a crown
const BIRTHDAY = /\b(birthday|b'?day|bday|anniversary|cakes?|many happy returns)\b/i; // cake, candles and a present
const CONGRATS = /\bcongrat\w*\b/i; // a bouquet
const PARTY = /\b(celebrat\w*|balloons?|wish you)\b|(?<!third[ -])\bparty\b/i; // a cocktail, a cold drink, fireworks and balloons
const SHOPPING = /\b(shopping|shopped|mall|groceries|grocery|supermarket|shopping bags?|flipkart|myntra|walmart|big sale|on sale|discounts?|(?:let'?s|going to|gonna|want to|wanna) (?:buy|shop)|i (?:just )?bought)\b/i;
const FOOD_GESTURES = ["pizza", "burger", "icecream", "donut", "coffee", "fries", "noodles", "tteokbokki", "veggies", "fruits", "momos", "sweets", "chocolate", "chips", "tea"];
const pickFood = () => FOOD_GESTURES[Math.floor(Math.random() * FOOD_GESTURES.length)];

// Checked in this order; the first pattern that matches decides. `gesture` is what Mark plays (see
// RoamingRobot; it may be a function when he should pick one at random); `leave` makes him wave and
// then walk off, for a goodbye.
const USER_RULES = [
  { test: /\b(bye|goodbye|see you|see ya|good night|cya|talk (to you )?later|that'?s all)\b/i, gesture: "wave", leave: true },
  { test: /\b(go away|leave me alone|disappear|hide yourself)\b/i, gesture: "wave", leave: true },
  { test: INSULT, gesture: "hurt" },
  // asking him to perform
  { test: action("dance|boogie|groove|shake it"), gesture: "dance" },
  { test: action("spin|twirl|turn around|do a flip"), gesture: "spin" },
  { test: action("jump|hop|bounce"), gesture: "happy" },
  { test: action("wave|wave at me|say hello to me"), gesture: "wave" },
  { test: action("laugh|giggle|smile|cheer up"), gesture: "happy" },
  { test: action("be surprised|act surprised|scare me|boo"), gesture: "surprised" },
  { test: action("angry face|act angry|be angry|look angry|get angry"), gesture: "angry" },
  { test: request("cry|weep|sob"), gesture: "crying" },
  { test: request("clap|applaud"), gesture: "clapping" },
  { test: request("cheer|cheer for me"), gesture: "cheering" },
  { test: request("shrug"), gesture: "shrug" },
  { test: request("take a bow|bow down|bow"), gesture: "bow" },
  { test: request("run|jog|sprint|race"), gesture: "running" },
  { test: request("walk|stroll"), gesture: "walking" },
  { test: request("sit|sit down|take a seat"), gesture: "sit" },
  { test: request("stretch|exercise|workout"), gesture: "stretch" },
  { test: request("hide"), gesture: "hide" },
  { test: request("peek|peekaboo"), gesture: "peek" },
  { test: request("point|point at me"), gesture: "point" },
  { test: request("do magic|magic|do a trick|abracadabra"), gesture: "magic" },
  { test: request("talk|speak|say something|explain|tell me about yourself"), gesture: "explain" },
  { test: /\b(thanks|thank you|thank u|thx|cheers|appreciate (it|that|your help))\b/i, gesture: "thanks" }, // the polite Korean bow, with 감사합니다
  // love: "i love you", hearts, kisses (before the compliments, which would only make him giggle)
  { test: /\b(?:i )?love you\b|\bmy love\b|\bxoxo\b|\bkiss(?:es)?\b|❤|♥|😍|🥰|😘/i, gesture: "love" },
  // compliments: "you are so cute", "you look lovely", "cutie", "good job"
  { test: COMPLIMENT, gesture: "delighted" },
  { test: /^(?:\W|\w+\W+){0,4}?(?:cute+|cutest|cutie|adorable|aw+w*)\b(?:\W+\w+){0,3}\W*$/i, gesture: "delighted" }, // short and cute: "cute", "cute robo", "awww cute"
  { test: /\b(bravo|applause|well played|good game|gg)\b/i, gesture: "clapping" },
  { test: /\b(hooray|hurray|yay+|woo+hoo+|yippee|victory|we won|i won|winner|champion)\b/i, gesture: "cheering" },
  { test: /\b(proud|nailed it|i did it|we did it)\b/i, gesture: "proud" },
  { test: /\b(excited|exciting|can'?t wait|cannot wait|so happy|wow+|amazing news|awesome news)\b/i, gesture: "excited" },
  // a real problem beats the fun topics below: "my pizza app is not working" is a problem first
  { test: /\b(not working|doesn'?t work|won'?t (start|work|turn on|open|load)|broken|error|crash\w*|failed|failure|bug)\b/i, gesture: "sad" },
  { test: WEDDING, gesture: "wedding" },
  { test: HEARTBREAK, gesture: "heartbreak" },
  { test: PROMOTION, gesture: "proud" },
  { test: MEETING, gesture: "meeting" },
  { test: WORKING, gesture: "working" },
  { test: BIRTHDAY, gesture: "birthday" },
  { test: CONGRATS, gesture: "congrats" },
  { test: PARTY, gesture: "party" },
  { test: SHOPPING, gesture: "shopping" },
  { test: /\b(momos?|dumplings?|dim ?sum|gyoza|wontons?|pierogi)\b/i, gesture: "momos" },
  // (no "apple" or "cherry" alone: "my Apple laptop" and "Cherry keyboard" are help desk talk, not fruit)
  { test: /\b(fruits?|apples|bananas?|oranges?|mango(?:es)?|grapes?|strawberr(?:y|ies)|berries|watermelon|pineapple|papaya|kiwi|peach(?:es)?)\b|\b(?:an|red|green|eat(?:ing)?) apple\b/i, gesture: "fruits" },
  { test: /\b(veg|veggies?|veggy|vegetables?|salad|carrots?|broccoli|tomato(?:es)?|cucumbers?|corn|spinach|cabbage|lettuce|onions?|capsicum|greens|healthy food)\b/i, gesture: "veggies" },
  { test: /\b(chocolates?|choco|cocoa|kitkat|snickers|dairy milk)\b/i, gesture: "chocolate" },
  { test: /\b(sweets|sweet tooth|sweet treats?|candy|candies|lollipops?|toffee|gummies|gummy|jelly beans?|laddoo|mithai|gulab jamun)\b/i, gesture: "sweets" },
  // (plain "chips" is also hardware talk, so it needs a food word next to it)
  { test: /\b(potato chips|crisps|lays|doritos|pringles|snacks?|(?:eat(?:ing)?|want|some|bag of|packet of|have) chips)\b/i, gesture: "chips" },
  { test: /\b(tea|chai|matcha|kadha|green tea|herbal tea)\b/i, gesture: "tea" },
  { test: /\b(movies?|films?|cinema|netflix|popcorn|binge[- ]?watch\w*|web ?series|tv show|theat(?:er|re))\b/i, gesture: "popcorn" }, // movie night
  { test: /\b(pizzas?|pepperoni|margherita)\b/i, gesture: "pizza" },
  { test: /\b(burgers?|hamburgers?|cheeseburgers?|sandwich(?:es)?)\b/i, gesture: "burger" },
  { test: /\b(ice[- ]?creams?|gelato|kulfi|sundae|popsicle)\b/i, gesture: "icecream" },
  { test: /\b(donuts?|doughnuts?|dessert|brownies?|cupcakes?|muffins?)\b/i, gesture: "donut" },
  { test: /\b(coffee|coffe+|cofee|capp?uc+ino|latte|cappuccino|espresso|mocha|juice|smoothie|milkshake|soda|cola|drinks?)\b/i, gesture: "coffee" },
  { test: /\b(french fries|fries|nuggets|samosas?|tacos?|nachos?)\b/i, gesture: "fries" },
  { test: /\b(tteokbokki|topokki|tteok)\b/i, gesture: "tteokbokki" },
  { test: /\b(noodles?|pasta|ramen|ramyeon|ramyun|kimchi|bibimbap|korean|jjajangmyeon|bulgogi|kimbap|udon|pho|spaghetti|maggi|rice|biryani|soup|curry|dosa|idli|thali|dal)\b/i, gesture: "noodles" },
  { test: /\b(food|hungry|starving|lunch|dinner|breakfast|brunch|eat(?:ing)?|meal|yummy|delicious|tasty|cook(?:ing)?)\b/i, gesture: pickFood },
  { test: /\b(ghost|monster|snake|spider|spooky|horror|nightmare)\b/i, gesture: "scared" },
  { test: /\b(confus\w*|puzzled|no idea|(?:don'?t|do not) (?:understand|get it)|what do you mean|huh)\b/i, gesture: "confused" },
  { test: /\b(sleepy|yawn\w*|go to sleep|sleeping|nap|bored|boring|z{3,})\b/i, gesture: "sleepy" },
  { test: /\b(curious|i wonder|interesting|tell me more)\b/i, gesture: "curious" },
  { test: /^\s*(?:ok(?:ay)?|k|sure|fine|alright|sounds good|perfect|agreed|i agree|good idea|thumbs up)[\s!.]*$/i, gesture: "thumbs_up" },
  { test: /^\s*(?:no|nope|nah|no way)[\s!.]*$/i, gesture: "shake_head" },
  { test: /\b(lol|lmao|rofl|ha(ha)+|he(he)+)\b|😂|🤣|😄|😁/i, gesture: "happy" },
  { test: NEGATED_GOOD_NEWS, gesture: "sad" },
  { test: /\b(fixed|solved|resolved|works now|working now|working again|it works|all good|all sorted|sorted out|problem gone)\b|🎉/i, gesture: "happy" },
  { test: /\b(urgent|asap|emergency|frustrat\w*|angry|furious|annoy\w*|irritat\w*|terrible|awful|worst|hate|useless|stuck|can'?t|cannot|unable|lost my|losing my|deadline|help me|please help)\b|😡|😤|😢|😭|😞/i, gesture: "sad" },
  // the user is not well or sad: he shows he cares ("i am feeling bad")
  { test: /\b(feel(ing)? (bad|sick|unwell|down|sad|low|awful|terrible|lonely|depressed|tired|stressed)|not (feeling )?(well|good|great|okay|ok)|unwell|depress\w*|lonely|heartbroken|stressed|scared|afraid|frightened|worried|anxious|nervous)\b/i, gesture: "sad" },
  { test: /\b(namaste|namastey|namaskar|namaskaram|pranam|ram ram|radhe radhe|vanakkam|sat sri akal)\b|🙏/i, gesture: "namaste" }, // palms together, with नमस्ते on the visor
  { test: /^\s*(hi|hello|hey|hii+|hola|yo|good (morning|afternoon|evening))\b/i, gesture: "wave" }, // after the problem rules: "Hi, my printer is broken" is a problem first,
];

/**
 * What should Mark do because the user just said (or is typing) this?
 * @returns {{gesture: string, leave?: boolean} | null}  null = nothing in particular
 */
export function reactToUser(text) {
  if (!text) return null;

  for (const rule of USER_RULES) {
    if (rule.test.test(text)) {
      const gesture = typeof rule.gesture === "function" ? rule.gesture() : rule.gesture;
      return { gesture, leave: !!rule.leave };
    }
  }
  // a question: he nods, "got it, let me think"
  if (/\?\s*$/.test(text.trim())) return { gesture: "nod", leave: false };
  return null;
}


// Calling Mark back after he was dragged away: "come robo", "robo where r u", "where are you mark", "hey robot".
const CALLS_MARK = [
  /\b(?:come|appear|show up|return|wake up)\b[^.!?\n]{0,15}\b(?:robo+|robot|mark)\b/i,
  /\b(?:robo+|robot|mark)\b[^.!?\n]{0,15}\b(?:where|come|appear|show|wake|hello|hi|hey|are you|r u)\b/i,
  /\b(?:hey|hi|hello)\s+(?:robo+|robot|mark)\b/i,
  /\bwhere\s+(?:are|r)\s+(?:you|u)\b/i,
];

/** True if the user is calling Mark ("come robo", "robo where are you"). The chat uses it to bring him back after he was sent away. */
export function callsMark(text) {
  return !!text && CALLS_MARK.some((pattern) => pattern.test(text));
}

// ------------------------------------------------------------------------------------------------
// What the assistant replies
// ------------------------------------------------------------------------------------------------

// [pattern, points]. Ticket news and thanks are strong "good news" signals.
const HAPPY = [
  [/\bticket\b[^.\n]{0,25}\b(created|updated|resolved|closed|logged|opened)/i, 3],
  [/\b(created|updated|resolved|closed|fixed|solved|logged)\b[^.\n]{0,30}\bticket/i, 3],
  [/\b(thank you|thanks|thankful|appreciate)\b/i, 2],
  [/\b(great|glad|happy to|wonderful|perfect|awesome|excellent|congrat\w*|welcome)\b/i, 2],
  [/\b(resolved|fixed|solved|working now|all set|good news)\b/i, 2],
  [/\b(hello|hi there|hey)\b/i, 1],
  [/!/, 1],
];

const SAD = [
  [/\b(sorry|apolog\w*|unfortunately|regret)\b/i, 3],
  [/\b(frustrat\w*|annoy\w*|upset|disappoint\w*|stressful)\b/i, 3],
  [/\b(not working|broken|doesn't work|doesn't turn on|won't|can't|cannot|couldn't|unable)\b/i, 2],
  [/\b(error|failed|failure|crash\w*|stuck|trouble|problem|issue|jammed|flicker\w*|slow)\b/i, 1],
  [/\b(urgent|emergency)\b/i, 1],
];

function score(text, rules) {
  return rules.reduce((total, [pattern, points]) => total + (pattern.test(text) ? points : 0), 0);
}

/** @returns {"happy" | "sad" | "neutral"} - "sad" means concerned for the user, not crying. */
export function detectMood(text) {
  if (!text) return "neutral";

  const happy = score(text, HAPPY);
  const sad = score(text, SAD);

  // Require a clear signal so ordinary replies stay neutral instead of flickering between faces.
  if (happy >= 2 && happy > sad) return "happy";
  if (sad >= 2 && sad >= happy) return "sad";
  return "neutral";
}

// Text the backend (AIService.java) adds when the model's answer could not be trusted. If the model
// invents a ticket number, the server notices, prints the correction and asks again, so the reply holds
// the made-up attempt(s) followed by the final one. Keep these in step with AIService.
const CORRECTION_MARKER = "One correction";
const GAVE_UP_MARKER = "Sorry, I had trouble processing that";

/**
 * True if the reply reports that a ticket was created, logged or updated: time to celebrate.
 *
 * Only the FINAL attempt counts. A fabricated ticket earlier in the same reply must not make him
 * celebrate, and neither must a reply where the server gave up after the model kept inventing numbers.
 */
export function isTicketNews(text) {
  if (!text || text.includes(GAVE_UP_MARKER)) return false;

  const finalAttempt = text.split(CORRECTION_MARKER).pop();
  return /\bticket\b[^.\n]{0,30}#\s*\d+/i.test(finalAttempt)
    && /\b(created|logged|opened|raised|updated|resolved|closed)\b/i.test(finalAttempt);
}

// ------------------------------------------------------------------------------------------------
// Cleaning the assistant's text
// ------------------------------------------------------------------------------------------------

/**
 * Removes roleplay "stage directions" such as *beams with a happy robot face* from a bot reply.
 * Small models write these even when told not to; Mark acts them out with his body instead.
 * Removed: any *action* of two or more words, and a one-word *action* that starts the reply or a
 * sentence ("*waves* Hi!"). One-word *emphasis* in the middle of a sentence keeps its word but loses the
 * asterisks, since the chat shows plain text. **bold** and "* bullet" lists are left alone.
 * A direction still being streamed (no closing asterisk yet) is hidden too.
 */
export function stripStageDirections(text) {
  if (!text) return text;

  // Code blocks (between ``` fences) are left exactly as they are: "a * b * c" or a /* comment */ is not an action.
  const cleaned = text
    .split(/(```[\s\S]*?(?:```|$))/)
    .map((part, i) => (i % 2 === 1 ? part : stripActions(part)))
    .join("")
    .trim();

  return cleaned || "🙂"; // the reply was only an action: still show something
}

function stripActions(text) {
  return text
    .replace(/(?<!\*)\*(?![*\s])[^*\n]*\s[^*\n]*\*(?!\*)/g, "")      // *two or more words*
    .replace(/(^|[.!?\n]\s*)\*[^*\s]+\*(?!\*)/g, "$1")               // "*waves* Hi" - one word starting a sentence
    .replace(/(?<![*\w])\*([^*\s]+)\*(?![*\w])/g, "$1")               // mid-sentence *emphasis*: drop the asterisks
    .replace(/(?<!\*)\*(?![*\s])[^*\n]+$/, "")                        // unfinished: "*beams with a hap"
    .replace(/[ \t]{2,}/g, " ");
}
