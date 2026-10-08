import React from "react";
import { Volume2 } from "lucide-react";
import { Button } from "./ui/button";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce" />
    </span>
  );
}

// The steps of the agentic helpdesk arrive as lines that start with one of these emojis (goal, Jev, act, observe, blocked).
const STEP = /^(🎯|⚖️|🔧|👀|⛔) /;

// **bold** and `code` inside a step line
function StepLine({ line }) {
  return line.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i} className="rounded bg-background/70 px-1">{part.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// Text with code blocks: the parts between ``` fences are shown as code, the rest as normal text. A block that is
// still being typed (no closing fence yet) already shows as code.
function MessageText({ text }) {
  // the agent's steps at the start of the reply are shown as a small trace, the rest is the reply
  const lines = text.split("\n");
  let steps = 0;
  while (steps < lines.length && STEP.test(lines[steps])) steps++;
  if (steps > 0) {
    return (
      <>
        <div className="mb-2 flex flex-col gap-0.5 rounded-lg border bg-background/60 px-2 py-1.5 text-xs text-muted-foreground" aria-label="What the agent did">
          {lines.slice(0, steps).map((line, i) => <div key={i} className="break-words"><StepLine line={line} /></div>)}
        </div>
        <MessageText text={lines.slice(steps).join("\n").replace(/^\n+/, "")} />
      </>
    );
  }
  return text.split(/(```[\s\S]*?(?:```|$))/).map((part, i) => {
    if (i % 2 === 0) {
      return part ? <span key={i} className="whitespace-pre-wrap break-words">{part}</span> : null;
    }
    const code = part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "").replace(/\n$/, "");
    return (
      <pre key={i} className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-snug text-slate-100">
        <code>{code}</code>
      </pre>
    );
  });
}

function MessageBubble({ author, at, children, onPlayAudio, isSpeaking }) {
  const isMe = author;
  // The bot bubble is inserted empty and filled in as the stream arrives -
  // while it's still empty, show a typing indicator instead of a blank bubble
  // with just a timestamp floating in it.
  const isWaitingForContent = !children;

  return (
    <div
      className={`flex  ${isMe == "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${
          isMe == "user"
            ? "bg-slate-900 text-white"
            : "bg-muted text-foreground"
        } `}
      >
        <div className="break-words leading-relaxed">
          {isWaitingForContent ? <TypingDots /> : typeof children === "string" ? <MessageText text={children} /> : children}
        </div>
        {!isWaitingForContent && (
          <div
            className={`mt-1 flex items-center gap-2 text-[10px] ${
              isMe == "user" ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            <span>{at}</span>
            {isMe !== "user" && onPlayAudio && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onPlayAudio}
                disabled={isSpeaking}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Play as speech"
              >
                <Volume2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
